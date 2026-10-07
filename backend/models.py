"""
SocialSentry | Pydantic Models & Schemas
Data contracts for REST endpoints and WebSocket payloads.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class PostBase(BaseModel):
    content: str
    author_name: Optional[str] = "User"
    author_handle: Optional[str] = "@user"
    author_avatar: Optional[str] = None
    platform: Optional[str] = "twitter"


class PostCreate(PostBase):
    pass


class PostResponse(BaseModel):
    id: str
    platform: str
    author_name: str
    author_handle: str
    author_avatar: Optional[str] = None
    content: str
    timestamp: str
    sentiment: str
    sentiment_score: float
    is_bullying: bool
    toxicity_score: float
    toxicity_type: str
    risk_level: str
    likes: int = 0
    shares: int = 0
    comments: int = 0
    flagged_tokens: List[str] = []


class PostsListResponse(BaseModel):
    total: int
    posts: List[PostResponse]


class AnalyzeRequest(BaseModel):
    text: str
    author_handle: Optional[str] = "@test_user"


class AnalyzeResponse(BaseModel):
    is_bullying: bool
    toxicity_score: float
    toxicity_type: str
    risk_level: str
    sentiment: str
    sentiment_score: float
    flagged_tokens: List[str]
    recommended_action: str
    probabilities: Dict[str, float]


class CyberbullyItem(BaseModel):
    id: str
    handle: str
    name: str
    avatar: Optional[str] = None
    platform: str
    total_violations: int
    strike_count: int
    risk_level: str
    status: str
    last_violation: str


class BulliesListResponse(BaseModel):
    total: int
    bullies: List[CyberbullyItem]


class BullyActionRequest(BaseModel):
    action: str = Field(..., description="Action to take: warn, strike, ban, or dismiss")


class HashtagItem(BaseModel):
    id: str
    hashtag: str
    mention_count: int
    growth_rate: str
    toxicity_ratio: float
    risk: str


class HashtagsListResponse(BaseModel):
    hashtags: List[HashtagItem]


class StatsResponse(BaseModel):
    metrics: Dict[str, Any]
