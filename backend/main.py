"""ClaimCompass - Car Accident Claim Navigation System"""

import os
import json
import hashlib
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
from dotenv import load_dotenv
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

@app.post("/api/start")
async def start_session():
    session_id = hashlib.md5(os.urandom(32)).hexdigest()
    session_data = {
        "session_id": session_id,
        "step": 1,
        "started_at": datetime.now().isoformat(),
        "completed": False
    }
    redis_client.set(session_id, json.dumps(session_data), ex=86400)
    return {
        "session_id": session_id,
        "step": 1,
        "message": "I'm sorry about your accident. Let me help you step by step.",
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
