"""
SocialSentry | Database Seed Generator
Pre-populates the SQLite database with realistic initial social media posts,
cyberbullying incidents, serial bully accounts, and trending hashtag telemetry.
"""

import os
import json
from datetime import datetime, timedelta
from backend.database import get_connection, insert_post, update_or_create_bully, insert_alert
from backend.nlp_engine import nlp_engine


def seed_database():
    """Seeds the SQLite database if posts table is empty, and guarantees YouTube chats exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS count FROM posts")
    count = cursor.fetchone()["count"]

    if count == 0:
        print("[+] Seeding initial SocialSentry social media and bully detection data...")

    # 1. Seed Repeat Cyberbullies
    initial_bullies = [
        {
            "id": "b-101",
            "handle": "@shadow_threat",
            "name": "ShadowStrike_X",
            "avatar": "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face",
            "platform": "reddit",
            "total_violations": 14,
            "strike_count": 3,
            "risk_level": "CRITICAL",
            "status": "BANNED",
            "last_violation": (datetime.now() - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M")
        },
        {
            "id": "b-102",
            "handle": "@alphatroll99",
            "name": "CyberTroll_Alpha",
            "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
            "platform": "twitter",
            "total_violations": 9,
            "strike_count": 2,
            "risk_level": "HIGH",
            "status": "SUSPENDED",
            "last_violation": (datetime.now() - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M")
        },
        {
            "id": "b-103",
            "handle": "@toxic_rage",
            "name": "ToxicRage_Bot",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
            "platform": "youtube",
            "total_violations": 6,
            "strike_count": 2,
            "risk_level": "HIGH",
            "status": "FLAGGED",
            "last_violation": (datetime.now() - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M")
        },
        {
            "id": "b-104",
            "handle": "@campus_hater",
            "name": "Anonymous Snitch",
            "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
            "platform": "instagram",
            "total_violations": 3,
            "strike_count": 1,
            "risk_level": "MEDIUM",
            "status": "WARNED",
            "last_violation": (datetime.now() - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M")
        }
    ]

    for b in initial_bullies:
        cursor.execute("""
        INSERT OR REPLACE INTO cyberbullies (
            id, handle, name, avatar, platform, total_violations, strike_count, risk_level, status, last_violation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            b["id"], b["handle"], b["name"], b["avatar"], b["platform"],
            b["total_violations"], b["strike_count"], b["risk_level"], b["status"], b["last_violation"]
        ))

    # 2. Seed Trending Hashtags
    initial_hashtags = [
        ("h-1", "#StopBullying", 32400, "+184%", 3.2, "LOW"),
        ("h-2", "#CancelTarget", 24100, "+320%", 84.6, "CRITICAL"),
        ("h-3", "#MRUCSE", 18900, "+74%", 1.1, "SAFE"),
        ("h-4", "#SocialSentry", 15400, "+142%", 0.8, "SAFE"),
        ("h-5", "#ExposeUser", 12100, "+210%", 76.4, "HIGH"),
        ("h-6", "#AI2026", 9800, "+45%", 2.4, "SAFE"),
    ]

    for hid, tag, mentions, growth, tox, risk in initial_hashtags:
        cursor.execute("""
        INSERT OR REPLACE INTO trending_hashtags (
            id, hashtag, mention_count, growth_rate, toxicity_ratio, risk
        ) VALUES (?, ?, ?, ?, ?, ?)
        """, (hid, tag, mentions, growth, tox, risk))

    conn.commit()
    conn.close()

    # 3. Seed Posts with NLP Processing
    initial_posts_data = [
        {
            "id": "post-001",
            "platform": "twitter",
            "author_name": "CyberTroll_Alpha",
            "author_handle": "@alphatroll99",
            "author_avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
            "content": "You are completely incompetent, nobody respects your work. Delete your account and never show up again! #CancelTarget",
            "likes": 12,
            "shares": 4,
            "comments": 18,
            "timestamp": "Just now"
        },
        {
            "id": "post-002",
            "platform": "twitter",
            "author_name": "Aarav Sharma",
            "author_handle": "@aarav_tech",
            "author_avatar": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=face",
            "content": "Excited to present our NLP research paper at Malla Reddy University tomorrow! Great effort by the entire team. #AI2026 #SocialSentry",
            "likes": 142,
            "shares": 38,
            "comments": 15,
            "timestamp": "2 mins ago"
        },
        {
            "id": "post-003",
            "platform": "reddit",
            "author_name": "ShadowStrike_X",
            "author_handle": "@shadow_threat",
            "author_avatar": "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face",
            "content": "I know where you live and what campus you study at. Better watch your back tonight or else. #CancelTarget",
            "likes": 2,
            "shares": 0,
            "comments": 29,
            "timestamp": "3 mins ago"
        },
        {
            "id": "post-004",
            "platform": "instagram",
            "author_name": "CampusVoice_MRU",
            "author_handle": "@mru_students",
            "author_avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
            "content": "Workshop on Cyber Safety and Anti-Bullying happening at CSE Auditorium on Friday! Be an upstander, not a bystander. #StopBullying #MRUCSE",
            "likes": 389,
            "shares": 64,
            "comments": 42,
            "timestamp": "5 mins ago"
        },
        {
            "id": "post-005",
            "platform": "youtube",
            "author_name": "ToxicRage_Bot",
            "author_handle": "@toxic_rage",
            "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
            "content": "Look at this ugly fraud. How does someone so stupid even get admitted here? Total disgrace. #ExposeUser",
            "likes": 8,
            "shares": 1,
            "comments": 31,
            "timestamp": "7 mins ago"
        },
        {
            "id": "post-006",
            "platform": "linkedin",
            "author_name": "Priya Nair",
            "author_handle": "@priya_nair_ai",
            "author_avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
            "content": "Proud to collaborate with researchers on building safe online communities. Machine learning and NLP allow us to detect toxicity proactively before harm occurs. #SocialSentry",
            "likes": 512,
            "shares": 89,
            "comments": 37,
            "timestamp": "9 mins ago"
        },
        {
            "id": "post-007",
            "platform": "twitter",
            "author_name": "Flamer_99",
            "author_handle": "@flamer99",
            "author_avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
            "content": "Stop posting, you are wasting everyone's time and nobody cares about your stupid opinions. #CancelTarget",
            "likes": 5,
            "shares": 2,
            "comments": 14,
            "timestamp": "12 mins ago"
        },
        {
            "id": "post-008",
            "platform": "reddit",
            "author_name": "DevInsights",
            "author_handle": "r/mru_cse",
            "author_avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face",
            "content": "Testing real-time streaming pipeline throughput with WebSocket connections. Handling 1,000+ simulated messages/sec smoothly! #MRUCSE #AI2026",
            "likes": 88,
            "shares": 16,
            "comments": 22,
            "timestamp": "15 mins ago"
        }
    ]

    for p in initial_posts_data:
        # Run through NLP engine
        nlp_res = nlp_engine.analyze(p["content"], p["author_handle"])
        post_record = {
            **p,
            **nlp_res
        }
        insert_post(post_record)

    # 4. Insert Initial Incident Alert
    insert_alert({
        "id": "alert-init-01",
        "post_id": "post-003",
        "severity": "CRITICAL",
        "title": "Violent Physical Threat Detected",
        "description": "User @shadow_threat sent direct physical threat: 'I know where you live... Watch your back tonight'. Account flagged for immediate Strike 3 ban.",
        "author_handle": "@shadow_threat",
        "detected_at": "Just now",
        "status": "OPEN",
        "action_taken": "STRIKE_3_APPLIED"
    })

    print("[SUCCESS] Successfully seeded initial posts, cyberbullies, and hashtags.")

    # 5. Always Guarantee Real YouTube Live Stream Chats from UNQ Gamer and Hooked Creators
    conn_check = get_connection()
    c_check = conn_check.cursor()
    c_check.execute("SELECT COUNT(*) AS count FROM posts WHERE platform = 'youtube' AND author_name != 'SnarkyCritic'")
    yt_count = c_check.fetchone()["count"]
    conn_check.close()

    if yt_count < 50:
        print("[+] Seeding authentic saved YouTube Live comments from UNQ Gamer (Telugu BGMI) & hooked creators...")
        json_path = os.path.join(os.path.dirname(__file__), "saved_youtube_posts.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                yt_posts = json.load(f)
            for p in yt_posts:
                insert_post(p)

        insert_alert({
            "id": "alert-yt-01",
            "post_id": "yt-mod-002",
            "severity": "CRITICAL",
            "title": "Stream Raid Threat: UNQ Gamer Stream",
            "description": "User @shadow_raid_hyd sent physical threat against streamer's studio during live broadcast. Moderation escalation initiated.",
            "author_handle": "@shadow_raid_hyd",
            "detected_at": "Just now",
            "status": "OPEN",
            "action_taken": "STRIKE_2_APPLIED"
        })
        print("[SUCCESS] Real YouTube Live stream chats & alerts successfully populated into vault.")
