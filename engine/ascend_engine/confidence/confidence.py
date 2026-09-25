"""Confidence (spec §6): how certain ASCEND is, not how good the athlete is.

confidence = w_cov * coverage + w_rec * recency + w_rep * repeatability + w_q * quality
clamped to 0..1. Every component is returned for the calculation trace.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, pstdev

from ..config import EngineConfig


@dataclass(frozen=True)
class ConfidenceBreakdown:
    coverage: float
    recency: float
    repeatability: float
    quality: float
    value: float

    def as_dict(self) -> dict[str, float]:
        return {
            "coverage": self.coverage,
            "recency": self.recency,
            "repeatability": self.repeatability,
            "quality": self.quality,
            "value": self.value,
        }


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def recency_factor(days_since: float, grace_days: float, cfg: EngineConfig) -> float:
    """1.0 inside the grace period, then linear down to the configured floor."""
    if days_since <= grace_days:
        return 1.0
    progress = min(1.0, (days_since - grace_days) / cfg.recency_window_days)
    return 1.0 - progress * (1.0 - cfg.recency_floor)


def repeatability(observations: list[float], cfg: EngineConfig) -> float:
    """Consistency of comparable observations; default until two exist (spec §6)."""
    if len(observations) < 2:
        return cfg.default_repeatability
    average = mean(observations)
    if average <= 0:
        return cfg.default_repeatability
    cv = pstdev(observations) / average
    return clamp01(1.0 - cv / cfg.repeatability_cv_tolerance)


def combine(coverage: float, recency: float, repeat: float, quality: float, cfg: EngineConfig) -> ConfidenceBreakdown:
    w = cfg.confidence_weights
    value = clamp01(
        w["coverage"] * coverage + w["recency"] * recency + w["repeatability"] * repeat + w["quality"] * quality
    )
    return ConfidenceBreakdown(coverage=coverage, recency=recency, repeatability=repeat, quality=quality, value=value)


def status_for(score: float | None, confidence: float, cfg: EngineConfig) -> str:
    if score is None:
        return "unranked"
    return "verified" if confidence >= cfg.verified_threshold else "provisional"
