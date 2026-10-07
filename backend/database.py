"""
SocialSentry | Database Layer (SQLite)
Manages posts, cyberbullying records, repeat offenders, strikes, and trending topics.
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "socialsentry.db")


def get_connection():
    """Returns a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes tables and indices."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Posts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_handle TEXT NOT NULL,
        author_avatar TEXT,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        sentiment TEXT NOT NULL,
        sentiment_score REAL NOT NULL,
        is_bullying INTEGER NOT NULL,
        toxicity_score REAL NOT NULL,
        toxicity_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        flagged_tokens TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Cyberbullies / Flagged Accounts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cyberbullies (
        id TEXT PRIMARY KEY,
        handle TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        platform TEXT NOT NULL,
        total_violations INTEGER DEFAULT 1,
        strike_count INTEGER DEFAULT 1,
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL,
        last_violation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Trending Hashtags Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trending_hashtags (
        id TEXT PRIMARY KEY,
        hashtag TEXT UNIQUE NOT NULL,
        mention_count INTEGER DEFAULT 0,
        growth_rate TEXT NOT NULL,
        toxicity_ratio REAL DEFAULT 0.0,
        risk TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. Bully Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bully_alerts (
        id TEXT PRIMARY KEY,
        post_id TEXT,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        author_handle TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        status TEXT DEFAULT 'OPEN',
        action_taken TEXT DEFAULT 'NONE'
    );
    """)

    # Indices for high-speed queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_bullying ON posts(is_bullying);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_sentiment ON posts(sentiment);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cyberbullies_handle ON cyberbullies(handle);")

    conn.commit()
    conn.close()


def insert_post(post: Dict[str, Any]) -> str:
    """Inserts a new post and returns its ID."""
    conn = get_connection()
    cursor = conn.cursor()

    flagged_json = json.dumps(post.get("flagged_tokens", []))

    cursor.execute("""
    INSERT OR REPLACE INTO posts (
        id, platform, author_name, author_handle, author_avatar,
        content, timestamp, sentiment, sentiment_score,
        is_bullying, toxicity_score, toxicity_type, risk_level,
        likes, shares, comments, flagged_tokens
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        post["id"],
        post.get("platform", "twitter"),
        post.get("author_name") or post.get("author", "User"),
        post.get("author_handle") or post.get("handle", "@user"),
        post.get("author_avatar") or post.get("avatar", ""),
        post["content"],
        post.get("timestamp", datetime.now().strftime("%I:%M %p")),
        post.get("sentiment", "neutral"),
        float(post.get("sentiment_score", 0.0)),
        1 if post.get("is_bullying", False) else 0,
        float(post.get("toxicity_score", 0.0)),
        post.get("toxicity_type", "CLEAN"),
        post.get("risk_level", "SAFE"),
        int(post.get("likes", 0)),
        int(post.get("shares", 0)),
        int(post.get("comments", 0)),
        flagged_json
    ))

    conn.commit()
    conn.close()
    return post["id"]


def get_posts(
    limit: int = 40,
    offset: int = 0,
    is_bullying: Optional[bool] = None,
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    query: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Fetches filtered posts ordered by recency."""
    conn = get_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if is_bullying is not None:
        conditions.append("is_bullying = ?")
        params.append(1 if is_bullying else 0)

    if platform and platform.lower() != "all":
        conditions.append("LOWER(platform) = ?")
        params.append(platform.lower())

    if sentiment and sentiment.lower() != "all":
        conditions.append("LOWER(sentiment) = ?")
        params.append(sentiment.lower())

    if query:
        conditions.append("(LOWER(content) LIKE ? OR LOWER(author_handle) LIKE ? OR LOWER(author_name) LIKE ?)")
        wildcard = f"%{query.lower()}%"
        params.extend([wildcard, wildcard, wildcard])

    sql = "SELECT * FROM posts"
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(sql, params)
    rows = cursor.fetchall()

    results = []
    for r in rows:
        d = dict(r)
        d["is_bullying"] = bool(d["is_bullying"])
        try:
            d["flagged_tokens"] = json.loads(d["flagged_tokens"]) if d["flagged_tokens"] else []
        except:
            d["flagged_tokens"] = []
        results.append(d)

    conn.close()
    return results


def update_or_create_bully(
    handle: str,
    name: str,
    avatar: str,
    platform: str,
    is_violation: bool,
    risk_level: str = "HIGH"
) -> Dict[str, Any]:
    """Updates violation history and strike count for repeat offenders."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cyberbullies WHERE handle = ?", (handle,))
    row = cursor.fetchone()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    if row:
        bully_id = row["id"]
        violations = row["total_violations"] + (1 if is_violation else 0)
        # Escalation: 1 violation = strike 1, 3 violations = strike 2, 5+ = strike 3
        strikes = row["strike_count"]
        if is_violation:
            if violations >= 5:
                strikes = 3
            elif violations >= 2:
                strikes = 2
            else:
                strikes = 1

        status = "BANNED" if strikes >= 3 else ("SUSPENDED" if strikes == 2 else "WARNED")

        cursor.execute("""
        UPDATE cyberbullies
        SET total_violations = ?, strike_count = ?, risk_level = ?, status = ?, last_violation = ?
        WHERE id = ?
        """, (violations, strikes, risk_level, status, now_str, bully_id))
    else:
        bully_id = f"b-{int(datetime.now().timestamp()*1000)}"
        strikes = 1
        status = "WARNED"
        cursor.execute("""
        INSERT INTO cyberbullies (
            id, handle, name, avatar, platform, total_violations, strike_count, risk_level, status, last_violation
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
        """, (bully_id, handle, name, avatar, platform, strikes, risk_level, status, now_str))

    conn.commit()

    cursor.execute("SELECT * FROM cyberbullies WHERE id = ?", (bully_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return updated


def get_bullies() -> List[Dict[str, Any]]:
    """Returns all flagged cyberbullies ordered by strike count and violations."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cyberbullies ORDER BY strike_count DESC, total_violations DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_bully_action(bully_id: str, action: str) -> bool:
    """Executes a moderation action (warn, strike, ban, dismiss) on a bully record."""
    conn = get_connection()
    cursor = conn.cursor()

    if action == "ban":
        cursor.execute("UPDATE cyberbullies SET status = 'BANNED', strike_count = 3 WHERE id = ?", (bully_id,))
    elif action == "strike":
        cursor.execute("UPDATE cyberbullies SET strike_count = MIN(3, strike_count + 1), status = CASE WHEN strike_count >= 2 THEN 'BANNED' ELSE 'SUSPENDED' END WHERE id = ?", (bully_id,))
    elif action == "warn":
        cursor.execute("UPDATE cyberbullies SET status = 'WARNED' WHERE id = ?", (bully_id,))
    elif action == "dismiss":
        cursor.execute("UPDATE cyberbullies SET status = 'DISMISSED' WHERE id = ?", (bully_id,))

    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected


def get_trending_hashtags() -> List[Dict[str, Any]]:
    """Returns trending hashtags with velocity and toxicity metrics."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trending_hashtags ORDER BY mention_count DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_alerts(limit: int = 10) -> List[Dict[str, Any]]:
    """Returns recent high-severity bully alerts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bully_alerts ORDER BY rowid DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def insert_alert(alert: Dict[str, Any]) -> str:
    """Inserts a critical bully incident alert."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO bully_alerts (
        id, post_id, severity, title, description, author_handle, detected_at, status, action_taken
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        alert["id"],
        alert.get("post_id", ""),
        alert.get("severity", "critical"),
        alert["title"],
        alert.get("description") or alert.get("desc", ""),
        alert.get("author_handle") or alert.get("handle", "@user"),
        alert.get("detected_at", datetime.now().strftime("%I:%M %p")),
        alert.get("status", "OPEN"),
        alert.get("action_taken", "PENDING_REVIEW")
    ))
    conn.commit()
    conn.close()
    return alert["id"]


def get_system_stats() -> Dict[str, Any]:
    """Computes aggregated live KPIs across the database."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) AS total FROM posts")
    total_posts = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) AS bullies FROM posts WHERE is_bullying = 1")
    bully_posts = cursor.fetchone()["bullies"]

    cursor.execute("SELECT COUNT(*) AS serial_bullies FROM cyberbullies")
    serial_bullies = cursor.fetchone()["serial_bullies"]

    cursor.execute("SELECT SUM(strike_count) AS strikes FROM cyberbullies")
    strikes = cursor.fetchone()["strikes"] or 0

    cursor.execute("SELECT COUNT(*) AS pos FROM posts WHERE sentiment = 'positive'")
    pos_posts = cursor.fetchone()["pos"]

    cursor.execute("SELECT COUNT(*) AS neg FROM posts WHERE sentiment = 'negative'")
    neg_posts = cursor.fetchone()["neg"]

    cursor.execute("SELECT COUNT(*) AS neu FROM posts WHERE sentiment = 'neutral'")
    neu_posts = cursor.fetchone()["neu"]

    conn.close()

    bully_rate = f"{((bully_posts / max(1, total_posts)) * 100):.2f}%"
    pos_rate = f"{((pos_posts / max(1, total_posts)) * 100):.1f}%"

    return {
        "totalIngested": total_posts,
        "bullyCount": bully_posts,
        "bullyRate": bully_rate,
        "serialBullies": serial_bullies,
        "strikesIssued": strikes,
        "posRate": pos_rate,
        "sentimentCounts": {
            "positive": pos_posts,
            "neutral": neu_posts,
            "negative": neg_posts
        }
    }
