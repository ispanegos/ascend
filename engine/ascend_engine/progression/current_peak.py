"""Current and Peak (spec §7).

Current is the best current estimate and can move either way. Peak is the
highest *verified* Current and never decreases or decays.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CurrentPeak:
    current: float | None
    peak: float | None
    peak_updated: bool


def resolve_peak(
    current: float | None,
    confidence: float,
    previous_peak: float | None,
    verified_threshold: float,
    evidence_valid: bool = True,
) -> CurrentPeak:
    peak = previous_peak
    updated = False
    if (
        current is not None
        and evidence_valid
        and confidence >= verified_threshold
        and (previous_peak is None or current > previous_peak)
    ):
        peak = current
        updated = True
    return CurrentPeak(current=current, peak=peak, peak_updated=updated)
