"""Clerk session verification for FastAPI routes.

Add `user_id: CurrentUser` to any route that needs a signed-in user.
"""

import os
from typing import Annotated

from clerk_backend_api import AuthenticateRequestOptions, authenticate_request
from fastapi import Depends, HTTPException, Request, status


def _authorized_parties() -> list[str] | None:
    # Web origins allowed to create tokens (e.g. http://localhost:8081). Native apps don't need one.
    parties = [p.strip() for p in os.environ.get("CLERK_AUTHORIZED_PARTIES", "").split(",") if p.strip()]
    return parties or None


def require_user(request: Request) -> str:
    state = authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=os.environ["CLERK_SECRET_KEY"],
            authorized_parties=_authorized_parties(),
        ),
    )
    if not state.is_signed_in or not state.payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    return state.payload["sub"]  # Clerk user ID, e.g. "user_2abc..."


CurrentUser = Annotated[str, Depends(require_user)]
