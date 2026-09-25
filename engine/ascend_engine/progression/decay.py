"""Detraining (spec §17). Conservative; never daily punishment.

Inside the grace period nothing changes. After it, Current may regress by
at most `points_per_week` for each full week, and never below
`retained_fraction` of the Current at the last relevant evidence. Decay is
a pure function of time since that evidence, so recalculating never
compounds it. Peak is never passed to this module.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..config import EngineConfig


@dataclass(frozen=True)
class DecayResult:
    current: float
    regressed_by: float
    floor: float
    days_since_evidence: float
    in_grace: bool


def decayed_current(attribute: str, current_at_evidence: float, days_since_evidence: float, cfg: EngineConfig) -> DecayResult:
    rule = cfg.decay[attribute]
    floor = current_at_evidence * rule.retained_fraction
    if days_since_evidence <= rule.grace_days or rule.points_per_week == 0:
        return DecayResult(current_at_evidence, 0.0, floor, days_since_evidence, days_since_evidence <= rule.grace_days)
    full_weeks = int((days_since_evidence - rule.grace_days) // 7)
    decayed = max(floor, current_at_evidence - full_weeks * rule.points_per_week)
    return DecayResult(decayed, current_at_evidence - decayed, floor, days_since_evidence, False)
