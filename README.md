# Schedoro

- `frontend/`: Expo mobile app. See [frontend/README.md](frontend/README.md).
- `backend/`: FastAPI backend.

## Frontend

```bash
cd frontend
npm ci
npx expo start
```

## Backend

```bash
cd backend
python -m venv .venv
```

On Windows:

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn main:app --reload
```

On macOS/Linux, use `.venv/bin/python` instead.

Open http://localhost:8000 for `hello from schedoro backend`.

### Run the backend simply
Enter directory: `cd backend` 
Build command: `pip install -r requirements.txt`
Start command: `uvicorn main:app`