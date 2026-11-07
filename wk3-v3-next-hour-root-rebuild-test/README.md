# WK3 Next Hour Root Rebuild Test

An isolated Surge test package built on the accepted `MinFix-US-AQI-Test` baseline (`f5b344b95f8bee0e2de3b09cb92e936c8e316a4a`) and the root-slot research (`881b92927b5991fb307cf691cb8236e2e2584c1f`). It preserves the validated US AQI conversion, yesterday comparison, mainland-country handling, and CN_AQHI fix. It adds only WK3 `forecastNextHour` handling; no weather-alert code is enabled.

## Root slot 5 handling

The pinned WK3 b66 schema identifies root slot 5 as `forecastNextHour`. The patcher classifies a vtable that ends before slot 5 separately from a serialized slot-5 offset of zero. For either shape it validates the root table and every serialized root child pointer before fetching ColorfulClouds. It constructs a new root around an immutable copy of the original bytes and links the verified existing root tables plus the encoded next-hour table. It never writes into an absent vtable entry.

If the root/child layout, an existing pointer, a native next-hour child, or the encoded result fails validation, the response path skips AQI re-encoding and returns the original body bytes. Provider failures leave the Apple next-hour data unchanged; the already validated AQI path can still run. Requesting `forecastNextHour` alone does not force a write: the request, configured dataset, ColorfulClouds provider, mainland/country gate, and structure checks must all pass.

`X-WK3-NextHour-Diag` reports the requested/configured dataset gate, provider, coarse region decision, root-slot class, whether ColorfulClouds was called, and a short result code. It does not include coordinates, token values, or weather data. The module defaults `LogLevel=OFF` and the ColorfulClouds token argument is empty.

## Tests and build boundary

Run `npm install`, then `npm run build` and `npm test`. The replay suite checks top-level Surge `$done` response shape, `Uint8Array` handling, root-table re-decode, AQI scale/index/category/comparison, preserved opaque root tables, illegal-pointer fail-open, provider failure, and repeat processing. It uses synthetic WK3 bytes; it does not replace iPhone acceptance.

The response script is produced by deterministic fixed-anchor augmentation of the verified MinFix response bundle with the WK3 b66 codec reused from upstream `patrickyanxxxxx/WeatherKit-WK3` v3.3.6. This is not a full Rollup source build. The complete Rollup build remains blocked by the private `@nsringo/weatherkit` package returning HTTP 401. Apache-2.0 license text is retained.

No existing Surge module or configuration is modified. Install this test module manually and use it as the only enabled WeatherKit response module during the comparison; its V3/diagnostic predecessor and V1/V2 remain separate.
