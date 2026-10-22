"""
SocialSentry | NLP Cyberbullying & Sentiment Analysis Engine
Advanced multi-category cyberbullying detection, sentiment classification,
explainable token extraction, and automated moderation recommendation.
"""

import re
from typing import Dict, Any, List, Tuple


class CyberbullyNLPEngine:
    """
    Intelligent NLP pipeline for social media text processing:
    1. Multi-class toxicity classification (Harassment, Threat, Hate Speech, Insult)
    2. Sentiment polarity & subjectivity analysis
    3. Explainable token highlighting
    4. Threat risk escalation
    """

    def __init__(self):
        # 1. Violent Threats & Physical Harm Lexicon (Weight: 0.90 - 1.0)
        self.threat_patterns = [
            (r"\b(i will|gonna|going to)\s+(kill|murder|hurt|destroy|beat|end)\s+(you|u)\b", 0.99),
            (r"\b(watch your back|you will regret|you're dead|u are dead)\b", 0.96),
            (r"\b(know where you live|find where you live|track you down)\b", 0.98),
            (r"\b(hope you die|go die|kill yourself|kys)\b", 0.99),
            (r"\b(slit your|break your|punch your)\b", 0.97),
            (r"\b(burn in hell|put you in the hospital)\b", 0.94),
        ]

        # 2. Targeted Harassment & Bullying Lexicon (Weight: 0.80 - 0.95)
        self.harassment_patterns = [
            (r"\b(delete your account|delete ur account|get off the internet)\b", 0.88),
            (r"\b(nobody (likes|wants|cares about) (you|u))\b", 0.92),
            (r"\b(everyone hates you|stop posting|get lost)\b", 0.89),
            (r"\b(you are pathetic|u are pathetic|wasting everyone's time)\b", 0.87),
            (r"\b(never show your face|deserve to be bullied|no one loves you)\b", 0.93),
            (r"\b(cry more|quit crying|loser)\b", 0.78),
            (r"\b(attack on (their|his|her) profile|flood (them|him|her))\b", 0.95),
            (r"\b(ruin your life|make sure you lose)\b", 0.91),
        ]

        # 3. Hate Speech & Discriminatory Slander (Weight: 0.88 - 0.98)
        self.hate_speech_patterns = [
            (r"\b(disgusting freak|subhuman|scum of the earth)\b", 0.94),
            (r"\b(go back to where you came from|your kind)\b", 0.95),
            (r"\b(filthy|trash human|worthless piece of)\b", 0.91),
            (r"\b(parasite|pest|abomination)\b", 0.93),
        ]

        # 4. Insult, Body Shaming & Degrading Language (Weight: 0.70 - 0.85)
        self.insult_patterns = [
            (r"\b(idiot|moron|stupid|dumb|clown|fool)\b", 0.75),
            (r"\b(ugly|fat|disgrace|worthless|fraud)\b", 0.84),
            (r"\b(incompetent|talentless|useless clown|failure)\b", 0.82),
            (r"\b(shut up|shut your mouth|shut ur mouth)\b", 0.72),
            (r"\b(brainless|retarded|imbecile)\b", 0.89),
            (r"\b(trash gamer|waste fellow|worst player|uninstall|noob gamer|noob player)\b", 0.86),
            (r"\b(dhengu|gudha|lanja|puku|bokka)\b", 0.92),
        ]

        # 5. Positive Social Sentiment Lexicon
        self.positive_words = {
            "great", "amazing", "excellent", "awesome", "proud", "congratulations",
            "congrats", "love", "wonderful", "fantastic", "brilliant", "inspiring",
            "support", "safe", "kind", "helpful", "innovation", "innovative",
            "excited", "success", "celebrate", "community", "upstander", "respect"
        }

        # 6. Negative Sentiment Lexicon
        self.negative_words = {
            "bad", "terrible", "awful", "horrible", "hate", "worst", "angry",
            "upset", "sad", "disappointed", "annoyed", "frustrated", "failed",
            "poor", "pain", "hurt", "scam", "corrupt", "cheat", "disaster"
        }

    def analyze(self, text: str, author_handle: str = "@user") -> Dict[str, Any]:
        """
        Executes end-to-end NLP cyberbullying and sentiment analysis on the text.
        """
        cleaned_text = text.strip()
        lower_text = cleaned_text.lower()

        flagged_tokens: List[str] = []
        max_threat = 0.0
        max_harass = 0.0
        max_hate = 0.0
        max_insult = 0.0

        # Scan Threat Patterns
        for pattern, weight in self.threat_patterns:
            matches = re.findall(pattern, lower_text)
            if matches:
                flagged_tokens.extend([m if isinstance(m, str) else " ".join(m) for m in matches])
                max_threat = max(max_threat, weight)

        # Scan Harassment Patterns
        for pattern, weight in self.harassment_patterns:
            matches = re.findall(pattern, lower_text)
            if matches:
                flagged_tokens.extend([m if isinstance(m, str) else " ".join(m) for m in matches])
                max_harass = max(max_harass, weight)

        # Scan Hate Speech Patterns
        for pattern, weight in self.hate_speech_patterns:
            matches = re.findall(pattern, lower_text)
            if matches:
                flagged_tokens.extend([m if isinstance(m, str) else " ".join(m) for m in matches])
                max_hate = max(max_hate, weight)

        # Scan Insult Patterns
        for pattern, weight in self.insult_patterns:
            matches = re.findall(pattern, lower_text)
            if matches:
                flagged_tokens.extend([m if isinstance(m, str) else " ".join(m) for m in matches])
                max_insult = max(max_insult, weight)

        # Remove duplicate flagged tokens
        unique_tokens = list(dict.fromkeys([t.strip() for t in flagged_tokens if t.strip()]))

        # Category attribution
        category_scores = {
            "THREAT": max_threat,
            "HARASSMENT": max_harass,
            "HATE_SPEECH": max_hate,
            "INSULT": max_insult
        }

        top_category = max(category_scores, key=category_scores.get)
        top_score = category_scores[top_category]

        is_bullying = top_score >= 0.70
        toxicity_type = top_category if is_bullying else "CLEAN"
        toxicity_score = top_score if is_bullying else round(max(0.01, min(0.15, len(unique_tokens) * 0.05)), 2)

        # Determine Risk Level
        if toxicity_score >= 0.92:
            risk_level = "CRITICAL"
        elif toxicity_score >= 0.75:
            risk_level = "HIGH"
        elif toxicity_score >= 0.50:
            risk_level = "MEDIUM"
        elif toxicity_score >= 0.25:
            risk_level = "LOW"
        else:
            risk_level = "SAFE"

        # Sentiment Analysis
        sentiment, sentiment_score = self._compute_sentiment(lower_text, is_bullying, toxicity_score)

        # Moderation Recommendation
        recommendation = self._generate_recommendation(risk_level, toxicity_type, author_handle)

        return {
            "is_bullying": is_bullying,
            "toxicity_score": round(toxicity_score, 2),
            "toxicity_type": toxicity_type,
            "risk_level": risk_level,
            "sentiment": sentiment,
            "sentiment_score": round(sentiment_score, 2),
            "flagged_tokens": unique_tokens,
            "recommended_action": recommendation,
            "probabilities": {
                "harassment": round(max_harass, 2),
                "threat": round(max_threat, 2),
                "hate_speech": round(max_hate, 2),
                "insult": round(max_insult, 2)
            }
        }

    def _compute_sentiment(self, lower_text: str, is_bullying: bool, toxicity_score: float) -> Tuple[str, float]:
        """Calculates polarity score from -1.0 to +1.0."""
        if is_bullying:
            score = -0.70 - (toxicity_score * 0.28)
            return "negative", max(-1.0, score)

        words = re.findall(r"\w+", lower_text)
        pos_hits = sum(1 for w in words if w in self.positive_words)
        neg_hits = sum(1 for w in words if w in self.negative_words)

        if pos_hits > neg_hits:
            score = min(0.95, 0.40 + (pos_hits * 0.20))
            return "positive", score
        elif neg_hits > pos_hits:
            score = max(-0.95, -0.30 - (neg_hits * 0.20))
            return "negative", score
        else:
            return "neutral", 0.05

    def _generate_recommendation(self, risk_level: str, toxicity_type: str, author_handle: str) -> str:
        """Formulates actionable community moderation recommendations."""
        if risk_level == "CRITICAL":
            return f"[CRITICAL ALERT] Immediate Strike 3 Escalation on {author_handle}. Terminate session and notify cyber law authorities for physical safety threat."
        elif risk_level == "HIGH":
            return f"[HIGH RISK] Apply Strike 2 Suspension for {author_handle}. Suppress post reach and require appeal review."
        elif risk_level == "MEDIUM":
            return f"[MEDIUM CONCERN] Issue Strike 1 warning notification to {author_handle} regarding community anti-harassment guidelines."
        elif risk_level == "LOW":
            return f"[LOW RISK] Minor aggressive language detected. Monitor account activity for escalation patterns."
        else:
            return "[SAFE] Content meets safety guidelines. Normal broadcast permitted."


# Singleton instance for fast application-wide reuse
nlp_engine = CyberbullyNLPEngine()
