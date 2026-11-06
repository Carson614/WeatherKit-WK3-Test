# iRingo WeatherKit CN_AQHI MinFix Test

This isolated Surge module tests one fix against the official iRingo WeatherKit development snapshot. It does not modify the upstream repository or Gist.

## Fixed inputs

- Source repository: `NSRingo/WeatherKit`, commit `44cf45a827255414ca406a8bc0ed1ba98d31831b`
- Module and script snapshot: Gist revision `4a4185c06eb54a224d6f38166ef4c6072a533b5a`
- Upstream license: Apache-2.0 (`LICENSE`)

## Change

`AirQuality.Config.Scales` has no `CN_AQHI` entry in this snapshot. `ConvertPollutants()` previously evaluated `scales.CN_AQHI.weatherKitScale.name` whenever a scale lookup was needed, throwing before it could handle any configured scale. The obsolete case was removed; no synthetic scale was added. A truly unknown scale now reaches the existing unsupported-scale fallback and leaves the original pollutant array untouched.

The response bundle is the pinned Gist build with only that stale case removed. `request.dev.bundle.js` is unchanged from the same pinned revision. `WeatherKit3` slot inspection, opaque-slot preservation, response handling, and failure passthrough sources were not changed.

The module's nine `script-path` references use immutable GitHub commit `f01909cef45263a735a644703174b6f8b9c08563`, which contains both tested JS files.

## Isolated module settings

The test module limits `DataSets` to `airQuality`, sets `Storage=Argument`, and sets `AirQuality.Current.Pollutants.Units.Replace` to the empty string. In this snapshot, `getStorage()` merges `database -> PersistentStore -> $argument` for `Storage=Argument`; the argument therefore wins. `setENV()` then converts the empty string to `[]`. With `Storage=PersistentStore`, persistent values merge last and can override module arguments, so that mode cannot guarantee an empty effective list.

## Automated checks

10 tests passed: four AQ conversion/configuration regressions and six FlatBuffer root-processor tests. They cover EPA_NowCast, HJ6332012, EU.EAQI and UBA lookup; empty replacements; unknown `CN_AQHI` and future scales; PersistentStore precedence; opaque unknown-slot preservation; and preserving a source slot after a codec failure.

The full upstream Rollup install was not available in this environment: `npm ci` returned 401 while fetching `@nsringo/weatherkit@2.0.0` from GitHub Packages. The published response bundle was therefore derived from the exact pinned Gist bundle with a verified one-branch edit, rather than a fresh dependency-complete Rollup build. No user-supplied tokens or captured request data were added; the pinned upstream bundle retains its own development defaults. This is an automated experiment only; iPhone/Surge validation is still pending.

## Artifact hashes (SHA-256)

- `WeatherKit-CN-AQHI-MinFix-Test.sgmodule`: `3978c78838a2eb27cd9f5850cd5999cf874a6e4167e1f9bd0c7a6d29ad9cdc75`
- `request.dev.bundle.js`: `be8032a6764793e8daf1af5c2e3bef8581c0f017b879cf926f7f941495f3b83d`
- `response.dev.bundle.js`: `7276c52951e490c03fc32171881500a503bff119375c3bc0b926a5df3464b05c`
