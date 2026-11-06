# WK3 v3 Full Test V3

This is an isolated Surge test release built incrementally from the device-verified `wk3-v3.3.3-aqi-v2-test` baseline. It reuses the WK3-specific codecs and alert/comparison implementations already present in that baseline and does not replace them with the upstream `Response.mjs` implementation.

## Upstream attribution

Reference source: [patrickyanxxxxx/WeatherKit-WK3 at v3.3.5](https://github.com/patrickyanxxxxx/WeatherKit-WK3/tree/v3.3.5), licensed under Apache-2.0. The bundles reuse its `WK3NextHour`, `WK3Comparison`, `WK3Alerts`, `NativeAlertDetails`, request/response entry and route implementations; `Response.mjs` is integrated selectively to preserve the verified V2 AQ behavior. The full upstream license is included in this directory. This test release also includes independent V2 AQ behavior and local V3 integration changes.

## Included test features

- **Air quality:** retains V2 HJ6332012 to US EPA conversion and mainland missing-AQ injection. Current and yesterday AQI use ColorfulCloudsUS; category comparison returns WK3 `UNKNOWN` if the pair is missing, mismatched, invalid, or unavailable.
- **Minute precipitation:** uses the WK3 `NextHour` child codec and ColorfulClouds by default. Valid dry minutes are accepted as data. Missing provider data or an unknown child layout keeps Apple's bytes.
- **Alert details:** uses QWeatherWeb only for unique matches to Apple's existing alerts and preserves Apple's event IDs. The request rule handles the `/api/v1|v2/weatherAlerts?...ids=wk3_...` API URL the native alert page requests after opening the rewritten details page.

To isolate a feature, edit that script rule's arguments: remove `forecastNextHour` from `DataSets` or set `NextHour.Provider="WeatherKit"`; set `AirQuality.Comparison.Yesterday.IndexProvider="WeatherKit"` to disable yesterday comparison; remove `weatherAlerts` from `DataSets` or set `WeatherAlerts.Provider="WeatherKit"` to disable details completion. Do not remove `airQuality` or change the V2 AQ settings when testing the other features.

The build uses the Surge `$done({status, headers, body})` response shape and preserves binary `Uint8Array` data. Logs contain short statuses and no complete URLs, coordinates, response bodies, or API tokens.

## Test status

Automated local tests use synthetic FlatBuffers and public-page fixtures. They do not establish iPhone/Surge acceptance. Test whether real minutes, same-source yesterday data, and uniquely matching live alerts are available separately; no rain or no active alerts is not a failure.
