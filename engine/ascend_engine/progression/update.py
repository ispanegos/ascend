"""Conservative evidence update (spec §16).

effectiveWeight = evidenceWeight · quality · confidenceAdjustment
candidate       = Current + effectiveWeight · (Observed − Current)
delta           = clamp(candidate − Current, ±cap for the evidence source)

Completing an activity never adds points by itself: without an observed
score there is no update.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..config import EngineConfig


class UpdateError(ValueError):
    pass


@dataclass(frozen=True)
class UpdateResult:
    previous: float
    observed: float
    new_current: float
    effective_weight: float
    uncapped_delta: float
    applied_delta: float
    cap: float
    capped: bool
    evidence_weight: float
    quality: float
    confidence_adjustment: float

    def as_dict(self) -> dict[str, float | bool]:
        return dict(self.__dict__)


def update_current(
    current: float | None,
    observed: float,
    *,
    source_type: str,
    quality: float,
    current_confidence: float,
    cfg: EngineConfig,
) -> UpdateResult:
    if current is None:
        # Spec §16: a null Current is initialized by assessment aggregation, not this rule.
        raise UpdateError("Current is unknown; initialize it from an assessment instead")
    if source_type not in cfg.evidence_weights or source_type not in cfg.cap_for_source:
        raise UpdateError(f"unknown evidence source {source_type!r}")
    low, high = cfg.scale
    if not low <= observed <= high:
        raise UpdateError(f"observed score {observed} outside {low}..{high}")

    weight = cfg.evidence_weights[source_type]
    adjustment = 1.0 - cfg.confidence_damping * max(0.0, min(1.0, current_confidence))
    effective = max(0.0, min(1.0, weight * max(0.0, min(1.0, quality)) * adjustment))
    uncapped = effective * (observed - current)
    cap = cfg.update_caps[cfg.cap_for_source[source_type]]
    applied = max(-cap, min(cap, uncapped))
    new_current = max(low, min(high, current + applied))
    return UpdateResult(
        previous=current,
        observed=observed,
        new_current=new_current,
        effective_weight=effective,
        uncapped_delta=uncapped,
        applied_delta=new_current - current,
        cap=cap,
        capped=abs(uncapped) > cap,
        evidence_weight=weight,
        quality=quality,
        confidence_adjustment=adjustment,
    )
