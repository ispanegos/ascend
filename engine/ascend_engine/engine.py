"""ASCEND Engine entry point (spec §15 pipeline).

RAW EVIDENCE → PARSE → FEATURES → NORMALIZATION → CURVES → SUBDOMAINS →
ATTRIBUTES → CONFIDENCE → OVERALL → CURRENT / PEAK → TRACE

`calculate` is a pure function of its input and the versioned configuration.
It reads no clock: `as_of` defaults to the newest evidence time, so
recalculating unchanged evidence always gives the same result.
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime

from .aggregation.attributes import AttributeResult, SourceScore, aggregate_attribute
from .aggregation.overall import calculate_overall
from .assessment.features import TestFeatures, derive_cross_test, extract
from .config import ATTRIBUTES, EngineConfig, canonical_hash, load_config
from .evidence.parsing import EvidenceError, parse_athlete, parse_evidence, parse_gap, parse_time
from .progression.current_peak import resolve_peak
from .version import ASCEND_ENGINE_VERSION

INPUT_SCHEMA_VERSION = 1
OUTPUT_DECIMALS = 4


def _round(value: object) -> object:
    """Rounds floats for a stable, readable output. Internal maths is unrounded."""
    if isinstance(value, float):
        return round(value, OUTPUT_DECIMALS)
    if isinstance(value, dict):
        return {k: _round(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_round(v) for v in value]
    return value


def _iso(at: datetime) -> str:
    return at.isoformat().replace("+00:00", "Z")


def _source_trace(source: SourceScore) -> dict:
    data = asdict(source)
    data["occurred_at"] = _iso(source.occurred_at)
    data["observations"] = len(source.history)
    del data["history"]
    return data


def _attribute_trace(
    result: AttributeResult,
    features: dict[str, TestFeatures],
    gaps: list[dict],
    peak_info: dict,
    as_of: datetime,
    cfg: EngineConfig,
) -> dict:
    tests = sorted({cfg.curves[s.curve].test for sd in cfg.attributes[result.attribute] for s in sd.sources})
    used_tests = sorted({src.test_key for sd in result.subdomains for src in sd.sources})
    return {
        "attribute": result.attribute,
        "engine_version": cfg.engine_version,
        "config_hash": cfg.config_hash,
        "calibration_status": cfg.calibration_status,
        "as_of": _iso(as_of),
        "inputs": [
            {"evidence_id": features[t].evidence_id, "test_key": t}
            for t in used_tests
            if t in features
        ],
        "features": {
            t: {
                "values": features[t].features,
                "pain": features[t].pain,
                "censored": features[t].censored,
                "category_estimate": features[t].category_estimate,
                "notes": features[t].notes,
            }
            for t in used_tests
            if t in features
        },
        "subdomain_scores": {
            sd.name: {
                "observed": sd.observed,
                "score": sd.score,
                "weight": sd.weight,
                "renormalized_weight": result.renormalized_weights.get(sd.name),
                "quality": sd.quality,
                "recency": sd.recency,
                "repeatability": sd.repeatability,
                "sources": [_source_trace(s) for s in sd.sources],
                "missing": sd.missing_sources,
            }
            for sd in result.subdomains
        },
        "missing_subdomains": [sd.name for sd in result.subdomains if not sd.observed],
        "gaps": [g for g in gaps if g["test_key"] in tests],
        "weights": {"configured": {sd.name: sd.weight for sd in result.subdomains}, "renormalized": result.renormalized_weights},
        "confidence": {
            **result.confidence.as_dict(),
            "weights": cfg.confidence_weights,
            "verified_threshold": cfg.verified_threshold,
        },
        "formula": {
            "score": "Σ renormalized_weight × subdomain_score over observed subdomains",
            "confidence": "0.45·coverage + 0.25·recency + 0.15·repeatability + 0.15·quality (weights from config)",
        },
        "result": {
            "score": result.score,
            "current": peak_info["current"],
            "peak": peak_info["peak"],
            "peak_updated": peak_info["peak_updated"],
            "confidence": result.confidence.value,
            "status": result.status,
        },
    }


def calculate(payload: dict, config: EngineConfig | None = None) -> dict:
    """Calculates every attribute and Overall from raw evidence.

    payload = {
      "schema_version": 1,
      "athlete": {"id", "body_mass_kg", "height_cm", "age_years", "sex"},
      "evidence": [{"id", "test_key", "source_type", "occurred_at", "raw_payload"}],
      "gaps": [{"test_key", "status", "reason_code"}],        # optional
      "previous": {"attributes": {attr: {"peak": float|null}}}, # optional
      "as_of": ISO timestamp                                    # optional
    }
    """
    cfg = config or load_config(ASCEND_ENGINE_VERSION)
    if not isinstance(payload, dict):
        raise EvidenceError("payload must be an object")
    if payload.get("schema_version", INPUT_SCHEMA_VERSION) != INPUT_SCHEMA_VERSION:
        raise EvidenceError(f"unsupported schema_version {payload.get('schema_version')}")

    athlete = parse_athlete(payload.get("athlete"))
    evidence = sorted((parse_evidence(e) for e in payload.get("evidence") or []), key=lambda e: (e.occurred_at, e.id))
    gaps = sorted(
        (parse_gap(g) for g in payload.get("gaps") or []),
        key=lambda g: (g.test_key, g.status, g.reason_code or ""),
    )

    if payload.get("as_of"):
        as_of = parse_time(payload["as_of"], "as_of")
    elif evidence:
        as_of = evidence[-1].occurred_at
    else:
        as_of = parse_time("1970-01-01T00:00:00Z", "as_of")

    # Features per evidence; the newest evidence per test is the "current" view.
    extracted = [(extract(e, cfg), e) for e in evidence]
    latest_by_test: dict[str, TestFeatures] = {}
    for features, _ in extracted:
        latest_by_test[features.test_key] = features
    derive_cross_test(latest_by_test)

    observations_by_test: dict[str, list] = {}
    for features, ev in extracted:
        observations_by_test.setdefault(ev.test_key, []).append((features, ev.source, ev.occurred_at))

    previous = (payload.get("previous") or {}).get("attributes") or {}
    gap_dicts = [asdict(g) for g in gaps]

    attributes: dict[str, dict] = {}
    for attribute in ATTRIBUTES:
        result = aggregate_attribute(attribute, observations_by_test, athlete.body_mass_kg, as_of, cfg)
        previous_peak = previous.get(attribute, {}).get("peak")
        peak = resolve_peak(
            result.score,
            result.confidence.value,
            float(previous_peak) if isinstance(previous_peak, (int, float)) else None,
            cfg.verified_threshold,
        )
        peak_info = {"current": peak.current, "peak": peak.peak, "peak_updated": peak.peak_updated}
        attributes[attribute] = {
            "attribute": attribute,
            "score": result.score,
            "current": peak.current,
            "peak": peak.peak,
            "peak_updated": peak.peak_updated,
            "confidence": result.confidence.value,
            "coverage": result.confidence.coverage,
            "status": result.status,
            "evidence_ids": result.evidence_ids,
            "trace": _attribute_trace(result, latest_by_test, gap_dicts, peak_info, as_of, cfg),
        }

    overall = calculate_overall({a: (v["current"], v["confidence"]) for a, v in attributes.items()}, cfg)
    overall_out = {
        "current": overall.score,
        "confidence": overall.confidence,
        "status": overall.status,
        "participating": list(overall.participating),
        "trace": {
            "engine_version": cfg.engine_version,
            "config_hash": cfg.config_hash,
            "as_of": _iso(as_of),
            "weighted_mean": overall.weighted_mean,
            "lowest_three": overall.lowest_three,
            "lowest_three_attributes": list(overall.lowest_three_attributes),
            "renormalized_weights": overall.renormalized_weights,
            "missing_required": list(overall.missing_required),
            "shares": {"weighted_mean": cfg.weighted_mean_share, "lowest_three": cfg.lowest_three_share},
            "inputs": {a: {"current": v["current"], "confidence": v["confidence"]} for a, v in attributes.items()},
            "formula": "0.80 × weightedMean + 0.20 × mean(three lowest available Stats); UNRANKED until required Stats exist",
        },
    }

    input_hash = canonical_hash(
        {
            "schema_version": INPUT_SCHEMA_VERSION,
            "athlete": asdict(athlete),
            "evidence": sorted(payload.get("evidence") or [], key=lambda e: str(e.get("id"))),
            "gaps": gap_dicts,
            "previous": previous,
            "as_of": _iso(as_of),
        }
    )

    return _round(
        {
            "engine_version": cfg.engine_version,
            "config_hash": cfg.config_hash,
            "calibration_status": cfg.calibration_status,
            "input_hash": input_hash,
            "as_of": _iso(as_of),
            "athlete_id": athlete.id,
            "attributes": attributes,
            "overall": overall_out,
            "gaps": gap_dicts,
            "evidence_ids": sorted(e.id for e in evidence),
        }
    )  # type: ignore[return-value]
