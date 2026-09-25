# ASCEND Engine

Pure, deterministic Python package that turns immutable raw evidence into
versioned, explainable Stats (spec §3–§8, §15–§17, §45). No database access,
no UI concerns, no third-party runtime dependencies (Python ≥ 3.11).

```text
RAW EVIDENCE → evidence/parsing → assessment/features → scoring/normalization
→ scoring/curves → aggregation/attributes (subdomains → attribute)
→ confidence → aggregation/overall → progression (Current/Peak) → trace
```

| Module | Responsibility |
|---|---|
| `config/` | Versioned calibration (`v0_1_1.toml`) + validation. `calibration_status = "provisional"` |
| `evidence/parsing.py` | Raw payloads → typed records. Never invents values |
| `assessment/features.py` | Test-specific feature extraction (M01–E04) |
| `scoring/curves.py` | Monotonic piecewise-linear and categorical curves |
| `scoring/normalization.py` | `none` / `absolute` / `relative` / `mixed` body-size modes |
| `aggregation/attributes.py` | Subdomain scores, conservative missing-evidence estimate, temporal repeatability, verification + calibration cap |
| `confidence/confidence.py` | Coverage, recency, repeatability, quality |
| `aggregation/overall.py` | Overall (spec §8) |
| `progression/` | Provisional/verified Peak, conservative updates with caps, decay |
| `audit.py` | Generates `docs/CALIBRATION_AUDIT_v0.1.md` from the config |
| `engine.py` | Pipeline + calculation trace |

The v0.1 curves are **internal calibration**, not population norms,
percentiles, rankings or medical thresholds.

## Use

```bash
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"   # dev only: pytest
.venv/bin/python -m pytest                                 # unit + integration tests
.venv/bin/python -m ascend_engine validate-config
.venv/bin/python -m ascend_engine calculate < input.json      # JSON in → JSON out
.venv/bin/python -m ascend_engine serve --port 8765           # POST /v1/calculate
.venv/bin/python -m fixtures.report                           # synthetic athletes A–L
.venv/bin/python -m ascend_engine audit > ../docs/CALIBRATION_AUDIT_v0.1.md
```

The web app runs it as a subprocess locally, or over HTTP when
`ASCEND_ENGINE_URL` is set (ADR-024). Changing the configuration requires a
new engine version (ADR-025).
