"""Clerk session verification for FastAPI routes.

Add `user_id: CurrentUser` to any route that needs a signed-in user.
Use `clerk_profile(user_id)` to get their name and email from Clerk.
"""

import logging
import os
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


async def clerk_profile(user_id: str) -> tuple[str, str | None]:
    """The user's full name and primary email, straight from Clerk so the app can't fake them."""
    try:
        async with Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"]) as clerk:
            user = await clerk.users.get_async(user_id=user_id)
    except Exception:
        logger.exception("couldn't load clerk user %s", user_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't load your account from Clerk. Try again.")
    name = " ".join(part for part in (user.first_name, user.last_name) if part)
    email = next((e.email_address for e in user.email_addresses if e.id == user.primary_email_address_id), None)
    return name, email
