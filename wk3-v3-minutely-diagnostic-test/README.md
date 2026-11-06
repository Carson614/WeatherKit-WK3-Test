# WK3 MinFix AQI + Next Hour Diagnostics

This is an isolated diagnostic copy of the accepted `MinFix-US-AQI-Test` line plus the minute-rain experiment. It does not change V1, V2, the existing minute-test module, or any iPhone Surge configuration. It does not add weather-alert handling.

## What the diagnostic header reports

For `/api/v3/weather/` only, the response includes `X-WK3-NextHour-Diag`. The header contains short status codes only; it does not include the request URL, coordinates, token, or response body.

Example:

`WK3NH/1;ds=1/1;provider=cc;region=mainland;replace=1;gate=on;slot=empty;src=called;result=injected`

- `ds=requested/configured`: whether the request and module settings include `forecastNextHour`.
- `provider`: `cc` means ColorfulClouds is configured; `other` or `off` means it is not.
- `region` and `replace`: mainland coordinate recognition and the final WK3 replacement decision.
- `gate`: `on`, `request_ds_off`, `setting_ds_off`, `provider_off`, or `region_skip`.
- `slot`: `missing` means root slot 5 is not serialized; `empty` means the known slot exists with a null child; `present` means a native child pointer exists.
- `src`: `not_called` or `called`.
- `result`: distinguishes native decode failure, provider request/response failure, provider data validation failure, encode/merge failure, successful injection, and script failure.

The known early-return path is now explicit: when slot 5 is absent, malformed, or its native child cannot be decoded, the provider callback is not invoked. That is a candidate explanation for the missing `/minutely` request, not a conclusion about the user's captured response until the header is observed on that same request.

## Safety and implementation

- AQI conversion remains the same V2 path (`ColorfulCloudsUS`, `EPA_NowCast.2604`). Minute patching still runs against the original byte arena before the AQ update re-encodes the root; regression tests decode the final response and verify both products.
- Failed or unsupported structures remain byte-for-byte unchanged by the minute patch. Root-slot, native-child, source, conversion, encoding, and merge failures are reported without relaxing the schema checks.
- The diagnostic copy redacts URL/coordinate/settings dump logs and reports only the summary header. The diagnostic module should be installed separately from the current V2 and minute-test modules.
- The header is the most useful single item to send back from Surge request details. No `.bin` export is needed for the next diagnostic step.

## Build and limits

`response.dev.bundle.js` is a deterministic fixed-anchor augmentation of the verified V2 response bundle, not a full Rollup source build. The earlier Rollup build remains blocked by the private `@nsringo/weatherkit` package returning HTTP 401. Tests replay synthetic WK3 fixtures; they do not contain the user's 58 KB iOS response body and do not prove real-device acceptance.

Upstream WK3 implementation and license notices are retained from `patrickyanxxxxx/WeatherKit-WK3` v3.3.6 (Apache-2.0). No iPhone config is changed by this package.
