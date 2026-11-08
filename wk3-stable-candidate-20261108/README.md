# WK3 WeatherKit Stable Candidate

This isolated WK3 version has passed the candidate-level iPhone regression and is accepted for daily-use maintenance as of **2026-11-08**. It carries forward the iPhone-accepted Snow Arrays Diagnostic bundle without rebuilding or reassembling its weather logic. The candidate changes module metadata and defaults the experimental red `raw1` alert mapping to **off**. This documentation update does not change the active Surge configuration or any older module.

## Version provenance

- Accepted Snow Arrays Diagnostic module: `3558f8e4f28db4d996aa3221f65f262d34e0b5c8`.
- Accepted request/response bundle asset commit: `db1831ce06b0656e8ec4dfab3d4387abbee548f5`.
- Gaizhou acceptance record commit: `f5413b73a7ab45c9ecd1b1716278a40de77ea21e`.
- Stable Candidate module commit: `8566813ff013e554a94b4408c2effa5f4cf98152`.
- **Install candidate:** [WK3-WeatherKit-Stable-Candidate.sgmodule](https://raw.githubusercontent.com/Carson614/WeatherKit-WK3-Test/8566813ff013e554a94b4408c2effa5f4cf98152/wk3-stable-candidate-20261108/WK3-WeatherKit-Stable-Candidate.sgmodule).
- The request and response bundles in this directory are byte-identical to those accepted assets. Every runtime script path in the candidate module pins the full 40-character asset SHA.
- The candidate bundle is exercised by the final-bundle tests. Full Rollup remains blocked by the private `@nsringo/weatherkit` GitHub Packages dependency returning 401; this release reuses the accepted fixed-anchor bundle and does not bypass authentication.

The published candidate module SHA and file hashes are recorded in [`BUILD-TEST-REPORT.md`](BUILD-TEST-REPORT.md). The previous module remains available for rollback at the fixed [Snow Arrays Diagnostic module URL](https://raw.githubusercontent.com/Carson614/WeatherKit-WK3-Test/3558f8e4f28db4d996aa3221f65f262d34e0b5c8/wk3-v3-national-alerts-four-level-next-hour-snow-arrays-diagnostic-test/WK3-National-Alerts-Four-Level-Next-Hour-Snow-Arrays-Diagnostic-Test.sgmodule).

## Included behavior

| Area | Candidate behavior | Evidence status |
| --- | --- | --- |
| Air quality | US EPA NowCast, mainland CN index conversion, and same-source yesterday comparison | iPhone accepted; Zhangjiagang Stable Candidate regression passed |
| Minute rain | ColorfulClouds minute rain, stop/resume periods, and timeline validation | Historical iPhone success; no-rain intervals may correctly omit the minute card |
| Minute snow | Distinct WK3 `SNOW` summary and minute intensity curve; no snow-to-rain mapping | Gaizhou iPhone acceptance on the exact inherited script assets |
| Sleet | Keeps the existing `SLEET` experiment and strict phase checks | Automated tests only; no iPhone acceptance |
| Alerts | National 14-type registry, strict region/type/severity/time/lifecycle/identity checks, and all-events-before-shared-link rewrite | Fangshan, Turpan, and Tangshan behavior previously passed on iPhone |
| Alert severity | Blue `raw4` and yellow `raw3` retained; orange `raw2` remains experimental; red `raw1` remains experimental and defaults off | Orange has Tangshan device evidence but is not an Apple protocol definition; red has no paired device evidence |

Historical device results remain tied to their listed source experiments. The exact Stable Candidate has now passed its Zhangjiagang iPhone regression and is accepted for daily use. A Zhangjiagang observation with current rain but no minute-rain card was checked against ColorfulClouds data: the next 120 minutes had zero precipitation intensity and probability, so the omitted card was expected. `raw2=Severe` and `raw1=Extreme` remain inferred alert mappings, not confirmed Apple WK3 definitions. No Gaizhou-area red warning establishes `raw1=Extreme`; no Liaoning-specific alert mapping is included.

## Surge parameters

| Parameter | Default | Use / isolation control |
| --- | --- | --- |
| `DataSets` | `airQuality,forecastNextHour,weatherAlerts` | Selects the data covered by this module |
| `NextHour.Provider` | `ColorfulClouds` | Set to `WeatherKit` to turn off the minute-precipitation replacement |
| `AirQuality.Current.Index.Provider` | `ColorfulCloudsUS` | Selects the current-index source; `AirQuality.Current.Index.Replace` controls scale conversion |
| `AirQuality.Comparison.ReplaceWhenCurrentChange` | `true` | Set to `false` to disable yesterday-index replacement |
| `WeatherAlerts.Provider` | `QWeatherWeb` | Set to `WeatherKit` to turn off alert-detail matching |
| `WeatherAlerts.ExperimentalRaw1` | `false` | Set to `true` only to opt in to the unverified red/raw1 experiment |
| `Storage` | `Argument` | Keeps module arguments authoritative over old persistent settings |
| `LogLevel` | `OFF` | Avoids routine DEBUG output; bounded `X-WK3-*` response headers remain available |

The ColorfulClouds token is a user-supplied module argument and is not stored in this repository. The module preserves separate AQI, next-hour, alert-provider, and raw1 switches.

## Safety and failure behavior

- Unknown WK3 structures, enum values, invalid time series, unavailable provider data, and non-unique alert candidates preserve Apple’s original fields.
- Snow, rain, and sleet remain separate. The converter does not invent a clear or precipitation interval.
- AQI, next-hour precipitation, and alerts are patched independently; a rejection in one keeps that feature’s original Apple data without cancelling other valid patches.
- Unknown FlatBuffer root fields and Apple alert event identity are preserved. A shared alert detail route changes only when every Apple event has one strict candidate.
- Alert cancellation, stale updates, region conflicts, type conflicts, severity conflicts, and exact-time conflicts fail closed.

## Validation

Run `npm test` from this directory. The suite exercises the **published request/response bundle**, including AQI, yesterday comparison, rain, snow, alert details, unknown root fields, diagnostics, and byte-preserving fallbacks. `node --check` is run on both final bundles. The exact commands, results, SHA-256 values, and evidence limits are in [`BUILD-TEST-REPORT.md`](BUILD-TEST-REPORT.md).

## Rollback

To return to the last accepted experiment, disable this candidate and add the fixed Snow Arrays Diagnostic module linked above. Do not leave both modules active because their WK3 rules overlap. This candidate does not replace or overwrite that module.

See [`ACCEPTANCE_HISTORY.md`](ACCEPTANCE_HISTORY.md) for historical device results and [`tests/real-device-acceptance.md`](tests/real-device-acceptance.md) for the Gaizhou snow acceptance scope.
