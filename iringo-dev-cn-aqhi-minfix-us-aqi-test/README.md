# iRingo WeatherKit MinFix US AQI Test

Independent test build based on the fixed iRingo dev MinFix snapshot already published in this repository (`f01909cef45263a735a644703174b6f8b9c08563`). It keeps the upstream Apache-2.0 license notice.

## Scope

- Handles only `/api/v3/weather/` responses and WeatherKit v1 AQ scale requests.
- Sends mainland coordinates to ColorfulClouds with provider country `CN`, including `zh-Hans-US` requests without an explicit country query. The WeatherKit request URL is not rewritten.
- Skips AQ replacement outside the conservative mainland polygon and honors an explicit non-CN `country` query.
- Replaces native `HJ6332012`, observed `EU.EAQI`, `CN_AQHI`, and legacy `EPA_NowCast` AQI with ColorfulCloudsUS; current and yesterday use `EPA_NowCast.2604` categories. Yesterday data failure yields `UNKNOWN`.
- Uses `Storage=Argument` and an empty `Units.Replace` argument so stale PersistentStore unit settings do not win.
- Preserves unknown WK3 root slots and passes through unknown/invalid AQ layouts or encode failures.

## Build and validation

`response.dev.bundle.js` is a deterministic fixed-anchor patch of the local MinFix dev response bundle, not a full Rollup build. The full Rollup source build could not be run because npm returned HTTP 401 for the private `@nsringo/weatherkit@2.0.0` package. The patch script verifies the SHA-256 of both base bundles before applying unique source anchors; the request bundle is unchanged. The local source includes the patch script and 24 passing focused/regression tests.

`build-report.json` records the verified base and emitted JavaScript hashes. Both `script-path` URLs in the module pin immutable asset commit `519bf44e8163c7da945d2488ed01ef433fa2aac1`. The test replay verified Shanghai, Zhangjiagang, Kunshan current-location coordinates, current index/category/scale consistency, missing AQ injection, unknown AQ pass-through, provider failure, missing yesterday data, non-mainland pass-through, explicit non-CN pass-through, and preservation of opaque WK3 bytes.

This is an iPhone Surge test module only. No active Surge configuration was changed and no iPhone acceptance is claimed.

Module SHA-256: `6cd640297add14b90f2b59df1ac3b8ded17c25af937ab50fb9b19b8a17193e90`.

Repository branch: `minfix-us-aqi-test-20261106`.
