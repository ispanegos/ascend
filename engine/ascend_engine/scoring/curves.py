"""Versioned scoring curves (spec §4).

Monotonic piecewise-linear interpolation between configured points. Outside
the configured range the end score is held: the engine never extrapolates
beyond what calibration describes. Categorical curves map a recorded
category straight to a score.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Direction = Literal["increasing", "decreasing"]
BodyMassMode = Literal["none", "absolute", "relative", "mixed"]
BODY_MASS_MODES: tuple[str, ...] = ("none", "absolute", "relative", "mixed")


class CurveError(ValueError):
    """A curve definition is malformed."""


@dataclass(frozen=True)
class Curve:
    id: str
    test: str
    feature: str
    kind: Literal["numeric", "categorical"]
    direction: Direction
    body_mass_mode: BodyMassMode
    points: tuple[tuple[float, float], ...] = ()
    categories: tuple[tuple[str, float], ...] = ()

    def score(self, value: float | str) -> float:
        if self.kind == "categorical":
            if not isinstance(value, str):
                raise CurveError(f"{self.id}: categorical curve needs a category, got {value!r}")
            for category, score in self.categories:
                if category == value:
                    return score
            raise CurveError(f"{self.id}: unknown category {value!r}")
        if isinstance(value, str):
            raise CurveError(f"{self.id}: numeric curve needs a number, got {value!r}")
        return interpolate(self.points, float(value))


def interpolate(points: tuple[tuple[float, float], ...], x: float) -> float:
    """Piecewise-linear interpolation, holding the end values outside the range."""
    if not points:
        raise CurveError("no points")
    if x <= points[0][0]:
        return points[0][1]
    if x >= points[-1][0]:
        return points[-1][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    raise CurveError("unreachable: x inside range but no segment matched")  # pragma: no cover


def build_curve(curve_id: str, raw: dict, scale: tuple[float, float]) -> Curve:
    """Validates one curve definition from configuration."""
    low, high = scale
    for key in ("test", "feature"):
        if not isinstance(raw.get(key), str) or not raw[key]:
            raise CurveError(f"{curve_id}: missing '{key}'")

    if raw.get("kind") == "categorical":
        mapping = raw.get("map")
        if not isinstance(mapping, dict) or not mapping:
            raise CurveError(f"{curve_id}: categorical curve needs a non-empty 'map'")
        categories = []
        for category, score in mapping.items():
            if not isinstance(score, (int, float)) or not low <= score <= high:
                raise CurveError(f"{curve_id}: score for {category!r} must be within {low}..{high}")
            categories.append((str(category), float(score)))
        return Curve(
            id=curve_id,
            test=raw["test"],
            feature=raw["feature"],
            kind="categorical",
            direction="increasing",
            body_mass_mode="none",
            categories=tuple(categories),
        )

    direction = raw.get("direction")
    if direction not in ("increasing", "decreasing"):
        raise CurveError(f"{curve_id}: direction must be 'increasing' or 'decreasing'")
    mode = raw.get("body_mass_mode")
    if mode not in BODY_MASS_MODES:
        raise CurveError(f"{curve_id}: body_mass_mode must be one of {BODY_MASS_MODES}")

    raw_points = raw.get("points")
    if not isinstance(raw_points, list) or len(raw_points) < 2:
        raise CurveError(f"{curve_id}: needs at least two points")
    points: list[tuple[float, float]] = []
    for point in raw_points:
        if (
            not isinstance(point, list)
            or len(point) != 2
            or not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in point)
        ):
            raise CurveError(f"{curve_id}: every point must be [raw, score]")
        points.append((float(point[0]), float(point[1])))

    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x1 <= x0:
            raise CurveError(f"{curve_id}: raw values must strictly increase ({x0} then {x1})")
        if direction == "increasing" and y1 < y0:
            raise CurveError(f"{curve_id}: scores must not decrease on an increasing curve")
        if direction == "decreasing" and y1 > y0:
            raise CurveError(f"{curve_id}: scores must not increase on a decreasing curve")
    for _, y in points:
        if not low <= y <= high:
            raise CurveError(f"{curve_id}: score {y} outside {low}..{high}")

    return Curve(
        id=curve_id,
        test=raw["test"],
        feature=raw["feature"],
        kind="numeric",
        direction=direction,
        body_mass_mode=mode,
        points=tuple(points),
    )
