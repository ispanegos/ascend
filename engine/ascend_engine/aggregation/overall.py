"""Overall (spec §8).

weightedMean = Σ w_a · Stat_a over available Stats (weights renormalized)
lowestThree  = mean of the three lowest available Stats
Overall      = 0.80 · weightedMean + 0.20 · lowestThree

UNRANKED until every required attribute has a score. A missing Stat is
left out — never treated as zero.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean

from ..config import EngineConfig
from ..confidence.confidence import status_for


@dataclass(frozen=True)
class OverallResult:
    score: float | None
    confidence: float
    status: str
    participating: tuple[str, ...]
    missing_required: tuple[str, ...]
    weighted_mean: float | None
    lowest_three: float | None
    lowest_three_attributes: tuple[str, ...]
    renormalized_weights: dict[str, float]


def calculate_overall(stats: dict[str, tuple[float | None, float]], cfg: EngineConfig) -> OverallResult:
    """`stats` maps attribute → (score or None, confidence)."""
    available = {a: v for a, v in stats.items() if v[0] is not None}
    missing_required = tuple(a for a in cfg.overall_required if a not in available)
    if missing_required or not available:
        return OverallResult(None, 0.0, "unranked", tuple(sorted(available)), missing_required, None, None, (), {})

    total = sum(cfg.overall_weights[a] for a in available)
    weights = {a: cfg.overall_weights[a] / total for a in available}
    weighted_mean = sum((available[a][0] or 0.0) * weights[a] for a in available)
    lowest = sorted(available, key=lambda a: (available[a][0], a))[:3]
    lowest_three = mean(available[a][0] or 0.0 for a in lowest)
    score = cfg.weighted_mean_share * weighted_mean + cfg.lowest_three_share * lowest_three
    confidence = sum(available[a][1] * weights[a] for a in available)
    return OverallResult(
        score=score,
        confidence=confidence,
        status=status_for(score, confidence, cfg),
        participating=tuple(a for a in cfg.overall_weights if a in available),
        missing_required=(),
        weighted_mean=weighted_mean,
        lowest_three=lowest_three,
        lowest_three_attributes=tuple(lowest),
        renormalized_weights=weights,
    )
