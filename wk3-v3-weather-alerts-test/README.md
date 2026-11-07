# WK3 Weather Alerts Test

Independent test module incrementally based on the real-device accepted `WK3 Next Hour Provider Conversion Test`, stable commit `34475524c06ca7d5c6d17da18612548cd8b0b2e6`. It retains the accepted US EPA AQI path, yesterday comparison, mainland detection, CN_AQHI fix, and WK3 minute-rain conversion/root-slot repair. The alert feature is opt-in through `WeatherAlerts.Provider`; set it to `WeatherKit` to disable alerts without disabling AQI or minute rain.

## WK3 structure and request flow

The upstream `patrickyanxxxxx/WeatherKit-WK3` v3.3.6 WK3 alert codec documents paired Apple JSON/WK3 b66 samples and uses root slot 9. The alert collection has metadata at slot 0, a region-scoped QWeather URL at slot 1, and the existing alert vector at slot 2. The tested alert-summary fields include Apple's 16-byte event UUID, area/country, description, publication time, severity, and details URL. Fields outside the verified summary layout are rejected before a rewrite. This project does not use the WK2 root/enum codec.

For an existing Apple event, the response handler parses the region from Apple's QWeather details URL and retrieves the public QWeather Web page. It requires every current Apple event to have exactly one unused source match on mainland region, normalized alert type, the observed WK3 severity mapping, and exact publication timestamp. Missing Apple region/type/time, unsupported severity, duplicate candidates, a mismatched event, empty source data, oversized details, or a failed request leave the Apple binary response untouched for this feature. It never adds or removes events and never changes Apple's event ID, description, severity, publication time, or other summary fields. Only the existing collection and summary detail URLs are replaced, atomically.

The QWeather detail JSON is captured in the bounded `wk3_` locator only after the exact response-time match. The later `/api/v1/weatherAlerts` or `/api/v2/weatherAlerts` request for that locator is routed to the same request bundle and answered locally with the original Apple event IDs. This avoids a second QWeather fetch after the URL has already been changed. If the response payload cannot fit the configured locator bound, the response-side link rewrite is skipped and Apple's original URL remains.

## Safe diagnostics

The test response adds `X-WK3-Alerts-Diag`, with fixed codes such as `no_apple_alerts`, `source_unavailable`, `region_mismatch`, `event_unmatched`, `event_ambiguous`, `summary_structure_unverified`, `details_payload_too_large`, and `rewritten`. The details API uses `X-WK3-Alerts-Diag: WK3WD/1;result=details_served`. These values contain no full coordinates, tokens, alert text, or response body. QWeather is requested without Apple authorization or cookies. Request logging suppresses the encoded native locator.

## Validation

Run `npm install`, `npm run build`, and `npm test`. The alert tests cover empty/no alerts, one and multiple unique matches, region/type/severity/time mismatches, ambiguity, source failures, unsupported summary shape, invalid pointers, and the actual v1 details route. Bundle replay also runs AQI conversion, yesterday comparison, and minute-rain injection before alert URL patching, then decodes the resulting WK3 buffer and compares opaque root fields.

These are synthetic replays. They do not prove the alert page UI on an iPhone. No iPhone Surge configuration is modified, and this directory is a manual-install experiment, not a stable release.

## Build and license

The delivered request and response scripts are a deterministic fixed-anchor augmentation of the exact accepted base bundles, with the independent WK3 alert code embedded. This is not a full Rollup source build; the earlier full build remained blocked by the private `@nsringo/weatherkit` dependency returning HTTP 401. Upstream source attribution and the Apache-2.0 `LICENSE` are retained.
