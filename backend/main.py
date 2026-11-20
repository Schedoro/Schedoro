from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse

load_dotenv()

from auth import CurrentUser  # noqa: E402  (needs the .env values loaded first)

app = FastAPI()


@app.get("/", response_class=PlainTextResponse)
def root() -> str:
    return "hello from schedoro backend"


@app.get("/me")
def me(user_id: CurrentUser) -> dict[str, str]:
    """Example protected route: returns the signed-in user's Clerk ID."""
    return {"user_id": user_id}
