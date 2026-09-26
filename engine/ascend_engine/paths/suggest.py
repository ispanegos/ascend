"""Advisory Path suggestions (spec §18, ADR-041).

Pure and deterministic. Uses only what ASCEND knows — each attribute's
latest Current, Confidence and status — never goals, sports or preferences
the athlete did not give. It suggests; it never persists, applies, or
changes a Stat. The athlete always decides.

Rules `paths-0.1`:
1. Comparable attributes are ranked and have Confidence >= 0.50. Ranked
   attributes below that are named in a note, not compared.
2. Fewer than three comparable attributes: no comparison-based suggestion.
3. PRIMARY: the lowest comparable Current (ties: attribute order), measured
   against the median of comparable Currents ("the middle of your profile").
4. SECONDARY (<= 1): the next-lowest comparable attribute, only if it is at
   least 5 points below the middle.
5. SECONDARY (<= 1), only alongside a PRIMARY: the first Unranked
   attribute — no evidence yet; choosing it does not rank it.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import median

PATH_RULES_VERSION = "paths-0.1"
ATTRIBUTES = ("endurance", "strength", "power", "core", "mobility", "agility", "recovery")
LABELS = {a: a.capitalize() for a in ATTRIBUTES}
COMPARABLE_CONFIDENCE = 0.50
NOTABLE_GAP = 5.0
MIN_COMPARABLE = 3


class PathInputError(ValueError):
    """The input does not describe an initialized athlete's Stats."""


@dataclass(frozen=True)
class StatState:
    attribute: str
    current: float | None
    confidence: float
    status: str


def _parse(payload: object) -> list[StatState]:
    if not isinstance(payload, dict) or not isinstance(payload.get("stats"), dict):
        raise PathInputError("payload must be an object with a 'stats' object")
    stats = payload["stats"]
    parsed = []
    for attribute in ATTRIBUTES:
        raw = stats.get(attribute)
        if not isinstance(raw, dict):
            raise PathInputError(f"stats.{attribute} is required")
        current = raw.get("current")
        confidence = raw.get("confidence", 0)
        if current is not None and (isinstance(current, bool) or not isinstance(current, (int, float)) or not 0 <= current <= 100):
            raise PathInputError(f"stats.{attribute}.current must be null or 0..100")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
            raise PathInputError(f"stats.{attribute}.confidence must be 0..1")
        parsed.append(StatState(attribute, None if current is None else float(current), float(confidence), str(raw.get("status", ""))))
    return parsed


def _round(value: float) -> int:
    """Whole numbers in explanations, like the UI (spec §3)."""
    return int(round(value))


def suggest_paths(payload: object) -> dict:
    stats = _parse(payload)
    notes: list[str] = []
    suggestions: list[dict] = []

    ranked = [s for s in stats if s.current is not None]
    unranked = [s for s in stats if s.current is None]
    comparable = [s for s in ranked if s.confidence >= COMPARABLE_CONFIDENCE]
    for s in ranked:
        if s.confidence < COMPARABLE_CONFIDENCE:
            notes.append(
                f"{LABELS[s.attribute]} is not compared: Confidence {_round(s.confidence * 100)}% is too low to compare fairly."
            )

    if len(comparable) >= MIN_COMPARABLE:
        middle = median(s.current for s in comparable)  # type: ignore[misc]
        order = sorted(comparable, key=lambda s: (s.current, ATTRIBUTES.index(s.attribute)))
        lowest = order[0]
        gap = middle - lowest.current  # type: ignore[operator]
        if gap >= NOTABLE_GAP:
            reason = (
                f"{LABELS[lowest.attribute]} ({_round(lowest.current)}) is your least developed measured attribute, "
                f"{_round(gap)} points below the middle of your profile ({_round(middle)})."
            )
        else:
            reason = (
                f"Your measured attributes are close together. {LABELS[lowest.attribute]} ({_round(lowest.current)}) "
                "is the lowest, by a small margin."
            )
        suggestions.append(
            {
                "attribute": lowest.attribute,
                "priority": "primary",
                "reason": reason,
                "basis": {"current": lowest.current, "confidence": lowest.confidence, "profile_median": middle, "gap": gap},
            }
        )
        if len(order) > 1:
            second = order[1]
            second_gap = middle - second.current  # type: ignore[operator]
            if second_gap >= NOTABLE_GAP:
                suggestions.append(
                    {
                        "attribute": second.attribute,
                        "priority": "secondary",
                        "reason": (
                            f"{LABELS[second.attribute]} ({_round(second.current)}) is also {_round(second_gap)} points "
                            "below the middle of your profile."
                        ),
                        "basis": {
                            "current": second.current,
                            "confidence": second.confidence,
                            "profile_median": middle,
                            "gap": second_gap,
                        },
                    }
                )
    else:
        notes.append(
            f"Only {len(comparable)} attributes are measured with enough Confidence to compare; ASCEND needs at least "
            f"{MIN_COMPARABLE} to suggest a PRIMARY Path."
        )

    # Only alongside a PRIMARY, so the suggestions always form a valid configuration.
    if suggestions and unranked and sum(1 for s in suggestions if s["priority"] == "secondary") < 2:
        first = unranked[0]
        suggestions.append(
            {
                "attribute": first.attribute,
                "priority": "secondary",
                "reason": (
                    f"ASCEND has no evidence for {LABELS[first.attribute]} yet. Training it would establish a baseline; "
                    "choosing it does not rank it."
                ),
                "basis": {"current": None, "confidence": first.confidence, "profile_median": None, "gap": None},
            }
        )

    return {"rules_version": PATH_RULES_VERSION, "suggestions": suggestions, "notes": notes}
