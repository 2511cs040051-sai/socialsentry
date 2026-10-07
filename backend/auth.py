"""
SocialSentry | Authentication & Role-Based Access Control (RBAC) Layer
Manages user accounts, session tokens, and moderation authorization.
"""

import hmac
import hashlib
import time
from typing import Dict, Any, Optional
from pydantic import BaseModel


# Pre-configured academic & organizational accounts
PRECONFIGURED_USERS = {
    "moderator@mru.ac.in": {
        "id": "u-mod-01",
        "email": "moderator@mru.ac.in",
        "name": "LB. Siddartha Nayak",
        "role": "moderator",
        "department": "MRU Cyber Cell & CSE",
        "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
        "permissions": ["view_analytics", "inspect_nlp", "apply_strikes", "ban_bullies", "trigger_raids", "export_telemetry"],
        "password_hash": hashlib.sha256("admin123".encode()).hexdigest()
    },
    "researcher@mru.ac.in": {
        "id": "u-res-02",
        "email": "researcher@mru.ac.in",
        "name": "D. Sairam",
        "role": "researcher",
        "department": "NLP & Social Analytics Lab",
        "avatar": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=face",
        "permissions": ["view_analytics", "inspect_nlp", "test_sandbox", "export_telemetry"],
        "password_hash": hashlib.sha256("research123".encode()).hexdigest()
    },
    "guest@mru.ac.in": {
        "id": "u-gst-03",
        "email": "guest@mru.ac.in",
        "name": "Guest Reviewer / Examiner",
        "role": "guest",
        "department": "External Project Review Panel",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
        "permissions": ["view_analytics", "inspect_nlp", "test_sandbox"],
        "password_hash": hashlib.sha256("guest123".encode()).hexdigest()
    }
}


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    token: str
    user: Dict[str, Any]
    message: str


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Verifies credentials and returns user profile if valid."""
    normalized_email = email.strip().lower()
    user_record = PRECONFIGURED_USERS.get(normalized_email)
    if not user_record:
        return None

    pwd_hash = hashlib.sha256(password.encode()).hexdigest()
    if hmac.compare_digest(user_record["password_hash"], pwd_hash):
        profile = {k: v for k, v in user_record.items() if k != "password_hash"}
        return profile
    return None


def generate_session_token(user_id: str) -> str:
    """Creates a lightweight signed session token."""
    timestamp = int(time.time())
    raw = f"{user_id}:{timestamp}:socialsentry_secret_key"
    signature = hashlib.sha256(raw.encode()).hexdigest()[:24]
    return f"ss_token_{user_id}_{timestamp}_{signature}"
