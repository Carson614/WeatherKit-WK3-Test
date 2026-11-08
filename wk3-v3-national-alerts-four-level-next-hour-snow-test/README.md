# WK3 National Alerts Four-Level + Snow Minute Experiment

A separate Surge experiment built on the accepted Four-Level + Next Hour Bundle Fix. V1/V2, the accepted AQI/alerts/rain modules, and the active iPhone Surge profile are not changed.

## Snow and sleet conversion

The pinned upstream WK3 codec at `patrickyanxxxxx/WeatherKit-WK3` commit `f5320b320018baabc1b0563d9b93e0535fe92443` declares `precipitation.SNOW=3`, `precipitation.SLEET=4`, `condition.SNOW=11`, `condition.HEAVY_SNOW=10`, `condition.SLEET=4`, and `condition.POSSIBLE_SLEET=5`. These are upstream WK3 declarations and codec test vectors, not proof that Apple Weather renders every member on an iPhone.

This experiment writes a snow segment only when its type, time boundaries, positive minute intensity, nonzero probability, and minute/summary alignment all validate. It writes summary `SNOW` as WK3 precipitation 3, keeps snow condition codes separate from rain, and preserves the measured minute intensity, chance, and timestamps. Sleet uses precipitation 4 and its declared condition symbols. It never maps snow or sleet to `RAIN`.

`FLURRIES` and `POSSIBLE_FLURRIES` have no supported numeric condition code in the pinned declarations. When the matching `SNOW` summary and the full minute evidence validate, the encoder omits the descriptive `condition` vector as a whole while preserving the snow summary and minute vectors. The converter does not invent a numeric alias. Hail, mixed phase, unknown symbols, dry snow labels, missing values, contradictory phases, invalid timing, and malformed structures keep Apple’s original next-hour data.

The existing embedded provider already recognizes Chinese snow/sleet descriptions and emits per-minute intensity/probability/condition data. The change in this directory is the strict WK3 conversion layer and its final-bundle verification; it does not alter AQI, warning logic, or the provider algorithm.

## National weather alerts

The accepted alert behavior is preserved: blue `raw4` and yellow `raw3` are verified in the existing evidence ledger; orange `raw2` and optional red `raw1` remain experiment-only mappings. Matching still requires the hazard type, applicable official color, region, exact issue time, active lifecycle, a unique candidate, and Apple event identity. A shared collection route changes only when every Apple event matches. No unmatched event is rebound to another warning.

The module retains the independent `WeatherAlerts.ExperimentalRaw1` switch. Setting it false disables only the inferred red/raw1 rule. `NextHour.Provider=WeatherKit` disables this experiment’s minute provider patch.

## Validation and evidence limits

Tests cover rain, snow, sleet, dry intervals, light-flurry descriptions, heavy-snow condition, numerical minute values, timeline and phase failures, byte-preserving fallback, AQI regression, opaque WK3 fields, four-level alert matching, the Tangshan shared detail route, Fangshan dual alerts, Turpan blue gale, and the native v1/v2 details route.

The final compiled `response.dev.bundle.js` is rebuilt from the pinned accepted response bundle plus the current local WK3 codec and arena adapter. The build script fails if required snow conversion markers are absent, and final-bundle tests execute the compiled converter itself. This is a fixed-anchor augmentation, not a complete Rollup source build; the private GitHub Packages dependency previously returned 401.

No snow/sleet iPhone acceptance is claimed. The Tangshan snow alert is not evidence of minute-snow UI rendering. After installing this module separately, check `X-WK3-NextHour-Diag` for `result=injected`, then verify the Apple Weather minute panel actually presents snowfall and compare type, amount, probability, and timestamps with the provider. A synthetic FlatBuffer round trip cannot establish the iPhone UI behavior.

Upstream material is retained under Apache-2.0; see `LICENSE`.
