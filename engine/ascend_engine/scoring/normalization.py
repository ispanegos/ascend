"""Body-size normalization (Milestone 3 brief §3).

Each curve declares its mode; nothing is divided by body mass by default.
Profile demographics are never used as a shortcut to estimate ability.
"""

from __future__ import annotations

from dataclasses import dataclass


class NormalizationError(ValueError):
    """A mode needs data that is not available."""


@dataclass(frozen=True)
class Normalized:
    raw: float
    value: float
    mode: str
    body_mass_kg: float | None


def normalize(raw: float, mode: str, body_mass_kg: float | None, mixed_exponent: float) -> Normalized:
    if mode in ("none", "absolute"):
        return Normalized(raw=raw, value=raw, mode=mode, body_mass_kg=None)
    if body_mass_kg is None or body_mass_kg <= 0:
        raise NormalizationError(f"'{mode}' normalization needs body mass")
    if mode == "relative":
        return Normalized(raw=raw, value=raw / body_mass_kg, mode=mode, body_mass_kg=body_mass_kg)
    if mode == "mixed":
        return Normalized(raw=raw, value=raw / body_mass_kg**mixed_exponent, mode=mode, body_mass_kg=body_mass_kg)
    raise NormalizationError(f"unknown normalization mode {mode!r}")
