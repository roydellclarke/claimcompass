"""ClaimCompass - Car Accident Claim Navigation System"""

import os
import json
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List
from dotenv import load_dotenv
import bcrypt
import jwt
import redis
import uvicorn

load_dotenv()

app = FastAPI(title="ClaimCompass API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis for session storage
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

# =============================================================================
# DATA MODELS
# =============================================================================

# =============================================================================
# AUTH CONFIG
# =============================================================================

# JWT secret. In production set CC_JWT_SECRET; the random fallback exists so
# dev works out of the box but invalidates tokens on every restart.
JWT_SECRET = os.getenv("CC_JWT_SECRET") or secrets.token_urlsafe(48)
JWT_ALG = "HS256"
JWT_TTL_HOURS = int(os.getenv("CC_JWT_TTL_HOURS", "24"))

USER_KEY = "user:{email}"          # lowercase email → user record
USER_BY_ID_KEY = "user_by_id:{id}" # uuid → email pointer (for quick id lookup)

bearer_scheme = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def _issue_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _load_user_by_email(email: str) -> Optional[dict]:
    raw = redis_client.get(USER_KEY.format(email=email.lower()))
    return json.loads(raw) if raw else None


def _public_user(user: dict) -> dict:
    return {"id": user["id"], "email": user["email"], "name": user.get("name")}


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if creds is None or (creds.scheme or "").lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    email = payload.get("email")
    user = _load_user_by_email(email) if email else None
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


class SessionData(BaseModel):
    session_id: str
    step: int = 1
    accident_time: Optional[str] = None
    location: Optional[Dict] = None
    photos: List[str] = []
    vehicle_info: Optional[Dict] = None
    insurance_policy: Optional[Dict] = None
    tow_dispatched: bool = False
    claim_narrative: Optional[str] = None
    completed: bool = False

class PhotoUpload(BaseModel):
    session_id: str
    photo_data: str
    filename: str

class StepData(BaseModel):
    session_id: str

# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ClaimCompass"}


# =============================================================================
# AUTH ENDPOINTS
# =============================================================================

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest):
    email = req.email.lower()
    if _load_user_by_email(email):
        raise HTTPException(status_code=409, detail="An account with that email already exists")

    user_id = secrets.token_urlsafe(16)
    user = {
        "id": user_id,
        "email": email,
        "name": (req.name or "").strip() or None,
        "password_hash": _hash_password(req.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    redis_client.set(USER_KEY.format(email=email), json.dumps(user))
    redis_client.set(USER_BY_ID_KEY.format(id=user_id), email)

    token = _issue_token(user_id, email)
    return {"token": token, "user": _public_user(user), "expires_in": JWT_TTL_HOURS * 3600}


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = _load_user_by_email(req.email)
    # Constant-ish-time: still run a hash check on a dummy hash when the user
    # is missing, so attackers can't time-distinguish "no such email" from
    # "wrong password".
    if not user:
        _verify_password(req.password, "$2b$12$" + "x" * 53)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not _verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _issue_token(user["id"], user["email"])
    return {"token": token, "user": _public_user(user), "expires_in": JWT_TTL_HOURS * 3600}


@app.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": _public_user(user)}


@app.post("/api/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    # Stateless JWT — client just discards the token. Endpoint exists so the
    # frontend has a single "log out" call to make, and so we can return 401
    # cleanly if the token was already invalid.
    return {"ok": True}


@app.post("/api/start")
async def start_session(user: dict = Depends(get_current_user)):
    session_id = hashlib.md5(os.urandom(32)).hexdigest()
    session_data = {
        "session_id": session_id,
        "user_id": user["id"],
        "step": 1,
        "started_at": datetime.now().isoformat(),
        "completed": False
    }
    redis_client.set(session_id, json.dumps(session_data), ex=86400)
    return {
        "session_id": session_id,
        "step": 1,
        "message": f"Welcome back{', ' + user['name'] if user.get('name') else ''}. Let me help you step by step.",
        "whats_next": "Take photos of the damage from different angles"
    }

@app.post("/api/step1")
async def step1_document(data: dict):
    session_id = data.get("session_id")
    session = json.loads(redis_client.get(session_id) or "{}")
    session["step1_data"] = data
    session["step"] = 2
    redis_client.set(session_id, json.dumps(session))
    return {"next_step": 2, "whats_next": "Request a tow truck if needed"}

@app.post("/api/step2")
async def step2_tow(data: dict):
    session_id = data.get("session_id")
    session = json.loads(redis_client.get(session_id) or "{}")
    session["step2_data"] = data
    session["step"] = 3
    redis_client.set(session_id, json.dumps(session))
    return {"next_step": 3, "whats_next": "File your insurance claim"}

@app.post("/api/step3")
async def step3_claim(data: dict):
    session_id = data.get("session_id")
    session = json.loads(redis_client.get(session_id) or "{}")
    
    # Generate claim narrative using LLM logic
    narrative = f"""
INSURANCE CLAIM NARRATIVE
Date: {datetime.now().strftime('%Y-%m-%d')}
Policy: {data.get('policy_number', 'Unknown')}

Description of accident: {data.get('description', 'Please provide details')}

Damage: Based on uploaded photos and documentation.
"""
    session["claim_narrative"] = narrative
    session["step3_data"] = data
    session["step"] = 4
    redis_client.set(session_id, json.dumps(session))
    
    return {
        "next_step": 4,
        "whats_next": "Schedule vehicle repair",
        "claim_narrative": narrative
    }

@app.post("/api/step4")
async def step4_repair(data: dict):
    session_id = data.get("session_id")
    session = json.loads(redis_client.get(session_id) or "{}")
    session["step4_data"] = data
    session["step"] = 5
    redis_client.set(session_id, json.dumps(session))
    return {"next_step": 5, "whats_next": "Review settlement options"}

@app.post("/api/step5")
async def step5_legal(data: dict):
    session_id = data.get("session_id")
    session = json.loads(redis_client.get(session_id) or "{}")
    session["step5_data"] = data
    session["completed"] = True
    session["completed_at"] = datetime.now().isoformat()
    redis_client.set(session_id, json.dumps(session))
    return {"completed": True, "whats_next": "Your claim summary is ready"}

UPLOAD_ROOT = Path(os.getenv("UPLOAD_DIR", "/tmp/cc-uploads"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))  # 20MB

@app.post("/api/upload-photo")
async def upload_photo(
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    # Multipart upload. Streams the file to disk so we never hold the whole
    # photo in memory and avoid the JSON/base64 body-size limits that 500'd
    # the previous endpoint behind the Caddy/Next.js proxy chain.
    safe_session = "".join(c for c in session_id if c.isalnum() or c in "-_")[:64] or "anon"
    safe_name = Path(file.filename or "photo.jpg").name  # strip any path
    dest_dir = UPLOAD_ROOT / safe_session
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / safe_name

    total = 0
    with dest.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Photo too large")
            out.write(chunk)

    # Record on the session if it exists.
    try:
        raw = redis_client.get(session_id)
        if raw:
            session = json.loads(raw)
            session.setdefault("photos", []).append(str(dest))
            redis_client.set(session_id, json.dumps(session), ex=86400)
    except Exception:
        pass  # session bookkeeping is best-effort

    return {
        "photo_url": f"/uploads/{safe_session}/{safe_name}",
        "size": total,
        "content_type": file.content_type,
    }

@app.get("/api/summary/{session_id}")
async def get_summary(session_id: str):
    session = json.loads(redis_client.get(session_id) or "{}")
    return {"summary": session}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
