# Schedoro backend

A small [FastAPI](https://fastapi.tiangolo.com/) server for the Schedoro app. Users sign in with [Clerk](https://clerk.com/) in the app. The backend checks their Clerk token on protected routes.

## Files

| File | What it does |
| --- | --- |
| `main.py` | Creates the app, connects to MongoDB on startup, registers the routes. |
| `auth.py` | Checks Clerk tokens. Gives routes the signed-in user's ID. |
| `db.py` | MongoDB Atlas connection - gives routes the database. |
| `models.py` | Request/response shapes (Team, Job, Member, Location, AvailabilityWindow). |
| `teams.py` | Team routes -> `TeamService` -> `TeamRepository` (the `teams` collection). |
| `jobs.py` | Job routes → `JobService` -> `JobRepository` (the `jobs` collection). |
| `members.py` | Team member routes -> `MemberService` -> `MemberRepository` (the `members` collection). |
| `requirements.txt` | Python dependencies. |
| `.env.example` | Template for `.env`, which holds the backend's secrets. |

## Run it

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env          # then fill in CLERK_SECRET_KEY
.venv/bin/uvicorn main:app --reload --host 0.0.0.0
```

The server runs at http://localhost:8000. Interactive API docs are at http://localhost:8000/docs.

On Windows, use `.venv\Scripts\` instead of `.venv/bin/`.

**Testing on a real phone?** Start the server with `--host 0.0.0.0`. Then set `EXPO_PUBLIC_API_URL=http://<your-computer's-IP>:8000` in `frontend/.env`. To find the IP on macOS, run `ipconfig getifaddr en0`.

## Environment variables (`.env`)

| Variable | Required | What it's for |
| --- | --- | --- |
| `CLERK_SECRET_KEY` | Yes | Lets the backend check Clerk tokens. Find it under Clerk Dashboard → API keys. |
| `CLERK_AUTHORIZED_PARTIES` | No | Comma-separated web origins allowed to call the API, e.g. `http://localhost:8081`. Only needed for the Expo web build. Also used for CORS. |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB` | No | MongoDB Database name. Defaults to `schedoro`. |

On Render, add the variables under Environment.
In MongoDb Atlas -> Network Access, allow `0.0.0.0/0` because Render's outbound IPs change

Never commit `.env`; it's already in `.gitignore`.

## Routes

| Method | Path | Sign-in needed | Returns |
| --- | --- | --- | --- |
| GET | `/` | No | `hello from schedoro backend` |
| GET | `/health` | No | `{"status": "ok", "database": "ok"}` if MongoDB is reachable |
| GET | `/me` | Yes | `{"user_id": "user_..."}`, the caller's Clerk user ID |
| GET | `/teams` | Yes | Teams the caller is a member of, with their role on each |
| POST | `/teams` | Yes | The created team (201). The caller is added as its owner |
| GET | `/teams/{team_id}` | Yes | One team, or 404 if it doesn't exist or the caller isn't on it |
| PUT | `/teams/{team_id}` | Yes | The renamed team. Owners and managers only (403 otherwise) |
| DELETE | `/teams/{team_id}` | Yes | 204. Deletes the team's jobs and members too. Owner only |
| GET | `/teams/{team_id}/jobs` | Yes | The team's jobs, newest first |
| POST | `/teams/{team_id}/jobs` | Yes | The created job (201) |
| GET | `/teams/{team_id}/jobs/{job_id}` | Yes | One job or 404 |
| PUT | `/teams/{team_id}/jobs/{job_id}` | Yes | The updated job or 404 |
| DELETE | `/teams/{team_id}/jobs/{job_id}` | Yes | 204 or 404 |
| GET | `/teams/{team_id}/members` | Yes | The team's members, in the order they were added |
| POST | `/teams/{team_id}/members` | Yes | The added member (201), or 409 if that email is already on the team |
| GET | `/teams/{team_id}/members/{member_id}` | Yes | One member or 404 |
| PUT | `/teams/{team_id}/members/{member_id}` | Yes | The updated member, 404, or 409 |
| DELETE | `/teams/{team_id}/members/{member_id}` | Yes | 204 or 404 |

Example job body:

```json
{
  "name": "Example House Cleaning",
  "description": "Weekly clean",
  "location": { "address": "99 Oak Rd., Oakville, ON" },
  "estimatedDurationMinutes": 180,
  "requiredSkills": ["Regular cleaning"],
  "availability": [{ "dayOfWeek": "Monday", "startTime": "08:00", "endTime": "17:00" }]
}
```

Example member body:

```json
{
  "fullName": "Joe Smith",
  "email": "joe.smith@example.com",
  "role": "worker",
  "location": { "address": "99 Oak Rd., Oakville, ON" },
  "skills": ["Regular cleaning"],
  "availability": [{ "dayOfWeek": "Monday", "startTime": "09:00", "endTime": "17:00" }],
  "maxWeeklyHours": 40
}
```

Only `email` is required. Adding a member doesn't send an invite email yet; `userId` stays `null` until that's built.

A team body is just `{ "name": "The House Fairy" }`. When someone creates a team, the backend gets their name and email from Clerk and adds them to `members` as the owner, with their Clerk `userId`. A user's teams are the teams where they have a member record with their `userId`.

A protected route returns `401 Not signed in` if the token is missing or invalid.

## Invites, joining and permissions

- **Inviting:** adding a member (`POST /teams/{team_id}/members`) saves them with `userId: null` and has Clerk email them an invite to sign up. It expires after 7 days. If the email can't be sent, the member isn't saved and the request returns 502.
- **Joining:** when someone signs in and the app loads `GET /teams`, every member record matching one of their **verified** Clerk emails gets their `userId`. That's what puts them on the team. It works for new and existing Clerk accounts, and an empty `fullName` is filled in from their account.
- **Roles** (owner, manager, worker) are stored on the member record in MongoDB, not in Clerk. The invite email doesn't know about them.
- **Permissions:** anyone on a team can read its jobs and members. Only owners and managers can add, edit or remove them. Only an owner can add, change or remove owners, and a team always keeps at least one owner. Someone who isn't on the team gets 404.
- Removing a member who hasn't joined yet revokes their Clerk invite. A member's email can't be changed; remove them and invite the new address instead.
- Clerk development instances send at most 100 emails per calendar month, and sign-in codes count too. To test without using them up, invite addresses like `jane+clerk_test@example.com`: Clerk doesn't email those, and they sign in with the code `424242`.

## How auth works

1. The app signs the user in with Clerk.
2. The app calls the backend through `useApi()` in [`frontend/src/lib/api.ts`](../frontend/src/lib/api.ts). It adds the header `Authorization: Bearer <Clerk session token>`.
3. `auth.py` checks the token with `CLERK_SECRET_KEY` and gives the route the user's Clerk ID.

## Add a protected route

Add a `user_id: CurrentUser` parameter, and FastAPI runs the auth check before the route:

```python
from auth import CurrentUser

@app.get("/example")
def example(user_id: CurrentUser):
    ...
```

From the app:

```ts
const api = useApi();
const res = await api('/example');
```
