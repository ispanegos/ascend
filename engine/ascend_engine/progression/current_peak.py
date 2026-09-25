"""Current, provisional Peak and verified Peak (spec §7, Milestone 3.1 §5).

* Current — best current estimate; can move either way.
* Provisional Peak — highest Current ever recorded, verified or not. A
  historical maximum, not a claim of verified capability.
* Verified Peak — highest Current recorded while the Stat was VERIFIED.
  This is the Peak the product may present as proven.

Neither Peak ever decreases or decays.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Peaks:
    current: float | None
    provisional_peak: float | None
    verified_peak: float | None
    provisional_updated: bool
    verified_updated: bool


def _higher(previous: float | None, candidate: float | None) -> tuple[float | None, bool]:
    if candidate is None or (previous is not None and candidate <= previous):
        return previous, False
    return candidate, True


def resolve_peaks(
    current: float | None,
    confidence: float,
    previous_provisional: float | None,
    previous_verified: float | None,
    verified_threshold: float,
    evidence_valid: bool = True,
) -> Peaks:
    candidate = current if evidence_valid else None
    provisional, provisional_updated = _higher(previous_provisional, candidate)
    verified_candidate = candidate if confidence >= verified_threshold else None
    verified, verified_updated = _higher(previous_verified, verified_candidate)
    # The provisional maximum always includes every verified maximum.
    provisional, extra = _higher(provisional, verified)
    return Peaks(current, provisional, verified, provisional_updated or extra, verified_updated)
