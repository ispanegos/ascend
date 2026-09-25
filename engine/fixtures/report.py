"""Prints Stats for the synthetic athletes (Milestone 3 brief §19).

  engine/.venv/bin/python -m fixtures.report        (from engine/)
"""

from __future__ import annotations

from ascend_engine import calculate
from ascend_engine.config import ATTRIBUTES, load_config
from ascend_engine.progression.update import update_current

from .athletes import FIXTURES, athlete_b


def fmt(value: float | None) -> str:
    return "  —  " if value is None else f"{value:5.1f}"


def main() -> None:
    header = f"{'athlete':28} {'OVR':>5} " + " ".join(f"{a[:4].upper():>10}" for a in ATTRIBUTES)
    print(header)
    print("-" * len(header))
    for key, build in FIXTURES.items():
        out = calculate(build().payload())
        cells = []
        for attribute in ATTRIBUTES:
            stat = out["attributes"][attribute]
            cells.append(f"{fmt(stat['current'])} {stat['confidence'] * 100:3.0f}%")
        overall = out["overall"]
        print(f"{key + ' ' + build().athlete_id:28} {fmt(overall['current'])} " + " ".join(f"{c:>10}" for c in cells))
    print("\nEach cell: Current, Confidence. — = UNRANKED (unknown, not zero).")

    print("\nG — unexpectedly strong evidence against B's Endurance (observed 70):")
    cfg = load_config()
    base = calculate(athlete_b().payload())["attributes"]["endurance"]
    for source in ("workout", "wearable", "spawn_test", "boss"):
        result = update_current(
            base["current"], 70.0, source_type=source, quality=0.9, current_confidence=base["confidence"], cfg=cfg
        )
        print(
            f"  {source:11} {result.previous:5.1f} → {result.new_current:5.1f}"
            f"  (uncapped {result.uncapped_delta:+5.2f}, cap ±{result.cap:.0f}{', capped' if result.capped else ''})"
        )


if __name__ == "__main__":
    main()
