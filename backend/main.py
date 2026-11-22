import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

load_dotenv()

from auth import CurrentUser  # noqa: E402
from db import client, db  # noqa: E402
from jobs import router as jobs_router  # noqa: E402
from appointments import router as appointments_router  # noqa: E402
from analytics import router as analytics_router  # noqa: E402

@asynccontextmanager
async def lifespan(app: FastAPI):
    await client.admin.command("ping")  # fail fast if MONGODB_URI is wrong
    await db["jobs"].create_index("teamId")
    await db["appointments"].create_index([("teamId", 1), ("start", 1)])
    
    yield
    await client.close()


app = FastAPI(lifespan=lifespan)

# only Expo web build needs CORS, native apps ignore this
web_origins = [o.strip() for o in os.environ.get("CLERK_AUTHORIZED_PARTIES", "").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=web_origins, allow_methods=["*"], allow_headers=["*"])

app.include_router(jobs_router)
app.include_router(appointments_router)
app.include_router(analytics_router)


@app.get("/", response_class=PlainTextResponse)
def root() -> str:
    return "hello from schedoro backend"


@app.get("/health")
async def health() -> dict[str, str]:
    await client.admin.command("ping")
    return {"status": "ok", "database": "ok"}


@app.get("/me")
def me(user_id: CurrentUser) -> dict[str, str]:
    """Example protected route: returns the signed-in user's Clerk ID."""
    return {"user_id": user_id}
