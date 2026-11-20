# Schedoro backend

A small [FastAPI](https://fastapi.tiangolo.com/) server for the Schedoro app. Users sign in with [Clerk](https://clerk.com/) in the app. The backend checks their Clerk token on protected routes.

## Files

| File | What it does |
| --- | --- |
| `main.py` | Creates the app and defines the routes. |
| `auth.py` | Checks Clerk tokens. Gives routes the signed-in user's ID. |
| `requirements.txt` | Python dependencies. |
| `.env.example` | Template for `.env`, which holds the backend's secrets. |

## Run it

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env          # then fill in CLERK_SECRET_KEY
.venv/bin/uvicorn main:app --reload
```

The server runs at http://localhost:8000. Interactive API docs are at http://localhost:8000/docs.

On Windows, use `.venv\Scripts\` instead of `.venv/bin/`.

**Testing on a real phone?** Start the server with `--host 0.0.0.0`. Then set `EXPO_PUBLIC_API_URL=http://<your-computer's-IP>:8000` in `frontend/.env`. To find the IP on macOS, run `ipconfig getifaddr en0`.

## Environment variables (`.env`)

| Variable | Required | What it's for |
| --- | --- | --- |
| `CLERK_SECRET_KEY` | Yes | Lets the backend check Clerk tokens. Find it under Clerk Dashboard → API keys. |
| `CLERK_AUTHORIZED_PARTIES` | No | Comma-separated web origins allowed to call the API, e.g. `http://localhost:8081`. Only needed for the Expo web build. |

Never commit `.env`; it's already in `.gitignore`.

## Routes

| Method | Path | Sign-in needed | Returns |
| --- | --- | --- | --- |
| GET | `/` | No | `hello from schedoro backend` |
| GET | `/me` | Yes | `{"user_id": "user_..."}`, the caller's Clerk user ID |

A protected route returns `401 Not signed in` if the token is missing or invalid.

## How auth works

1. The app signs the user in with Clerk.
2. The app calls the backend through `useApi()` in [`frontend/src/lib/api.ts`](../frontend/src/lib/api.ts). It adds the header `Authorization: Bearer <Clerk session token>`.
3. `auth.py` checks the token with `CLERK_SECRET_KEY` and gives the route the user's Clerk ID.

## Add a protected route

Add a `user_id: CurrentUser` parameter, and FastAPI runs the auth check before the route:

```python
from auth import CurrentUser

@app.get("/teams")
def list_teams(user_id: CurrentUser):
    ...
```

From the app:

```ts
const api = useApi();
const res = await api('/teams');
```
