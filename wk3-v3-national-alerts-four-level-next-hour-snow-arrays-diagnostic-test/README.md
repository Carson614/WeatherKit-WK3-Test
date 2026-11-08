# WK3 Snow Minute Array Diagnostics Test

A separate Surge experiment built on the accepted Four-Level + Next Hour Bundle Fix. V1/V2, the accepted AQI/alerts/rain modules, and the active iPhone Surge profile are not changed.

## Snow and sleet conversion

The pinned upstream WK3 codec at `patrickyanxxxxx/WeatherKit-WK3` commit `f5320b320018baabc1b0563d9b93e0535fe92443` declares `precipitation.SNOW=3`, `precipitation.SLEET=4`, `condition.SNOW=11`, `condition.HEAVY_SNOW=10`, `condition.SLEET=4`, and `condition.POSSIBLE_SLEET=5`. These are upstream WK3 declarations and codec test vectors, not proof that Apple Weather renders every member on an iPhone.

This experiment writes a snow segment only when its type, time boundaries, positive minute intensity, nonzero probability, and minute/summary alignment all validate. It writes summary `SNOW` as WK3 precipitation 3, keeps snow condition codes separate from rain, and preserves the measured minute intensity, chance, and timestamps. Sleet uses precipitation 4 and its declared condition symbols. It never maps snow or sleet to `RAIN`.

`FLURRIES` and `POSSIBLE_FLURRIES` have no supported numeric condition code in the pinned declarations. The previous bundle filtered these symbolic snow descriptions against a separate enum table before the WK3 converter could validate them, leaving `condition=[]` while snow summaries and minutes existed. This test build narrowly lets those two names reach the converter. When the matching `SNOW` summary and full minute evidence validate, the encoder omits the descriptive `condition` vector as a whole while preserving the snow summary and minute vectors. It does not invent a numeric alias. Hail, mixed phase, unknown symbols, dry snow labels, missing values, contradictory phases, invalid timing, and malformed structures keep Apple’s original next-hour data.

## Array rejection diagnostics

`X-WK3-NextHour-Diag` is version 5. On array rejection it reports the `summary/condition/minutes` state in that order (`missing`, `invalid`, `empty`, or `nonempty`), corresponding bounded counts, and one classification: provider data missing, invalid shape, generator summary/condition missing, filtered flurry condition, or incomplete output. A normal dry forecast is only classified as dry when all three arrays exist and minute, summary, and condition values consistently describe zero-probability `CLEAR`; an empty array is never treated as dry. No coordinates, tokens, raw response text, or measured precipitation values are placed in the header.

The existing embedded provider still computes source minute values, summary, probabilities, and timestamps. The build applies only a narrow filter exception for the two unnumbered snow descriptions and routes them through the existing strict converter; it does not alter AQI, warning logic, precipitation enums, or intensity calculations.

## National weather alerts

The accepted alert behavior is preserved: blue `raw4` and yellow `raw3` are verified in the existing evidence ledger; orange `raw2` and optional red `raw1` remain experiment-only mappings. Matching still requires the hazard type, applicable official color, region, exact issue time, active lifecycle, a unique candidate, and Apple event identity. A shared collection route changes only when every Apple event matches. No unmatched event is rebound to another warning.

The module retains the independent `WeatherAlerts.ExperimentalRaw1` switch. Setting it false disables only the inferred red/raw1 rule. `NextHour.Provider=WeatherKit` disables this experiment’s minute provider patch.

## Validation and evidence limits

Tests cover rain, snow, sleet, dry intervals, light-flurry descriptions, heavy-snow condition, numerical minute values, missing/invalid/empty/nonempty array diagnostics, timeline and phase failures, byte-preserving fallback, AQI regression, opaque WK3 fields, four-level alert matching, the Tangshan shared detail route, Fangshan dual alerts, Turpan blue gale, and the native v1/v2 details route. The final response bundle is exercised through a mocked Caiyun `Minutely()` path, not only through the source converter.

The final compiled `response.dev.bundle.js` is rebuilt from the pinned accepted response bundle plus the current local WK3 codec and arena adapter. The build script fails if required snow conversion markers are absent, and final-bundle tests execute the compiled converter itself. This is a fixed-anchor augmentation, not a complete Rollup source build; the private GitHub Packages dependency previously returned 401.

### Real-device acceptance — 2026-11-08

An iPhone running Apple Weather in Gaizhou, Liaoning, accepted this experiment: `X-WK3-NextHour-Diag` reported `WK3NH/5;...;result=injected`; Apple Weather displayed snow, “continuous snow for the next hour,” and its native minute-by-minute snowfall chart with changing intensity. US AQI and yesterday comparison displayed normally. Weather alerts remained intact, and unmatched events safely retained Apple’s original collection details without an incorrect rewrite.

This verifies successful WK3 b66 minute-snow injection, snow recognition, and native chart rendering on a real iPhone. It does **not** verify each minute against ColorfulClouds or establish forecast amount/timing accuracy. A red highway hazardous-weather alert observed near Gaizhou is only an indirect association with an Apple `raw1` event; it is not evidence for `raw1 → Extreme` and does not justify a Liaoning-specific alert mapping.

The accepted artifact is frozen at module commit `3558f8e4f28db4d996aa3221f65f262d34e0b5c8`; its request/response assets are pinned to commit `db1831ce06b0656e8ec4dfab3d4387abbee548f5`. See [`tests/real-device-acceptance.md`](tests/real-device-acceptance.md) and [`ACCEPTANCE_HISTORY.md`](ACCEPTANCE_HISTORY.md) for the test record and append-only history. This documentation update does not change the module or bundles.

Upstream material is retained under Apache-2.0; see `LICENSE`.
