import assert from "node:assert/strict";
import test from "node:test";
import {
    ALERT_REGISTRY_SOURCES,
    APPLE_WK3_SEVERITY,
    GOVERNMENT_WARNING_COLORS,
    LOCAL_WARNING_TYPES,
    NATIONAL_WARNING_TYPES,
    NATIONAL_WARNING_GOVERNMENT_LEVELS,
    VERIFIED_ALERT_TYPE_ALIASES,
    WK3_HTML_COLOR_EVIDENCE,
    compareAlertSeverity,
    isNationalWarningColorApplicable,
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
    assert.match(ALERT_REGISTRY_SOURCES.qweatherAlertSchema, /api\/warning\/weather-alert/);
    for (const entry of NATIONAL_WARNING_TYPES) {
        assert.equal(resolveWeatherAlertType({ name: `${entry.name}黄色预警信号` })?.id, entry.id, entry.name);
        assert.equal(resolveWeatherAlertType({ code: entry.qweatherCode })?.id, entry.id, entry.name);
    }
    assert.equal(resolveWeatherAlertType({ code: "1004", name: "恶劣天气" })?.id, "cn.snowstorm", "an official code takes precedence over an untrusted display title");
    assert.equal(resolveWeatherAlertType({ name: "恶劣天气黄色预警" }), null, "broad terms do not resolve to a hazard");
});

test("national event level applicability stays separate from WK3 severity enums", () => {
    assert.deepEqual(Object.keys(NATIONAL_WARNING_GOVERNMENT_LEVELS).sort(), NATIONAL_WARNING_TYPES.map(item => item.id).sort());
    assert.deepEqual(NATIONAL_WARNING_GOVERNMENT_LEVELS, {
        "cn.typhoon": ["blue", "yellow", "orange", "red"],
        "cn.rainstorm": ["blue", "yellow", "orange", "red"],
        "cn.snowstorm": ["blue", "yellow", "orange", "red"],
        "cn.cold_wave": ["blue", "yellow", "orange", "red"],
        "cn.gale": ["blue", "yellow", "orange", "red"],
        "cn.sandstorm": ["yellow", "orange", "red"],
        "cn.high_temperature": ["yellow", "orange", "red"],
        "cn.drought": ["orange", "red"],
        "cn.lightning": ["yellow", "orange", "red"],
        "cn.hail": ["orange", "red"],
        "cn.frost": ["blue", "yellow", "orange"],
        "cn.dense_fog": ["yellow", "orange", "red"],
        "cn.haze": ["yellow", "orange"],
        "cn.road_icing": ["yellow", "orange", "red"],
    });
    for (const item of NATIONAL_WARNING_TYPES) {
        const levels = NATIONAL_WARNING_GOVERNMENT_LEVELS[item.id];
        assert.ok(levels.length > 0, item.name);
        for (const color of GOVERNMENT_WARNING_COLORS) {
            assert.equal(isNationalWarningColorApplicable(item.id, color), levels.includes(color), `${item.name}/${color}`);
        }
    }
    assert.equal(isNationalWarningColorApplicable("cn.gale", "蓝色"), true);
    assert.equal(isNationalWarningColorApplicable("cn.drought", "blue"), false);
    assert.equal(isNationalWarningColorApplicable("unknown", "blue"), null);
    assert.equal(compareAlertSeverity(4, { alertTypeId: "cn.drought", governmentColor: "blue", qweatherSeverity: "minor" }).status, "government_level_not_applicable");
    assert.equal(compareAlertSeverity(4, { alertTypeId: "cn.gale", qweatherSeverity: "minor" }).ok, true, "structured QWeather severity can be used without a color field");
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
    assert.deepEqual(Object.keys(WK3_HTML_COLOR_EVIDENCE).sort(), GOVERNMENT_WARNING_COLORS.slice().sort());
    assert.deepEqual(Object.fromEntries(Object.entries(WK3_HTML_COLOR_EVIDENCE).map(([color, evidence]) => [color, evidence.status])), {
        blue: "unverified", yellow: "partial", orange: "unverified", red: "unverified",
    });
    assert.equal(WK3_HTML_COLOR_EVIDENCE.blue.appleRawSeverity, null, "no raw WK3 value is inferred for Turpan's blue wind alert");
    for (const color of GOVERNMENT_WARNING_COLORS) {
        for (const item of NATIONAL_WARNING_TYPES) {
            const evidencedYellow = color === "yellow" && WK3_HTML_COLOR_EVIDENCE.yellow.alertTypeIds.includes(item.id);
            assert.equal(compareAlertSeverity(3, { alertTypeId: item.id, governmentColor: color }).ok, evidencedYellow, `${item.name}/${color}`);
        }
    }
    for (const [color, evidence] of Object.entries(WK3_HTML_COLOR_EVIDENCE)) {
        if (evidence.appleRawSeverity !== null) continue;
        for (const raw of [0, 3, 4, 5, 255]) {
            assert.notEqual(compareAlertSeverity(raw, { governmentColor: color }).ok, true, `${color}/raw=${raw}`);
        }
    }
    assert.deepEqual(compareAlertSeverity(3, { alertTypeId: "cn.cold_wave", governmentColor: "yellow" }), {
        ok: true, status: "matched_verified_color_crosswalk", appleSeverity: "moderate", evidence: ["fangshanColorEvidence", "zhangjiagangColdWaveEvidence"],
    });
    assert.equal(compareAlertSeverity(3, { alertTypeId: "cn.cold_wave", qweatherSeverity: "moderate", governmentColor: "red" }).ok, true, "structured QWeather severity takes precedence over independent color");
    assert.equal(compareAlertSeverity(3, { alertTypeId: "cn.cold_wave", qweatherSeverity: "severe", governmentColor: "yellow" }).status, "severity_no_match");
    assert.equal(compareAlertSeverity(5, { governmentColor: "red" }).status, "severity_unverified");
    assert.equal(compareAlertSeverity(4, { governmentColor: "blue" }).status, "severity_crosswalk_unverified");
});

test("every applicable national type/color pair stays fail-closed until that type/color pair is measured", () => {
    for (const item of NATIONAL_WARNING_TYPES) {
        for (const color of NATIONAL_WARNING_GOVERNMENT_LEVELS[item.id]) {
            const result = compareAlertSeverity(3, { alertTypeId: item.id, governmentColor: color });
            const evidenced = color === "yellow" && WK3_HTML_COLOR_EVIDENCE.yellow.alertTypeIds.includes(item.id);
            assert.equal(result.ok, evidenced, `${item.name}/${color}`);
            assert.equal(result.status, evidenced ? "matched_verified_color_crosswalk" : "severity_crosswalk_unverified", `${item.name}/${color}`);
        }
    }
});

test("unknown lifecycle, update and cancellation remain explicit and are never treated as active", () => {
    assert.equal(normalizeAlertLifecycle("alert"), "active");
    assert.equal(normalizeAlertLifecycle("update"), "update");
    assert.equal(normalizeAlertLifecycle("cancel"), "cancel");
    assert.equal(normalizeAlertLifecycle("mystery"), "unknown");
});
