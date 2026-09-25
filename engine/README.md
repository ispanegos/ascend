# ASCEND Engine

Python package that owns all domain calculations (spec §45): scoring curves,
feature extraction, attribute aggregation, Confidence, Overall, Current/Peak,
evidence updates, decay, Quest generation and Boss Readiness.

**Not started.** Implemented in Milestone 3, after the Milestone 2
raw-evidence model is stable (spec §70.7). See
[`docs/IMPLEMENTATION_PLAN.md`](../docs/IMPLEMENTATION_PLAN.md).

Planned layout (spec §44):

```text
engine/
├── ascend_engine/
│   ├── assessment/
│   ├── scoring/
│   ├── confidence/
│   ├── progression/
│   ├── quests/
│   ├── bosses/
│   ├── recovery/
│   └── config/
└── tests/
```
