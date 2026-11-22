"""Clerk session verification for FastAPI routes.

Add `user_id: CurrentUser` to any route that needs a signed-in user.
Use `clerk_profile(user_id)` to get their name and emails from Clerk, and
`send_invite` / `revoke_invite` for team invite emails.
"""

import logging
import os
from dataclasses import dataclass
from typing import Annotated

from clerk_backend_api import AuthenticateRequestOptions, Clerk, authenticate_request
from fastapi import Depends, HTTPException, Request, status

logger = logging.getLogger("uvicorn.error")


def _authorized_parties() -> list[str] | None:
    # Web origins allowed to create tokens (e.g. http://localhost:8081). Native apps don't send one.
    parties = [p.strip() for p in os.environ.get("CLERK_AUTHORIZED_PARTIES", "").split(",") if p.strip()]
    return parties or None


def require_user(request: Request) -> str:
    # don't pass authorized_parties to Clerk, it rejects every token without an azp claim
    # and native app tokens don't have one. web tokens do, so those get checked below
    state = authenticate_request(request, AuthenticateRequestOptions(secret_key=os.environ["CLERK_SECRET_KEY"]))
    if not state.is_signed_in or not state.payload:
        logger.warning("clerk rejected the token: %s", state.message)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")

    azp = state.payload.get("azp")
    parties = _authorized_parties()
    if azp and parties and azp not in parties:
        logger.warning("token from %s isn't in CLERK_AUTHORIZED_PARTIES", azp)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    return state.payload["sub"]  # Clerk user ID, e.g. "user_2abc..."


CurrentUser = Annotated[str, Depends(require_user)]


@dataclass
class ClerkProfile:
    name: str
    email: str | None  # primary email
    verified_emails: list[str]  # only these are trusted for matching invites


def _is_verified(email) -> bool:
    status = getattr(email.verification, "status", None)
    return getattr(status, "value", status) == "verified"


async def clerk_profile(user_id: str) -> ClerkProfile:
    """The user's name and emails, straight from Clerk so the app can't fake them."""
    try:
        async with Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"]) as clerk:
            user = await clerk.users.get_async(user_id=user_id)
    except Exception:
        logger.exception("couldn't load clerk user %s", user_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't load your account from Clerk. Try again.")
    unverified = [e.email_address for e in user.email_addresses if not _is_verified(e)]
    if unverified:
        logger.info("clerk user %s has unverified emails %s (verification: %s)", user_id, unverified,
                    [type(e.verification).__name__ for e in user.email_addresses])
    return ClerkProfile(
        name=" ".join(part for part in (user.first_name, user.last_name) if part),
        email=next((e.email_address for e in user.email_addresses if e.id == user.primary_email_address_id), None),
        verified_emails=[e.email_address.lower() for e in user.email_addresses if _is_verified(e)],
    )


async def send_invite(email: str) -> str:
    """Has Clerk email an invite to sign up. Returns the invitation ID."""
    try:
        async with Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"]) as clerk:
            invitation = await clerk.invitations.create_async(request={
                "email_address": email,
                # they might already have an account or a pending invite from another team.
                # either way they get linked by email the next time they sign in
                "ignore_existing": True,
                "expires_in_days": 7,  # matches "The user has 1 week to join" in the invite dialog
            })
    except Exception:
        logger.exception("couldn't send clerk invite to %s", email)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't send the invite email. Try again.")
    return invitation.id


async def revoke_invite(invitation_id: str) -> None:
    try:
        async with Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"]) as clerk:
            await clerk.invitations.revoke_async(invitation_id=invitation_id)
    except Exception:
        # not worth failing the request over, the invite expires on its own after a week
        logger.warning("couldn't revoke clerk invite %s", invitation_id, exc_info=True)
