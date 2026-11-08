# WK2 Watch AQI Companion Acceptance History

Append-only record of Apple Watch device acceptance. Real request coordinates, credentials and response bodies are intentionally omitted.

## 2026-11-08 — Zhangjiagang Apple Watch AQI

- **Device:** Apple Watch Ultra 1, watchOS 26.6.
- **Request evidence:** Real Watch request used `WK2.Weather`, `country=CN`, and the `airQuality` data set.
- **Surge diagnostic:** `WK2AQI/1;original=missing;source=ok;result=injected`.
- **Result:** User confirmed Apple Watch displayed air quality in Zhangjiagang.
- **Accepted module commit:** `d369e55204eaef308f2f02c1ee6962aaedcf49e1`.
- **Pinned response script asset commit:** `6910ce83b0ac92db40d2050744119900533fd0cc`.
- **Scope:** Confirms the missing-product injection path and native Watch display for this real request. It does not claim all locations, time windows, or forecast accuracy were validated.
- **Rollback:** Disable/remove this WK2 companion module. The independently versioned iPhone WK3 module is unaffected.
