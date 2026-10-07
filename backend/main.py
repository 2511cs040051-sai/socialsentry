"""
SocialSentry | FastAPI Main Server
Real-Time Social Media Analytics & Cyberbullying Detection Platform
Malla Reddy University CSE Project (LB.Siddartha nayak & D.Sairam)
"""

import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.database import (
    init_db, get_posts, get_bullies, update_bully_action,
    get_trending_hashtags, get_recent_alerts, get_system_stats
)
from backend.seed_data import seed_database
from backend.nlp_engine import nlp_engine
from backend.streamer import ws_manager, streamer
from backend.connectors import ingestion_manager
from backend.auth import authenticate_user, generate_session_token, LoginRequest, PRECONFIGURED_USERS
from backend.models import (
    AnalyzeRequest, AnalyzeResponse,
    BullyActionRequest, BulliesListResponse, HashtagsListResponse
)

# Root directory for static assets
STATIC_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    print("=" * 60)
    print("[*] Initializing SocialSentry Real-Time Analytics Platform")
    print("[*] Malla Reddy University - CSE Project")
    print("[*] Students: LB.Siddartha nayak (2511CS040028) & D.Sairam (2511CS040051)")
    print("=" * 60)

    # 1. Initialize SQLite Database Schema
    init_db()

    # 2. Seed Initial Telemetry & Post Records
    seed_database()

    # 3. Start Background Real-Time Social Media Streamer
    streamer.start()

    yield

    print("[*] Shutting down SocialSentry streaming workers...")
    streamer.is_running = False


app = FastAPI(
    title="SocialSentry | Real-Time Social Media Analytics & Cyberbullying Detection",
    description="High-throughput stream processing, NLP toxicity classification, serial bully tracking, and live WebSocket telemetry.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for cross-origin frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================================
# REST API ENDPOINTS
# ========================================================

@app.get("/api/health")
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "platform": "SocialSentry",
        "university": "Malla Reddy University",
        "students": ["LB.Siddartha nayak (2511CS040028)", "D.Sairam (2511CS040051)"]
    }


# ========================================================
# AUTHENTICATION & RBAC ENDPOINTS
# ========================================================

@app.post("/api/auth/login")
async def login(credentials: LoginRequest):
    """Authenticates user and returns session profile."""
    user = authenticate_user(credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = generate_session_token(user["id"])
    return {
        "success": True,
        "token": token,
        "user": user,
        "message": f"Welcome back, {user['name']}!"
    }


@app.get("/api/auth/users")
async def get_demo_users():
    """Returns demo profiles for quick viva / examiner login."""
    sanitized = []
    for u in PRECONFIGURED_USERS.values():
        sanitized.append({
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "department": u["department"],
            "avatar": u["avatar"],
            "permissions": u["permissions"]
        })
    return {"users": sanitized}


# ========================================================
# INGESTION CONNECTOR SWITCHER ENDPOINTS
# ========================================================

@app.get("/api/ingestion/sources")
async def get_ingestion_sources():
    """Returns available ingestion connectors (Simulated vs Reddit Live)."""
    return {
        "active_source": ingestion_manager.active_source_id,
        "sources": ingestion_manager.get_sources_status()
    }


@app.post("/api/ingestion/source")
async def set_ingestion_source(payload: dict):
    """Switches active ingestion stream between Simulation and Live Reddit."""
    source_id = payload.get("source_id", "simulation")
    ok = ingestion_manager.set_source(source_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid source_id.")
    return {
        "success": True,
        "active_source": ingestion_manager.active_source_id,
        "message": f"Switched stream ingestion source to {source_id}."
    }


@app.get("/api/stats")
async def get_stats():
    """Returns aggregated real-time analytics KPIs."""
    return {"metrics": get_system_stats()}


@app.get("/api/posts")
async def list_posts(
    limit: int = Query(40, ge=1, le=100),
    offset: int = Query(0, ge=0),
    is_bullying: Optional[bool] = None,
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    q: Optional[str] = None
):
    """Queries posts with filtering by toxicity, platform, sentiment, and search query."""
    posts = get_posts(
        limit=limit,
        offset=offset,
        is_bullying=is_bullying,
        platform=platform,
        sentiment=sentiment,
        query=q
    )
    return {
        "total": len(posts),
        "posts": posts
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeRequest):
    """
    NLP Cyberbullying & Toxicity Sandbox Endpoint.
    Analyzes submitted text for threats, harassment, hate speech, insults,
    and returns token explainability and moderation advice.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text content cannot be empty."
        )

    res = nlp_engine.analyze(request.text, request.author_handle or "@user")
    return res


@app.get("/api/bullies", response_model=BulliesListResponse)
async def list_cyberbullies():
    """Returns repeat cyberbullying offenders, strike counts, and escalation status."""
    bullies = get_bullies()
    return {
        "total": len(bullies),
        "bullies": bullies
    }


@app.post("/api/bullies/{bully_id}/action")
async def execute_bully_action(bully_id: str, payload: BullyActionRequest):
    """Applies moderation actions: warn, strike, ban, or dismiss."""
    valid_actions = ["warn", "strike", "ban", "dismiss"]
    if payload.action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action. Choose from {valid_actions}"
        )

    success = update_bully_action(bully_id, payload.action)
    if not success:
        raise HTTPException(status_code=404, detail="Cyberbully record not found.")

    return {
        "success": True,
        "bully_id": bully_id,
        "action_executed": payload.action
    }


@app.get("/api/hashtags", response_model=HashtagsListResponse)
async def list_hashtags():
    """Returns trending hashtags and their cyberbullying velocity metrics."""
    hashtags = get_trending_hashtags()
    return {"hashtags": hashtags}


@app.get("/api/alerts")
async def list_alerts(limit: int = 10):
    """Returns recent high/critical cyberbullying incident alerts."""
    alerts = get_recent_alerts(limit=limit)
    return {"alerts": alerts}


@app.post("/api/simulate-raid")
async def simulate_raid():
    """Triggers an incoming cyberbully attack raid simulation."""
    posts = await streamer.trigger_raid_simulation()
    return {
        "success": True,
        "message": f"Simulated raid of {len(posts)} malicious posts injected.",
        "posts": posts
    }


# ========================================================
# WEBSOCKET STREAMING ENDPOINT
# ========================================================

@app.websocket("/ws/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """Bidirectional WebSocket connection for live telemetry and client controls."""
    await ws_manager.connect(websocket)

    # Send initial welcome payload and system statistics
    stats = get_system_stats()
    await websocket.send_json({
        "type": "CONNECTION_ESTABLISHED",
        "message": "Connected to SocialSentry Real-Time Stream",
        "metrics": stats
    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                import json
                command = json.loads(data)
                action = command.get("action")

                if action == "pause":
                    streamer.is_running = False
                elif action == "resume":
                    streamer.is_running = True
                elif action == "set_speed":
                    new_speed = command.get("speed", 1800)
                    streamer.interval = max(0.4, new_speed / 1000.0)
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# ========================================================
# FRONTEND STATIC ASSETS SERVING
# ========================================================

@app.get("/")
async def serve_index():
    """Serves the primary SocialSentry dashboard frontend."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse({"message": "SocialSentry API Online. index.html not found."})


@app.get("/login")
async def serve_login():
    """Serves the dedicated minimalist SocialSentry login page."""
    login_path = os.path.join(STATIC_DIR, "login.html")
    if os.path.exists(login_path):
        return FileResponse(login_path)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


# Mount remaining static assets (styles.css, app.js, etc.)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=False), name="static")
