# Real-device acceptance record

## WK3 minute-snow rendering — passed

- **Date:** 2026-11-08
- **Device/app:** iPhone, Apple Weather
- **Location:** Gaizhou, Liaoning
- **Test module:** WK3 Snow Arrays Diagnostic experiment
- **Module commit:** `3558f8e4f28db4d996aa3221f65f262d34e0b5c8`
- **Pinned request/response asset commit:** `db1831ce06b0656e8ec4dfab3d4387abbee548f5`
- **Observed response diagnostic:** `WK3NH/5;...;result=injected`

### Observed results

- Apple Weather recognized snow and displayed “预报有雪”.
- It displayed “未来一小时持续降雪”.
- The native minute-by-minute snowfall chart appeared and showed intensity changing over time.
- US AQI and yesterday comparison displayed normally.
- Weather alerts remained available. Unmatched events kept Apple’s original details; no incorrect shared-detail rewrite was observed.

### Acceptance boundary

This is real-iPhone evidence that the WK3 b66 snow payload was injected, recognized as snow, and rendered by Apple Weather’s native minute chart. It does not establish per-minute agreement with ColorfulClouds or the accuracy of predicted snowfall amounts and timing.

A red highway hazardous-weather warning observed near Gaizhou was only indirectly associated with an Apple `raw1` event. It is not accepted evidence for `raw1 → Extreme`; no Liaoning-specific warning mapping was added.

## Immutable artifact references

- **Module URL:** `https://raw.githubusercontent.com/Carson614/WeatherKit-WK3-Test/3558f8e4f28db4d996aa3221f65f262d34e0b5c8/wk3-v3-national-alerts-four-level-next-hour-snow-arrays-diagnostic-test/WK3-National-Alerts-Four-Level-Next-Hour-Snow-Arrays-Diagnostic-Test.sgmodule`
- **Module SHA-256:** `46bbeb4404957f76ddd4cdd83f6c78e2a3960454b944bd4f24d42f0d4de72cd0`
- **Request bundle SHA-256:** `d493c347d104c8d58829df07c2c5580d421fbf6b132b54f99cfda4c9bbb2fcde`
- **Response bundle SHA-256:** `d1e0341a73f6820a66591f2cdbff2b38e64d7b7015a27156aaf4b1eeb02b2fa3`

The module’s script paths remain pinned to the asset commit above. This record does not modify either bundle or the `.sgmodule`.

This acceptance applies to the pinned source experiment and its script assets. The Stable Candidate uses those same scripts, but its module configuration has not yet received its own iPhone regression.
