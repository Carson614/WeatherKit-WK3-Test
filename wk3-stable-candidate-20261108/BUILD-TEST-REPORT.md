# Stable Candidate build and regression report

## Artifact identity

- Candidate branch: `wk3-stable-candidate-20261108`.
- Source module baseline: `3558f8e4f28db4d996aa3221f65f262d34e0b5c8`.
- Acceptance-history baseline: `f5413b73a7ab45c9ecd1b1716278a40de77ea21e`.
- Fixed runtime script asset commit: `db1831ce06b0656e8ec4dfab3d4387abbee548f5`.
- Candidate module version: `wk3-stable-candidate-2026.11.08-r1`.
- Candidate module Git commit and immutable download URL will be entered after the release commit is created.
- The only runtime configuration change is `WeatherAlerts.ExperimentalRaw1=false` by default. Request/response JS and feature logic are byte-identical to the accepted source assets.

## Hashes

| File | SHA-256 |
| --- | --- |
| `WK3-WeatherKit-Stable-Candidate.sgmodule` | `341d87287c847809caf7b54cc402a929927cffae0c1fdc83a70283dc5bda163d` |
| `request.dev.bundle.js` | `d493c347d104c8d58829df07c2c5580d421fbf6b132b54f99cfda4c9bbb2fcde` |
| `response.dev.bundle.js` | `d1e0341a73f6820a66591f2cdbff2b38e64d7b7015a27156aaf4b1eeb02b2fa3` |

Both bundles match the accepted Snow Arrays Diagnostic assets byte-for-byte. The module’s three runtime script references use the full 40-character commit `db1831ce06b0656e8ec4dfab3d4387abbee548f5`.

## Automated checks

- `npm test`: **111 passed, 0 failed**.
- `node --check`: request bundle, response bundle, build helper, and all WK3 source modules passed.
- Final response-bundle replay covers EPA AQI and yesterday comparison, minute rain, minute snow and snow-phase validation, unknown-field preservation, alert strict matching/details, provider failures, and byte-preserving fallback.
- The module contract checks `ExperimentalRaw1=false`, all three immutable 40-character script paths, the selected AQI settings, independent feature switches, binary mode, and the v1/v2 native alert-detail route.
- Candidate script/bundle SHA-256 values match the local files and the recorded asset commit.

## Evidence status

- **Previously passed on iPhone:** EPA AQI and yesterday comparison; minute rain; Fangshan dual-alert details; Turpan blue gale; Tangshan three-alert native details; Gaizhou minute-snow injection and Apple Weather’s native snowfall chart. These results apply to the pinned source experiment, not yet to this candidate module configuration.
- **Automated tests only:** Sleet rendering, complete national type/color matrix edge cases, unsupported structures and provider failure combinations beyond the named device cases.
- **Experimental inference:** national orange `raw2 → Severe`; national red `raw1 → Extreme`. Orange has a Tangshan strict-match real-device example but is not an Apple protocol definition. Red has no confirmed Apple pairing and is disabled by default.
- **Candidate status:** not yet iPhone-accepted. The requested single short candidate regression remains pending.
- **Forecast accuracy limit:** Gaizhou confirms snow injection, recognition, and chart rendering; it does not verify minute-by-minute ColorfulClouds agreement or snowfall amount/timing accuracy.

## Build limitation and rollback

Full Rollup was not run because private `@nsringo/weatherkit` GitHub Packages access previously returned 401. No authentication was bypassed or requested. This candidate reuses the already tested fixed-anchor request/response assets and tests those exact final bundles.

Rollback by disabling this candidate and reinstalling the immutable source module at commit `3558f8e4f28db4d996aa3221f65f262d34e0b5c8`. Do not run both modules together because their WK3 request rules overlap.
