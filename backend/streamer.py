"""
SocialSentry | Real-Time Streaming Engine & WebSocket Manager
Ingests simulated live social media events, executes NLP classification,
updates database state, and broadcasts events to connected clients.
"""

import asyncio
import json
import random
from datetime import datetime
from typing import Set, Dict, Any, List
from fastapi import WebSocket

from backend.database import insert_post, update_or_create_bully, insert_alert, get_system_stats
from backend.nlp_engine import nlp_engine
from backend.connectors import ingestion_manager


class ConnectionManager:
    """Manages active WebSocket client connections."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts JSON payload to all connected clients."""
        dead_connections = set()
        text_data = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text_data)
            except Exception:
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)


ws_manager = ConnectionManager()


class SocialMediaStreamer:
    """Simulates real-time social media ingestion stream."""

    def __init__(self):
        self.is_running = True
        self.interval = 1.8  # seconds per post
        self._task = None

        # Template dataset for streaming posts
        self.post_pool = [
            # Cyberbullying Incidents
            {
                "content": "Why are you even talking? Nobody wants you here, delete your account right now! #CancelTarget",
                "author": "Flamer_Troll",
                "handle": "@flamer_troll",
                "platform": "twitter"
            },
            {
                "content": "I will find where you live and destroy you. Watch your back tonight! #ExposeUser",
                "author": "Shadow_Enforcer",
                "handle": "@shadow_threat",
                "platform": "reddit"
            },
            {
                "content": "Look at this useless clown failing as usual. Complete disgrace to our batch. #CancelTarget",
                "author": "SnarkyCritic",
                "handle": "@snarky_critic",
                "platform": "youtube"
            },
            {
                "content": "You are pathetic and brainless. Go cry more loser. #ExposeUser",
                "author": "ToxicRage_Bot",
                "handle": "@toxic_rage",
                "platform": "twitter"
            },
            {
                "content": "We are going to attack on your profile until you quit the platform entirely! #CancelTarget",
                "author": "RaidMob_99",
                "handle": "@raidmob99",
                "platform": "instagram"
            },
            # Safe / Positive / Academic Posts
            {
                "content": "Delighted to share our research on real-time NLP cyberbully detection at Malla Reddy University CSE symposium! #MRUCSE #SocialSentry #AI2026",
                "author": "LB Siddartha Nayak",
                "handle": "@siddartha_mru",
                "platform": "twitter"
            },
            {
                "content": "Proud of our team building an automated safety shield for online communities. Technology for good! #MRUCSE #SocialSentry",
                "author": "D. Sairam",
                "handle": "@sairam_mru",
                "platform": "linkedin"
            },
            {
                "content": "Remember to report cyber harassment and support victims. A healthy digital space is everyone's responsibility! #StopBullying",
                "author": "CyberSafety_Club",
                "handle": "@cybersafety_mru",
                "platform": "instagram"
            },
            {
                "content": "Benchmark test completed: WebSocket throughput sustained at 1,200 msg/sec with sub-5ms classification delay. #AI2026",
                "author": "EngineRoom",
                "handle": "@engineroom_ops",
                "platform": "reddit"
            },
            {
                "content": "Great work to all students who participated in the hackathon this weekend! Excellent prototypes all around. #MRUCSE",
                "author": "CampusDean",
                "handle": "@mru_dean",
                "platform": "twitter"
            },
            {
                "content": "Exploring modern transformer tokenization and sliding window sentiment curves. Super insightful lecture! #AI2026",
                "author": "Kavya Murthy",
                "handle": "@kavya_cse",
                "platform": "twitter"
            }
        ]

    def start(self):
        """Starts the background streaming generator loop."""
        if not self._task or self._task.done():
            self._task = asyncio.create_task(self._stream_loop())

    async def _stream_loop(self):
        counter = 0
        while True:
            try:
                if self.is_running:
                    post = await self.generate_and_process_post()
                    await ws_manager.broadcast({
                        "type": "NEW_POST",
                        "post": post
                    })

                    counter += 1
                    # Periodically push aggregated stats update
                    if counter % 5 == 0:
                        stats = get_system_stats()
                        await ws_manager.broadcast({
                            "type": "STATS_UPDATE",
                            "metrics": stats
                        })

                await asyncio.sleep(self.interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in streaming loop: {e}")
                await asyncio.sleep(2.0)

    async def generate_and_process_post(self, override_item: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generates, analyzes, and saves a single social post from active connector."""
        if override_item:
            base = override_item
        else:
            fetched = await ingestion_manager.active_connector.fetch_next_post()
            base = fetched if fetched else random.choice(self.post_pool)

        # Run NLP Analysis
        nlp_res = nlp_engine.analyze(base["content"], base["handle"])

        now_str = datetime.now().strftime("%I:%M %p")
        post_id = f"post-{int(datetime.now().timestamp() * 1000)}-{random.randint(100, 999)}"

        post = {
            "id": post_id,
            "platform": base.get("platform", "twitter"),
            "author_name": base["author"],
            "author_handle": base["handle"],
            "author_avatar": base.get("avatar") or f"https://images.unsplash.com/photo-{1500000000000 + random.randint(1000, 9999999)}?w=100&h=100&fit=crop&crop=face",
            "content": base["content"],
            "timestamp": now_str,
            "likes": random.randint(1, 150),
            "shares": random.randint(0, 30),
            "comments": random.randint(0, 45),
            **nlp_res
        }

        # Persist post
        insert_post(post)

        # Update repeat bully records if malicious
        if post["is_bullying"]:
            update_or_create_bully(
                handle=post["author_handle"],
                name=post["author_name"],
                avatar=post["author_avatar"],
                platform=post["platform"],
                is_violation=True,
                risk_level=post["risk_level"]
            )

            # Trigger alert broadcast if high or critical
            if post["risk_level"] in ["CRITICAL", "HIGH"]:
                alert = {
                    "id": f"alert-{int(datetime.now().timestamp()*1000)}",
                    "post_id": post["id"],
                    "severity": post["risk_level"].lower(),
                    "title": f"Cyberbullying Detected: {post['toxicity_type']}",
                    "description": post["content"],
                    "author_handle": post["author_handle"],
                    "detected_at": now_str,
                    "post": post
                }
                insert_alert(alert)
                await ws_manager.broadcast({
                    "type": "BULLY_ALERT",
                    "alert": alert
                })

        return post

    async def trigger_raid_simulation(self) -> List[Dict[str, Any]]:
        """Simulates an influx of coordinated cyberbullying attacks."""
        raid_items = [
            {
                "content": "ATTACK ON THIS PROFILE NOW! Dislike everything, flood their mentions and force them off! #CancelTarget",
                "author": "RaidCoordinator",
                "handle": "@raid_coord",
                "platform": "twitter"
            },
            {
                "content": "You will never find peace here. We know where you hang out. Get lost or regret it. #CancelTarget",
                "author": "ShadowHunter",
                "handle": "@shadow_hunter",
                "platform": "reddit"
            },
            {
                "content": "Delete your account you pathetic worthless clown! Everyone hates you! #CancelTarget",
                "author": "ToxicSwarm_01",
                "handle": "@toxicswarm01",
                "platform": "instagram"
            }
        ]

        generated_posts = []
        for item in raid_items:
            p = await self.generate_and_process_post(item)
            generated_posts.append(p)
            await asyncio.sleep(0.3)

        await ws_manager.broadcast({
            "type": "RAID_SIMULATION",
            "posts": generated_posts
        })

        return generated_posts


streamer = SocialMediaStreamer()
