# Audit Note — AISemiconductorFabYieldOptimizer

## Original audit recommendations (batch_07.md §27)

**Missing AI endpoints:** `/yield-prediction`, `/root-cause-analysis`, `/process-optimization`, `/defect-prediction`, `/equipment-health-forecast`, `/recipe-recommendation`.

**Missing non-AI features:** process parameter tracking, batch/lot traceability, equipment calibration tracking, SPC charting, fab equipment integration, shift log management.

**Custom suggestions:** yield prediction by parameters, RCA automation, recipe optimization, predictive maintenance, defect pattern recognition, multi-objective optimization.

Note: audit said "0 AI endpoints"; reality already has `/yield-predictions/predict`, `/root-cause-analysis/analyze`, `/wafer-defects/*` (with vision), `/process-parameters/*` AI flows, `/equipment-matching/*`, `/spc-alerts/*`, `/excursions/*`. Fab is more like a partial-build than a clone.

## Implemented this pass (3 mechanical)
1. `POST /api/yield-predictions/process-optimization` — Pareto-optimal parameter adjustments to hit a target yield.
2. `POST /api/yield-predictions/defect-prediction` — predicted defect class rates with mitigation per class.
3. `POST /api/yield-predictions/equipment-health-forecast` — N-day equipment health forecast + PM schedule + parts-to-stage.

All three reuse `callOpenRouter` + `parseAIJson` from `aiHelper`. Syntax-checked.

## Backlog (prioritized)
1. `POST /api/process-recipes/recommend` (mechanical follow-up).
2. SPC charting endpoints (mechanical).
3. Equipment calibration tracking domain (mechanical CRUD).
4. Fab equipment integration (NEEDS-CREDS — SECS/GEM, MES vendors).
5. Shift log management (mechanical).

## Apply pass 3 (frontend)

LEFT-AS-IS. FE already complete: dedicated pages exist for all three new endpoints — `frontend/src/pages/ProcessOptimizationPage.js` calls `/yield-predictions/process-optimization`, `frontend/src/pages/DefectPredictionPage.js` calls `/yield-predictions/defect-prediction`, `frontend/src/pages/EquipmentHealthForecastPage.js` calls `/yield-predictions/equipment-health-forecast`. All routed via `services/api.js` (JWT Bearer from localStorage) and registered in `App.js` behind `PrivateRoute`. No changes needed (idempotence rule).

## Apply pass 4 (mechanical backlog)

Mechanical items only — skipped NEEDS-CREDS (SECS/GEM, MES vendor integrations).

BE additions (existing `aiHelper.callOpenRouter` + `parseAIJson`, 503-on-no-key, auth via `authMiddleware` mount in server.js):
- `POST /api/process-recipes/recommend` — LLM-grounded recipe recommendation using top-5 same-process-type recipes as context. Persists to `ai_results`.
- `POST /api/yield-predictions/multi-objective-optimize` — Pareto frontier across user-supplied objectives (yield/throughput/cost/quality), with weighted recommendation indices and infeasible-combination flags.
- `POST /api/shift-logs/digest` — new auto-mounted route file `backend/routes/shiftLogs.js`. Aggregates raw shift entries into structured handoff: events, anomalies, KPIs, follow-ups, equipment state changes. 80KB body cap. Persists to `ai_results`.

FE additions in `frontend/src/pages/`:
- `ProcessRecipesPage.js` — already wired the `/recommend` flow with toast and `AIResultDisplay`.
- `MultiObjectiveOptimizePage.js` — new page with JSON form for `current_state`, `objectives`, `constraints`, `candidate_levers`. Routes to `/multi-objective-optimize`.
- `ShiftLogDigestPage.js` — new page for `shift_label`, `raw_log_entries`, `context`. Routes to `/shift-log-digest`.
- Pages registered in `App.js` behind `PrivateRoute`. All call `services/api.js` (JWT Bearer auto-injected) and surface 503 with explicit toast text.

Total: 3 mechanical features (1 prior pass-4 + 2 new in this pass). `node --check` clean for both modified and new BE files.

Backlog still mechanical-but-out-of-scope-for-this-pass: equipment calibration tracking (CRUD-only, non-AI). NEEDS-CREDS items unchanged.
