# SocialSentry | Real-Time Social Media Analytics & Cyberbullying Detection Platform

An enterprise-grade, real-time software platform engineered to monitor social media feeds, process high-throughput data streams, classify sentiments, and automatically identify **cyberbullying, harassment, threats, and toxic online behavior**.

Developed for **Malla Reddy University (Department of Computer Science & Engineering)**.

### Student Details (from Project Abstract):
- **LB.Siddartha nayak** — Roll No: `2511CS040028`
- **D.Sairam** — Roll No: `2511CS040051`

---

## 📋 Academic Project Abstract

> "The Real-Time Social Media Analytics Platform is a software-based system designed to collect, process, and analyze social media data in real time to generate meaningful insights from large volumes of online activity. The platform monitors public posts, comments, hashtags, likes, shares, and other user interactions to identify trending topics, user engagement, sentiment, and emerging patterns. Using data analytics and Natural Language Processing (NLP), the system analyzes the content of posts and classifies opinions into positive, negative, or neutral sentiments. It can also track the growth of hashtags and topics, helping users understand what is becoming popular and how public interest changes over time. The analyzed information is presented through an interactive dashboard using charts, graphs, and statistics for easy understanding. The platform can be useful for businesses, organizations, researchers, marketing teams, and cybersecurity professionals to monitor public opinion, understand audience behavior, detect unusual activity, identify emerging trends, and support data-driven decision-making. By providing near real-time analysis and visualization of social media activity, the proposed system aims to make social media monitoring more efficient, accurate, and insightful."

---

## 🎯 Core Theme: Anti-Cyberbullying & Real-Time Social Monitoring

While general analytics track likes and shares, **SocialSentry's primary mission is detecting cyberbullies and dangerous online behavior in real-time**:
1. **Multi-Category Cyberbullying Classification**:
   - `THREAT`: Physical harm, violence, and intimidation.
   - `HARASSMENT`: Coordinated mass attacks, dogpiling, and hostile exclusion.
   - `HATE SPEECH`: Targeted discrimination, identity attacks, and slurs.
   - `INSULT`: Degrading language, body shaming, and abusive name-calling.
2. **Serial Bully Identification & 3-Strike Escalation**:
   - Maintains an automated persistent registry of repeat offenders.
   - **Strike 1**: Formal Caution Notice.
   - **Strike 2**: Temporary Messaging & Commenting Suspension.
   - **Strike 3**: Permanent Account Ban & Police Report Generation.
3. **Interactive NLP Sandbox**:
   - Real-time text tester with token explainability (highlights exact triggering words).
4. **Hashtag Bully Velocity Tracker**:
   - Calculates the percentage of toxicity within trending tags (e.g. `#StopBullying` vs `#CancelTarget`).

---

## 🏗️ Architecture & Step-by-Step Implementation

### Step 1: Frontend Dashboard (`index.html`, `styles.css`, `app.js`)
- **Executive Dashboard**: Real-time sliding window line chart of toxic incidents, category breakdown doughnut, and live feed.
- **Dedicated Feeds**: Multi-channel feed from X (Twitter), Reddit, Instagram, YouTube, and LinkedIn.
- **Cyberbully Moderation Hub**: Repeat offenders profile cards with strike meters.
- **NLP Testing Sandbox**: Live input field to test any phrase with real-time token highlighting.
- **WebSocket Consumer**: Live bidirectional connection with auto-reconnect and latency monitoring.

### Step 2: Backend REST API (`backend/main.py`)
- Built using **FastAPI** with asynchronous concurrency.
- Endpoints:
  - `GET /api/stats`: Real-time KPI telemetry.
  - `GET /api/posts`: Filtered posts query (toxicity, platform, sentiment, search).
  - `POST /api/analyze`: NLP analysis endpoint for custom text.
  - `GET /api/bullies`: Flagged offender list and strike status.
  - `POST /api/bullies/{id}/action`: Execute moderation actions (warn, strike, ban).
  - `GET /api/hashtags`: Trending topics with velocity & toxicity ratios.
  - `POST /api/simulate-raid`: Injects a coordinated cyberbully raid.

### Step 3: SQLite Database Layer (`backend/database.py`, `backend/models.py`, `backend/seed_data.py`)
- Tables:
  - `posts`: Storage for streaming social media posts with sentiment, toxicity scores, and tokens.
  - `cyberbullies`: Registry of repeat offenders, violation counts, and strike meters.
  - `trending_hashtags`: Telemetry on hashtag growth and toxic ratios.
  - `bully_alerts`: Incident audit log for critical threats.

### Step 4: NLP Cyberbullying & Sentiment Engine (`backend/nlp_engine.py`)
- Multi-label classification with lexical pattern matching and weighted risk scoring.
- Sentiment polarity (-1.0 to +1.0) and subjectivity.
- Explainable AI: Token extraction highlighting exact abusive spans.
- Automated moderation recommendation generator.

### Step 5: Real-Time Streaming Engine & WebSockets (`backend/streamer.py`)
- Background ingestion simulator generating multi-platform social events.
- Emits `NEW_POST`, `STATS_UPDATE`, and immediate `BULLY_ALERT` pushes to connected WebSocket clients.
- Bidirectional controls for speed adjustments (0.5x, 1x, 2x, 4x) and pause/resume.

---

## 🚀 How to Run the Platform

### 1. Requirements
- Python 3.9+ (Python 3.13 supported)
- Dependencies: `fastapi`, `uvicorn`, `websockets`, `pydantic` (already installed)

### 2. Start the Unified Server
Open your terminal in this directory:
```bash
python run.py
```

### 3. Open in Browser
- **Dashboard Web UI**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **WebSocket Endpoint**: `ws://127.0.0.1:8000/ws/stream`

---

## 📂 Complete File Structure
```
social-media-analytics-platform/
│
├── index.html              # Primary dashboard UI shell
├── styles.css              # Cyberpunk glassmorphism, animations & badges
├── app.js                  # Frontend state, Chart.js & WebSocket handler
├── run.py                  # One-click launch script
├── README.md               # Documentation & abstract reference
│
└── backend/
    ├── __init__.py         # Package initialization
    ├── database.py         # SQLite connection, schema & CRUD queries
    ├── models.py           # Pydantic data schemas
    ├── nlp_engine.py       # Multi-class cyberbullying & sentiment engine
    ├── seed_data.py        # Realistic initial social media post generator
    ├── streamer.py         # Async ingestion engine & WebSocket broadcaster
    └── main.py             # FastAPI REST APIs & static assets mount
```
