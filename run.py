"""
SocialSentry | Single Runner Entry Point
Launches the FastAPI backend and serves the interactive frontend dashboard.
"""

import sys
import os
import uvicorn

# Ensure the project root is in the Python module search path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

if __name__ == "__main__":
    print("=" * 70)
    print("SOCIALSENTRY: REAL-TIME SOCIAL MEDIA ANALYTICS PLATFORM")
    print("Theme: Cyberbullying Detection & Social Media Ingestion Updates")
    print("Institution: Malla Reddy University - Department of CSE")
    print("Students: LB.Siddartha nayak (2511CS040028) & D.Sairam (2511CS040051)")
    print("=" * 70)
    print("Dashboard Web UI:   http://127.0.0.1:8000")
    print("Swagger API Docs:   http://127.0.0.1:8000/docs")
    print("WebSocket Stream:   ws://127.0.0.1:8000/ws/stream")
    print("=" * 70)

    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        log_level="info",
        reload=False
    )
