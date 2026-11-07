import assert from "node:assert/strict";
import test from "node:test";
import {
    ALERT_REGISTRY_SOURCES,
    APPLE_WK3_SEVERITY,
    GOVERNMENT_WARNING_COLORS,
    LOCAL_WARNING_TYPES,
    NATIONAL_WARNING_TYPES,
    VERIFIED_ALERT_TYPE_ALIASES,
    compareAlertSeverity,
    normalizeAlertLifecycle,
    normalizeAlertTitle,
    normalizeGovernmentColor,
    normalizeQWeatherSeverity,
    resolveWeatherAlertType,
    verifiedAppleWK3Severity,
} from "../src/class/WeatherAlertTypeRegistry.mjs";

test("registry traces the CMA national 14 to exact QWeather event codes", () => {
    assert.equal(NATIONAL_WARNING_TYPES.length, 14);
    assert.ok(ALERT_REGISTRY_SOURCES.national.startsWith("https://www.cma.gov.cn/"));
    assert.ok(ALERT_REGISTRY_SOURCES.qweatherEvents.startsWith("https://dev.qweather.com/"));
    for (const entry of NATIONAL_WARNING_TYPES) {
        assert.equal(resolveWeatherAlertType({ name: `${entry.name}黄色预警信号` })?.id, entry.id, entry.name);
        assert.equal(resolveWeatherAlertType({ code: entry.qweatherCode })?.id, entry.id, entry.name);
    }
    assert.equal(resolveWeatherAlertType({ code: "1004", name: "恶劣天气" })?.id, "cn.snowstorm", "an official code takes precedence over an untrusted display title");
    assert.equal(resolveWeatherAlertType({ name: "恶劣天气黄色预警" }), null, "broad terms do not resolve to a hazard");
});

test("local extension names are jurisdiction-scoped and do not become nationwide aliases", () => {
    assert.ok(ALERT_REGISTRY_SOURCES.sichuan && ALERT_REGISTRY_SOURCES.shenzhenStandard);
    assert.ok(LOCAL_WARNING_TYPES.length >= 5);
    assert.equal(resolveWeatherAlertType({ name: "强降温黄色预警", regionIdentifier: "sichuan-101270101" })?.id, "local.sichuan.strong_cooling");
    assert.equal(resolveWeatherAlertType({ name: "强降温黄色预警", regionIdentifier: "jiangsu-101190404" }), null);
    assert.equal(resolveWeatherAlertType({ code: "1039", name: "强降温", regionIdentifier: "jiangsu-101190404" }), null, "a local event code outside its jurisdiction fails closed");
    assert.equal(resolveWeatherAlertType({ name: "寒冷黄色预警", regionIdentifier: "shenzhen-101280601" })?.id, "local.shenzhen.cold");
    assert.equal(resolveWeatherAlertType({ name: "寒冷黄色预警", regionIdentifier: "guizhou-101260601" }), null);
});

test("the confirmed partitioned-snow alias is exact and does not strip semantic prefixes", () => {
    assert.equal(VERIFIED_ALERT_TYPE_ALIASES.length, 1);
    assert.equal(resolveWeatherAlertType({ name: "分区暴雪黄色预警信号" })?.id, "cn.snowstorm");
    assert.equal(resolveWeatherAlertType({ name: "分区暴雨黄色预警信号" }), null);
    assert.equal(normalizeAlertTitle("分区暴雪黄色预警信号"), "分区暴雪");
});

test("four government colors, QWeather severity, and Apple raw WK3 severity stay separate", () => {
    assert.deepEqual(GOVERNMENT_WARNING_COLORS, ["blue", "yellow", "orange", "red"]);
    assert.deepEqual(["蓝色", "黄色", "橙色", "红色"].map(normalizeGovernmentColor), GOVERNMENT_WARNING_COLORS);
    assert.deepEqual(["minor", "moderate", "severe", "extreme"].map(normalizeQWeatherSeverity), ["minor", "moderate", "severe", "extreme"]);
    assert.equal(normalizeQWeatherSeverity("yellow"), null);
    assert.deepEqual(APPLE_WK3_SEVERITY, { 3: "moderate", 4: "minor" });
    assert.equal(verifiedAppleWK3Severity(5), null);
    for (const color of GOVERNMENT_WARNING_COLORS) {
        assert.equal(compareAlertSeverity(3, { governmentColor: color }).ok, color === "yellow", color);
    }
    assert.deepEqual(compareAlertSeverity(3, { governmentColor: "yellow" }), {
        ok: true, status: "matched_verified_color_crosswalk", appleSeverity: "moderate", evidence: "fangshanColorEvidence",
    });
    assert.equal(compareAlertSeverity(3, { qweatherSeverity: "moderate", governmentColor: "red" }).ok, true, "structured QWeather severity takes precedence over independent color");
    assert.equal(compareAlertSeverity(3, { qweatherSeverity: "severe", governmentColor: "yellow" }).status, "severity_no_match");
    assert.equal(compareAlertSeverity(5, { governmentColor: "red" }).status, "severity_unverified");
    assert.equal(compareAlertSeverity(4, { governmentColor: "blue" }).status, "severity_crosswalk_unverified");
});

test("unknown lifecycle, update and cancellation remain explicit and are never treated as active", () => {
    assert.equal(normalizeAlertLifecycle("alert"), "active");
    assert.equal(normalizeAlertLifecycle("update"), "update");
    assert.equal(normalizeAlertLifecycle("cancel"), "cancel");
    assert.equal(normalizeAlertLifecycle("mystery"), "unknown");
});
