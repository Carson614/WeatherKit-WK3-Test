# Acceptance history

Append-only record of real-device acceptance for this independent experiment. The active Surge configuration is outside this record and was not changed.

## 2026-11-08 — Stable Candidate created

- **Status:** Waiting for the single candidate-level iPhone regression; historical acceptance below is inherited from the exact pinned script assets.
- **Source module:** `3558f8e4f28db4d996aa3221f65f262d34e0b5c8`.
- **Script asset commit:** `db1831ce06b0656e8ec4dfab3d4387abbee548f5`.
- **Candidate-only configuration change:** `WeatherAlerts.ExperimentalRaw1` defaults to `false`. No source or request/response bundle logic changed.
- **Rollback:** Disable this candidate and restore the fixed source module link in `README.md`; never run both overlapping modules together.

## 2026-11-08 — Gaizhou minute-snow rendering

- **Result:** Passed on iPhone Apple Weather in Gaizhou, Liaoning.
- **Diagnostic:** `WK3NH/5;...;result=injected`.
- **Visible behavior:** Snow recognized; “预报有雪” and “未来一小时持续降雪” displayed; native minute snowfall bars appeared and reflected changing intensity.
- **Regression checks observed:** US AQI and yesterday comparison remained normal; alerts remained intact and unmatched events retained Apple’s original details.
- **Accepted module commit:** `3558f8e4f28db4d996aa3221f65f262d34e0b5c8`.
- **Pinned script asset commit:** `db1831ce06b0656e8ec4dfab3d4387abbee548f5`.
- **Scope limit:** Confirms injection, snow identification, and native chart rendering only. Per-minute source agreement and forecast accuracy were not checked. The nearby red highway weather alert is not evidence for `raw1 → Extreme`; no local alert mapping was added.
