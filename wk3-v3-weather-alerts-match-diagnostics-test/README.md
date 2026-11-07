# WK3 Weather Alerts Match Diagnostics Test

An isolated follow-up branch based on the alert test and the accepted Next Hour Provider Conversion base (`34475524c06ca7d5c6d17da18612548cd8b0b2e6`). AQI and minute-rain code remain unchanged from that base.

## What `event_unmatched` proves

The previous matcher returned this code only after an Apple event had passed the country/page-region check, any present Apple area ID agreed with the page ID, WK3 severity was one of the verified values, and Apple title/time fields were valid. It then found no QWeather event satisfying region + normalized event type + severity + exact publication timestamp. It returned immediately, so a two-event response reported only the first failure. The old header cannot identify which of those four candidate filters rejected either Fangshan event.

This diagnostic build continues through every Apple event and reports only safe counts. `X-WK3-Alerts-Diag` uses:

`WK3WA/2;...;events=2;src=2;parse=blocks,skippedTitle,skippedIssueTime,unknownSeverity;e0=type_no_match:r2t0s0p0c0;e1=issue_time_no_match:r2t1s1p0c0;result=event_unmatched`

`r/t/s/p/c` are candidate counts after region, type, severity, exact publication time, and final uniqueness checks. Region means the Apple alert area ID must agree with its QWeather page ID, and provider event candidates come from that page. The current public HTML does not expose a separate per-alert geocode; the source records inherit the page region. Event indexes follow Apple's vector order. No event title, severity value, timestamp, area code/name, coordinates, ID, token, or response body is logged. At most four per-event entries are emitted.

QWeather's public page can describe a municipal warning covering several districts (including Fangshan) while the page itself is scoped to one district. The page may also show the warning action time in the headline separately from its `Issue date` publication time. The current matcher uses the page location and `Issue date`; neither source field is silently substituted. See the [QWeather Shijingshan example](https://www.qweather.com/en/severe-weather/shijingshan-101011000.html) observed on 2026-11-07.

`type_no_match`, `severity_no_match`, and `issue_time_no_match` distinguish source title normalization, level, and publication-time mismatches. `region_mismatch` indicates an Apple event area ID differs from the QWeather page ID; `source_region_no_match` indicates source records do not carry that page region. `candidate_ambiguous` or `source_reused` never rewrites links.

## Minimal matching change

The matcher now treats generic terminal `预警` / `预警信号` as title formatting, like a colored QWeather suffix. This permits (for example) `雷电预警` and `雷电黄色预警` to share the event-type key. Severity and exact publication time are still independent mandatory matches; no translation, fuzzy substring, time window, region relaxation, event insertion, or severity mapping was added. If this suffix-only normalization is insufficient, use the per-event counts to make the next change against real evidence.

## Details-page path

The v3 response handler reads the region-specific QWeather Web page referenced by the existing WK3 alert collection, then changes only the already matched alert details links. `link=native_api` means the response now points into Apple's `alertDetails` UI path. A subsequent `/api/v1/weatherAlerts` or `/api/v2/weatherAlerts` request is answered locally from the captured matched QWeather details and preserves each Apple event ID; its response header is `WK3WD/2;route=v1|v2;result=details_served`. A direct QWeather page request will not produce that local API header. These headers let the iPhone request list distinguish the script's QWeather fetch from the alert page's native details API.

## Validation and limits

Run `npm run build`, `node --check request.dev.bundle.js`, `node --check response.dev.bundle.js`, then `npm test`. Replays cover two alerts failing different filters, type suffix normalization, parser skip counts, all-or-nothing fallback, the v1/v2 local route, AQI and minute-rain re-decode, and opaque WK3 root slots.

The current Fangshan request log has only aggregate `event_unmatched`; it cannot identify the actual two event failures. This build must be installed and the same request repeated to obtain the per-event header. No raw Fangshan Apple binary or QWeather response was supplied, so the real alert page UI remains unverified. Synthetic replay is not iPhone acceptance.

The implementation follows the upstream v3.3.6 WK3 b66 paired-sample layout and retains the Apache-2.0 license and attribution. Bundle generation is fixed-anchor augmentation of the accepted, hash-verified base scripts, not Rollup; the earlier private `@nsringo/weatherkit` dependency returned HTTP 401. No current Surge configuration is changed.
