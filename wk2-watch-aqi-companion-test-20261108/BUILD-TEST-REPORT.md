# Build and Test Report

## Result

- `npm run build`: passed; fixed upstream bundle and all patch anchors were verified.
- `npm run check`: passed; generated response bundle, guard, build script syntax checks and **9/9 final-bundle replay tests** passed.
- Final replay verified `Uint8Array` response bodies, a newly inserted AQ product, `EPA_NowCast.2604`, index/category consistency, source time/coordinates, same-source yesterday comparison, and preservation of existing/current/unknown root products.
- Rejections for non-2xx responses, invalid location/time/index, source failure, non-CN, missing airQuality data set, non-WK2 content type and invalid FlatBuffer return the original response body bytes.
- Existing AQ product path returns byte-identical input and makes no provider request. Diagnostics do not print sensitive request details.
- Apple Watch interface has **not** been retested; installation and visual verification remain with the user.

## Build provenance

- NSRingo source release: `v3.3.2`
- NSRingo commit: `c40e8f8a13c8304a7ef500cb74acc5948af14b3f`
- Fixed upstream response bundle SHA-256: `ce1db90d77c44fce972db0c2e319845fc1d6a276d41d772c0294882e59d7f999`
- Final response bundle SHA-256: `77c7e1e7cd49e11f8469b5798f727dc137ba3bc7aced1e5427b89b9424601adf`
- Guard source SHA-256: `c12103a5da4727528070c3815d9de836fbab764ca47f25e128e4e07d300a74f4`

## Limitation

The full Rollup build from upstream source was not available: an upstream package hosted on GitHub Packages returned HTTP 401 without credentials. No authentication was bypassed or requested. The tested asset was built from the official public release bundle with pinned SHA and asserted anchors; it is not represented as a complete source Rollup build.
