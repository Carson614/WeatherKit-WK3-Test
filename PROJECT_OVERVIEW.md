# WeatherKit Project Overview

**Status as of 2026-11-08: primary device acceptance complete; daily maintenance.** The iPhone WK3 and Apple Watch WK2 modules are separate, pinned companions. Experimental boundaries remain clearly marked. This overview records versions and evidence; it does not change any Surge configuration.

## Daily-use versions

| Device / protocol | Fixed module | Fixed script asset | Acceptance |
| --- | --- | --- | --- |
| iPhone / WeatherKit WK3 | [Stable Candidate module](https://raw.githubusercontent.com/Carson614/WeatherKit-WK3-Test/8566813ff013e554a94b4408c2effa5f4cf98152/wk3-stable-candidate-20261108/WK3-WeatherKit-Stable-Candidate.sgmodule) — `8566813ff013e554a94b4408c2effa5f4cf98152` | `db1831ce06b0656e8ec4dfab3d4387abbee548f5` | Zhangjiagang iPhone regression passed; historical AQI, rain, Gaizhou snow chart, and alert-detail results retained |
| Apple Watch / WeatherKit WK2 | [Watch AQI Companion module](https://raw.githubusercontent.com/Carson614/WeatherKit-WK3-Test/d369e55204eaef308f2f02c1ee6962aaedcf49e1/wk2-watch-aqi-companion-test-20261108/WK2-Watch-AQI-Companion-Test.sgmodule) — `d369e55204eaef308f2f02c1ee6962aaedcf49e1` | `6910ce83b0ac92db40d2050744119900533fd0cc` | Apple Watch Ultra 1, watchOS 26.6; Zhangjiagang AQI display passed |

## Architecture

- The iPhone module handles WeatherKit **WK3** weather responses and carries the accepted AQI, yesterday comparison, minute rain/snow, and alert behavior.
- The Watch companion handles only successful **WK2** `/api/v2/weather/` responses that explicitly request `airQuality` with `country=CN`. It injects AQI only when the WK2 root product is absent; an existing Apple AQ product is preserved byte-for-byte.
- The modules use separate protocol paths, bundles, and version pins. Disabling or rolling back one does not replace the other. Do not run overlapping WK3 candidate and source-experiment modules together.

## Acceptance evidence and boundaries

- iPhone WK3: the Stable Candidate passed the Zhangjiagang regression. The reported current-rain/no-minute-card case was consistent with ColorfulClouds data showing zero intensity and probability for the next 120 minutes.
- iPhone WK3 historical evidence: US EPA AQI, same-time yesterday comparison, minute rain, Gaizhou’s native minute-snow chart, and weather-alert detail/fail-closed behavior are recorded in the [Stable Candidate acceptance history](./wk3-stable-candidate-20261108/ACCEPTANCE_HISTORY.md).
- Apple Watch WK2: Surge reported `WK2AQI/1;original=missing;source=ok;result=injected`, and the user confirmed AQI appeared on Watch. Request coordinates, credentials, and response bodies are not stored in the acceptance record.
- **Not accepted as verified behavior:** `SLEET` minute precipitation still lacks iPhone real-device acceptance. The red alert mapping `raw1 → Extreme` remains an experimental inference and is disabled by default. The orange `raw2` mapping has device evidence from Tangshan but is not an Apple WK3 protocol definition.
- Automatic tests and public-source builds support the release process, but they do not replace the device results above. The WK2 build report records the upstream GitHub Packages HTTP 401 limitation and fixed-release-bundle build method.

## Rollback

- iPhone: disable the WK3 Stable Candidate and restore the fixed [Snow Arrays Diagnostic module](https://raw.githubusercontent.com/Carson614/WeatherKit-WK3-Test/3558f8e4f28db4d996aa3221f65f262d34e0b5c8/wk3-v3-national-alerts-four-level-next-hour-snow-arrays-diagnostic-test/WK3-National-Alerts-Four-Level-Next-Hour-Snow-Arrays-Diagnostic-Test.sgmodule). Keep only one overlapping WK3 response module enabled.
- Apple Watch: disable/remove the WK2 AQI Companion. This leaves the independent iPhone WK3 module untouched.
- The full commit SHAs above pin both module files and their referenced scripts; older experiment directories remain in the repository for recovery.
