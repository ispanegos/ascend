"""Versioned engine configuration (spec §54).

Loads and validates the calibration file for an engine version. Every
threshold, weight and curve lives in configuration, never in code.
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from ..scoring.curves import Curve, CurveError, build_curve, interpolate

ATTRIBUTES: tuple[str, ...] = ("endurance", "strength", "power", "core", "mobility", "agility", "recovery")
WEIGHT_TOLERANCE = 1e-6
CONFIG_DIR = Path(__file__).parent


class ConfigError(ValueError):
    """The configuration is malformed; the engine refuses to run with it."""


@dataclass(frozen=True)
class Source:
    curve: str
    weight: float


@dataclass(frozen=True)
class Subdomain:
    name: str
    weight: float
    sources: tuple[Source, ...]
    # True when sources are alternative tests (the athlete does one of them),
    # so a missing alternative is not missing evidence.
    alternatives: bool = False


@dataclass(frozen=True)
class DecayRule:
    grace_days: float
    points_per_week: float
    retained_fraction: float


@dataclass(frozen=True)
class EngineConfig:
    engine_version: str
    calibration_status: str
    config_hash: str
    raw: dict
    scale: tuple[float, float]
    curves: dict[str, Curve]
    attributes: dict[str, tuple[Subdomain, ...]]
    confidence_weights: dict[str, float]
    verified_threshold: float
    default_repeatability: float
    repeatability_cv_tolerance: float
    recency_floor: float
    recency_window_days: float
    evidence_weights: dict[str, float]
    quality: dict[str, float]
    update_caps: dict[str, float]
    cap_for_source: dict[str, str]
    confidence_damping: float
    decay: dict[str, DecayRule]
    overall_weights: dict[str, float]
    overall_required: tuple[str, ...]
    weighted_mean_share: float
    lowest_three_share: float
    mixed_exponent: float
    initial_calibration_cap: float
    independent_observation_min_hours: float
    baseline_sources: tuple[str, ...]
    qualifying_sources: tuple[str, ...]
    required_any_subdomain: dict[str, tuple[str, ...]]
    missing_prior: dict[str, float]
    features: dict = field(default_factory=dict)

    def incline_factor(self, height_cm: float) -> float:
        points = tuple((float(x), float(y)) for x, y in self.features["F01"]["incline_equivalence"])
        return interpolate(points, height_cm)


def _number(section: dict, key: str, where: str, low: float | None = None, high: float | None = None) -> float:
    value = section.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ConfigError(f"{where}.{key} must be a number")
    if (low is not None and value < low) or (high is not None and value > high):
        raise ConfigError(f"{where}.{key}={value} outside {low}..{high}")
    return float(value)


def _weights(section: dict, where: str, keys: tuple[str, ...] | None = None) -> dict[str, float]:
    if not isinstance(section, dict) or not section:
        raise ConfigError(f"{where} must be a non-empty table")
    if keys is not None and set(section) != set(keys):
        raise ConfigError(f"{where} must define exactly {sorted(keys)}")
    weights = {k: _number(section, k, where, 0.0, 1.0) for k in section}
    if abs(sum(weights.values()) - 1.0) > WEIGHT_TOLERANCE:
        raise ConfigError(f"{where} weights must sum to 1 (got {sum(weights.values())})")
    return weights


def canonical_hash(data: object) -> str:
    text = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def parse_config(raw: dict) -> EngineConfig:
    """Validates a parsed configuration dictionary."""
    version = raw.get("engine_version")
    if not isinstance(version, str) or not version:
        raise ConfigError("engine_version is required")
    status = raw.get("calibration_status")
    if status not in ("provisional", "validated"):
        raise ConfigError("calibration_status must be 'provisional' or 'validated'")

    scale = (_number(raw["scale"], "min", "scale"), _number(raw["scale"], "max", "scale"))
    if scale[0] >= scale[1]:
        raise ConfigError("scale.min must be below scale.max")

    curves: dict[str, Curve] = {}
    for curve_id, definition in raw.get("curves", {}).items():
        # Every curve must explain itself for human review (CALIBRATION_AUDIT).
        for key in ("rationale", "weakness"):
            if not isinstance(definition.get(key), str) or not definition[key].strip():
                raise ConfigError(f"curves.{curve_id}.{key} is required")
        try:
            curves[curve_id] = build_curve(curve_id, definition, scale)
        except CurveError as error:
            raise ConfigError(str(error)) from error

    attributes: dict[str, tuple[Subdomain, ...]] = {}
    raw_attributes = raw.get("attributes", {})
    if set(raw_attributes) != set(ATTRIBUTES):
        raise ConfigError(f"attributes must define exactly {list(ATTRIBUTES)}")
    for attribute in ATTRIBUTES:
        subdomains = raw_attributes[attribute].get("subdomains", {})
        _weights({name: sd.get("weight") for name, sd in subdomains.items()}, f"attributes.{attribute}")
        parsed: list[Subdomain] = []
        for name, definition in subdomains.items():
            sources = []
            for source in definition.get("sources", []):
                curve_id = source.get("curve")
                if curve_id not in curves:
                    raise ConfigError(f"attributes.{attribute}.{name}: unknown curve {curve_id!r}")
                sources.append(Source(curve=curve_id, weight=_number(source, "weight", f"{attribute}.{name}", 0.0)))
            alternatives = definition.get("alternatives", False)
            if not isinstance(alternatives, bool):
                raise ConfigError(f"attributes.{attribute}.{name}.alternatives must be true or false")
            parsed.append(
                Subdomain(name=name, weight=float(definition["weight"]), sources=tuple(sources), alternatives=alternatives)
            )
        attributes[attribute] = tuple(parsed)

    confidence = raw["confidence"]
    decay = {}
    for attribute in ATTRIBUTES:
        rule = raw["decay"].get(attribute)
        if not isinstance(rule, dict):
            raise ConfigError(f"decay.{attribute} is required")
        decay[attribute] = DecayRule(
            grace_days=_number(rule, "grace_days", f"decay.{attribute}", 0.0),
            points_per_week=_number(rule, "points_per_week", f"decay.{attribute}", 0.0),
            retained_fraction=_number(rule, "retained_fraction", f"decay.{attribute}", 0.0, 1.0),
        )

    overall = raw["overall"]
    required = tuple(overall.get("required_attributes", []))
    if not set(required) <= set(ATTRIBUTES):
        raise ConfigError("overall.required_attributes must be attributes")
    shares = _number(overall, "weighted_mean_share", "overall", 0, 1) + _number(overall, "lowest_three_share", "overall", 0, 1)
    if abs(shares - 1.0) > WEIGHT_TOLERANCE:
        raise ConfigError("overall shares must sum to 1")

    caps = {k: _number(raw["update"]["caps"], k, "update.caps", 0.0, scale[1]) for k in raw["update"]["caps"]}
    cap_for_source = dict(raw["update"]["cap_for_source"])
    for source, cap in cap_for_source.items():
        if cap not in caps:
            raise ConfigError(f"update.cap_for_source.{source} names unknown cap {cap!r}")

    try:
        incline = raw["features"]["F01"]["incline_equivalence"]
        build_curve("features.F01.incline_equivalence", {
            "test": "F01", "feature": "incline_height_cm", "direction": "decreasing",
            "body_mass_mode": "none", "points": incline,
        }, (0.0, 1.0))
    except (KeyError, CurveError) as error:
        raise ConfigError(f"features.F01.incline_equivalence invalid: {error}") from error

    verified_threshold = _number(confidence, "verified_threshold", "confidence", 0.0, 1.0)
    cap = _number(confidence, "initial_calibration_cap", "confidence", 0.0, 1.0)
    if cap >= verified_threshold:
        raise ConfigError("confidence.initial_calibration_cap must be below verified_threshold: Spawn alone must not verify")

    verification = raw.get("verification", {})
    baseline = tuple(verification.get("baseline_sources", []))
    qualifying = tuple(verification.get("qualifying_sources", []))
    if not baseline or not qualifying or set(baseline) & set(qualifying):
        raise ConfigError("verification needs disjoint, non-empty baseline_sources and qualifying_sources")
    required_any: dict[str, tuple[str, ...]] = {}
    for attribute, names in verification.get("required_any_subdomain", {}).items():
        known = {sd.name for sd in attributes.get(attribute, ())}
        if attribute not in ATTRIBUTES or not names or not set(names) <= known:
            raise ConfigError(f"verification.required_any_subdomain.{attribute} names unknown subdomains")
        required_any[attribute] = tuple(names)

    priors = raw.get("estimation", {}).get("missing_prior", {})
    if set(priors) != set(ATTRIBUTES):
        raise ConfigError("estimation.missing_prior must define every attribute")
    missing_prior = {a: _number(priors, a, "estimation.missing_prior", scale[0] + 1e-9, scale[1]) for a in ATTRIBUTES}

    return EngineConfig(
        engine_version=version,
        calibration_status=status,
        config_hash=canonical_hash(raw),
        raw=raw,
        scale=scale,
        curves=curves,
        attributes=attributes,
        confidence_weights=_weights(confidence["weights"], "confidence.weights", ("coverage", "recency", "repeatability", "quality")),
        verified_threshold=verified_threshold,
        default_repeatability=_number(confidence, "default_repeatability", "confidence", 0.0, 1.0),
        repeatability_cv_tolerance=_number(confidence, "repeatability_cv_tolerance", "confidence", 1e-9),
        recency_floor=_number(raw["recency"], "floor", "recency", 0.0, 1.0),
        recency_window_days=_number(raw["recency"], "window_days", "recency", 1.0),
        evidence_weights={k: _number(raw["evidence"]["weights"], k, "evidence.weights", 0.0, 1.0) for k in raw["evidence"]["weights"]},
        quality={k: _number(raw["evidence"]["quality"], k, "evidence.quality", 0.0, 1.0) for k in raw["evidence"]["quality"]},
        update_caps=caps,
        cap_for_source=cap_for_source,
        confidence_damping=_number(raw["update"], "confidence_damping", "update", 0.0, 1.0),
        decay=decay,
        overall_weights=_weights(overall["weights"], "overall.weights", ATTRIBUTES),
        overall_required=required,
        weighted_mean_share=float(overall["weighted_mean_share"]),
        lowest_three_share=float(overall["lowest_three_share"]),
        mixed_exponent=_number(raw["normalization"], "mixed_exponent", "normalization", 0.0, 1.0),
        initial_calibration_cap=cap,
        independent_observation_min_hours=_number(confidence, "independent_observation_min_hours", "confidence", 0.0),
        baseline_sources=baseline,
        qualifying_sources=qualifying,
        required_any_subdomain=required_any,
        missing_prior=missing_prior,
        features=raw.get("features", {}),
    )


def config_path(version: str) -> Path:
    return CONFIG_DIR / f"v{version.replace('.', '_')}.toml"


def load_config(version: str = "0.1.1") -> EngineConfig:
    path = config_path(version)
    if not path.exists():
        raise ConfigError(f"no configuration for engine version {version}")
    with path.open("rb") as handle:
        raw = tomllib.load(handle)
    config = parse_config(raw)
    if config.engine_version != version:
        raise ConfigError(f"{path.name} declares engine_version {config.engine_version}, expected {version}")
    return config
