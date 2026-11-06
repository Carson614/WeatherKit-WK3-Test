# WK3 MinFix US AQI + Next Hour Test

An isolated Surge test module based on the accepted MinFix-US-AQI-Test snapshot (`f5b344b95f8bee0e2de3b09cb92e936c8e316a4a`). It adds only WK3 minute-level precipitation. It does not add weather-alert handling.

## Implementation

- Keeps the V2 ColorfulCloudsUS / `EPA_NowCast.2604` AQI configuration and mainland-region gate.
- Uses the WK3 `forecastNextHour` codec documented in [upstream v3.3.6 `WK3NextHour.mjs`](https://github.com/patrickyanxxxxx/WeatherKit-WK3/blob/9fc8d85afaf595f338db032090a77283a5c63db3/src/wk3/class/WK3NextHour.mjs). The upstream source records root slot 5, child fields, and paired iOS 27 WK3 b66 captures. The test codec does not reuse the WK2 encoder.
- Writes the validated minute child into the original FlatBuffer arena before the AQ root update. It redirects only the WK3 slot 5 pointer and known next-hour vector/scalar fields, preserving other root products and the existing V2 AQ path.
- Fails open for malformed or unknown next-hour layouts, missing/invalid provider data, and ColorfulClouds failures. An empty slot 5 is only populated when the WK3 root table and pointer field pass bounds checks. A valid provider forecast with no rain is encoded as dry minutes.
- `NextHour.Provider` is a separate switch. Set it to `WeatherKit` to test V2 AQ alone; set it back to `ColorfulClouds` to enable the minute provider.

## Build and tests

`response.dev.bundle.js` is a deterministic fixed-anchor augmentation of the verified V2 response bundle (`artifacts/base/minfix-response.dev.bundle.js`, SHA-256 `e9c1d40ce93e85b423dd2bae2b9775c3a5686a19d5b999ab74f8b10d25d15b28`). This is not a full Rollup source build; the prior full build attempt was blocked by the private `@nsringo/weatherkit` package returning HTTP 401. The build script checks the base bundle hash and all replacement anchors.

Run `npm install`, `npm test`, and `npm run build`. Tests replay the exact shipped response bundle with synthetic WK3 data and mock provider responses. They cover dry forecasts, rain start/stop and intensity changes, AQI plus minute writes, unknown root fields, malformed/unknown next-hour tables, provider failure, failed AQ decoding, and the feature switch. `tests/fixtures/wk3-aq.synthetic.bin` is explicitly synthetic, not an Apple capture.

The user supplied the real iOS 27.3 request URL, `forecastNextHour` data set, HTTP 200 status, WK3 FlatBuffer content type, and body length 52,672 bytes. The corresponding `.bin` body was not available to replay here. This build therefore has code-level b66 layout evidence from the upstream source and local synthetic replay, but no direct replay of that device response.

## Install and device validation

The `.sgmodule` defaults to the accepted AQI settings and enables ColorfulClouds minute precipitation. Install this isolated module in Surge only when ready to test; do not replace the current V2 module. Compare the same location with `NextHour.Provider=WeatherKit` and then `ColorfulClouds`. A dry forecast is valid data. This is an experiment: automated tests do not establish iPhone acceptance.

Copyright and license notices are retained in `LICENSE`; the reused upstream implementation is Apache-2.0.
