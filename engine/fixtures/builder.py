"""Builds engine input in exactly the shape the Spawn database writes.

`raw_payload` mirrors private.evidence_payload(): protocol_version, source,
variant, data, pain_reported and attempts with SI-named columns.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

BASE_TIME = datetime(2026, 9, 20, 9, 0, tzinfo=timezone.utc)
_TEST_ORDER = ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "F01", "F02", "F03", "F04", "F05", "F06", "E01", "E02", "E03", "E04"]


def attempt(n: int = 1, side: str = "none", data: dict | None = None, **columns: object) -> dict:
    return {"attempt_number": n, "side": side, "data": data or {}, **columns}


@dataclass
class Spawn:
    """Collects one athlete's Spawn results."""

    athlete_id: str
    body_mass_kg: float | None
    evidence: list[dict] = field(default_factory=list)
    gaps: list[dict] = field(default_factory=list)

    def test(
        self,
        test_key: str,
        attempts: list[dict],
        *,
        variant: str | None = None,
        data: dict | None = None,
        pain: bool = False,
        source: str = "manual",
        days_after: float = 0.0,
        hours_after: float = 0.0,
        source_type: str = "spawn_test",
    ) -> "Spawn":
        index = _TEST_ORDER.index(test_key)
        # Movement day 0, Frame day 2, Engine day 4: realistic multi-day Spawn.
        day = {"M": 0, "F": 2, "E": 4}[test_key[0]]
        occurred = BASE_TIME + timedelta(days=day + days_after, hours=hours_after, minutes=index * 6)
        self.evidence.append(
            {
                "id": f"{self.athlete_id}-{test_key}-{len(self.evidence) + 1}",
                "test_key": test_key,
                "source_type": source_type,
                "occurred_at": occurred.isoformat().replace("+00:00", "Z"),
                "raw_payload": {
                    "protocol_version": "0.1.0",
                    "source": source,
                    "source_ref": None,
                    "variant": variant,
                    "data": data or {},
                    "pain_reported": pain,
                    "attempts": attempts,
                },
            }
        )
        return self

    def gap(self, test_key: str, status: str, reason_code: str | None) -> "Spawn":
        self.gaps.append({"test_key": test_key, "status": status, "reason_code": reason_code})
        return self

    def payload(self, **extra: object) -> dict:
        return {
            "schema_version": 1,
            "athlete": {"id": self.athlete_id, "body_mass_kg": self.body_mass_kg, "height_cm": None, "age_years": None, "sex": None},
            "evidence": list(self.evidence),
            "gaps": list(self.gaps),
            **extra,
        }
