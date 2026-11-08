import assert from "node:assert/strict";
import test from "node:test";
import {
    ALERT_REGISTRY_SOURCES,
    APPLE_WK3_SEVERITY,
    APPLE_WK3_EXPERIMENTAL_SEVERITY,
    APPLE_WK3_EXPERIMENTAL_RAW1_SEVERITY,
    CAP_SEVERITY_BY_GOVERNMENT_COLOR,
    GOVERNMENT_WARNING_COLORS,
    EXPERIMENTAL_HTML_COLOR_CROSSWALK,
    LOCAL_WARNING_TYPES,
    NATIONAL_WARNING_TYPES,
    NATIONAL_WARNING_GOVERNMENT_LEVELS,
    VERIFIED_HTML_COLOR_CROSSWALK,
    VERIFIED_ALERT_TYPE_ALIASES,
    WK3_HTML_COLOR_EVIDENCE,
    compareAlertSeverity,
    appleWK3SeverityForNativeDetails,
    experimentalAppleWK3Severity,
    experimentalAppleWK3Raw1Severity,
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

test("government color, CAP severity, QWeather severity, and Apple raw WK3 severity stay separate", () => {
    assert.deepEqual(GOVERNMENT_WARNING_COLORS, ["blue", "yellow", "orange", "red"]);
    assert.deepEqual(["蓝色", "黄色", "橙色", "红色"].map(normalizeGovernmentColor), GOVERNMENT_WARNING_COLORS);
    assert.deepEqual(["minor", "moderate", "severe", "extreme"].map(normalizeQWeatherSeverity), ["minor", "moderate", "severe", "extreme"]);
    assert.equal(normalizeQWeatherSeverity("yellow"), null);
    assert.deepEqual(CAP_SEVERITY_BY_GOVERNMENT_COLOR, { blue: "minor", yellow: "moderate", orange: "severe", red: "extreme" });
    assert.deepEqual(APPLE_WK3_SEVERITY, { 3: "moderate", 4: "minor" });
    assert.deepEqual(APPLE_WK3_EXPERIMENTAL_SEVERITY, { 2: "severe" });
    assert.deepEqual(APPLE_WK3_EXPERIMENTAL_RAW1_SEVERITY, { 1: "extreme" });
    assert.equal(verifiedAppleWK3Severity(5), null);
    assert.equal(verifiedAppleWK3Severity(2), null, "raw2 is not promoted into the verified protocol enum table");
    assert.equal(experimentalAppleWK3Severity(2), "severe");
    assert.deepEqual(VERIFIED_HTML_COLOR_CROSSWALK.map(item => item.governmentColor).sort(), ["blue", "yellow"]);
    assert.deepEqual(EXPERIMENTAL_HTML_COLOR_CROSSWALK.map(item => [item.governmentColor, item.appleRawSeverity, item.appleSeverity, item.status]), [["orange", 2, "severe", "experimental_inferred"], ["red", 1, "extreme", "experimental_raw1_inferred"]]);
    assert.deepEqual(Object.keys(WK3_HTML_COLOR_EVIDENCE).sort(), GOVERNMENT_WARNING_COLORS.slice().sort());
    assert.deepEqual(Object.fromEntries(Object.entries(WK3_HTML_COLOR_EVIDENCE).map(([color, evidence]) => [color, evidence.status])), {
        blue: "standard_plus_wk3_enum", yellow: "standard_plus_wk3_enum", orange: "experimental_inferred", red: "experimental_raw1_inferred",
    });
    assert.equal(WK3_HTML_COLOR_EVIDENCE.blue.appleRawSeverity, 4);
    assert.equal(WK3_HTML_COLOR_EVIDENCE.yellow.appleRawSeverity, 3);
    assert.equal(WK3_HTML_COLOR_EVIDENCE.orange.appleRawSeverity, 2);
    assert.equal(WK3_HTML_COLOR_EVIDENCE.red.appleRawSeverity, 1);
    assert.equal(compareAlertSeverity(3, { alertTypeId: "cn.cold_wave", governmentColor: "yellow" }).status, "matched_standard_color_crosswalk");
    assert.equal(compareAlertSeverity(4, { alertTypeId: "cn.gale", governmentColor: "blue" }).status, "matched_standard_color_crosswalk");
    assert.equal(compareAlertSeverity(3, { alertTypeId: "cn.typhoon", governmentColor: "blue" }).status, "severity_no_match");
    assert.equal(compareAlertSeverity(4, { alertTypeId: "cn.gale", governmentColor: "yellow" }).status, "severity_no_match");
    assert.equal(compareAlertSeverity(3, { alertTypeId: "cn.cold_wave", qweatherSeverity: "moderate", governmentColor: "red" }).status, "severity_evidence_conflict", "inconsistent API severity and official color fail closed");
    assert.equal(compareAlertSeverity(3, { alertTypeId: "cn.cold_wave", qweatherSeverity: "severe", governmentColor: "yellow" }).status, "severity_evidence_conflict");
    assert.equal(compareAlertSeverity(3, { alertTypeId: "cn.cold_wave", qweatherSeverity: "moderate", governmentColor: "yellow" }).status, "matched_qweather_severity");
    assert.equal(compareAlertSeverity(3, { alertTypeId: "cn.cold_wave", qweatherSeverity: "severe" }).status, "severity_no_match");
    assert.equal(compareAlertSeverity(2, { alertTypeId: "cn.snowstorm", qweatherSeverity: "severe", governmentColor: "orange" }).status, "matched_experimental_inferred");
    assert.equal(compareAlertSeverity(2, { alertTypeId: "cn.snowstorm", governmentColor: "orange" }).status, "matched_experimental_inferred", "HTML color-only source uses the explicitly experimental CAP crosswalk");
    assert.equal(compareAlertSeverity(2, { alertTypeId: "cn.snowstorm", governmentColor: "blue" }).status, "experimental_orange_required");
    assert.equal(compareAlertSeverity(2, { alertTypeId: "cn.snowstorm", governmentColor: "orange", qweatherSeverity: "moderate" }).status, "severity_evidence_conflict");
    assert.notEqual(compareAlertSeverity(2, { alertTypeId: "local.sichuan.strong_cooling", governmentColor: "orange" }).ok, true, "raw2 experiment is restricted to the national 14 registry");
    assert.equal(compareAlertSeverity(5, { governmentColor: "red" }).status, "severity_unverified");
    assert.equal(experimentalAppleWK3Raw1Severity(1), null, "raw1 remains opt-in outside the independent switch");
    assert.equal(experimentalAppleWK3Raw1Severity(1, true), "extreme");
    assert.equal(appleWK3SeverityForNativeDetails(1), null);
    assert.equal(appleWK3SeverityForNativeDetails(1, { experimentalRaw1Enabled: true }), "extreme");
    assert.equal(compareAlertSeverity(1, { alertTypeId: "cn.snowstorm", governmentColor: "red" }).status, "raw1_experiment_disabled");
    assert.equal(compareAlertSeverity(1, { alertTypeId: "cn.snowstorm", governmentColor: "red", experimentalRaw1Enabled: true }).status, "matched_experimental_raw1_inferred");
    assert.equal(compareAlertSeverity(1, { alertTypeId: "cn.snowstorm", governmentColor: "orange", experimentalRaw1Enabled: true }).status, "experimental_red_required");
    assert.equal(compareAlertSeverity(1, { alertTypeId: "cn.snowstorm", governmentColor: "red", qweatherSeverity: "severe", experimentalRaw1Enabled: true }).status, "severity_evidence_conflict");
    assert.equal(compareAlertSeverity(1, { alertTypeId: "local.sichuan.strong_cooling", governmentColor: "red", experimentalRaw1Enabled: true }).status, "severity_crosswalk_unverified");
});

test("national 14-type color matrix maps blue/yellow by verified evidence and orange/red only by separate experiments", () => {
    for (const item of NATIONAL_WARNING_TYPES) {
        for (const color of NATIONAL_WARNING_GOVERNMENT_LEVELS[item.id]) {
            const raw = color === "blue" ? 4 : color === "yellow" ? 3 : color === "orange" ? 2 : 1;
            const result = compareAlertSeverity(raw, { alertTypeId: item.id, governmentColor: color, experimentalRaw1Enabled: true });
            const evidenced = true;
            assert.equal(result.ok, evidenced, `${item.name}/${color}`);
            const expectedStatus = color === "orange" ? "matched_experimental_inferred" : color === "red" ? "matched_experimental_raw1_inferred" : "matched_standard_color_crosswalk";
            assert.equal(result.status, expectedStatus, `${item.name}/${color}`);
        }
    }
    assert.equal(compareAlertSeverity(4, { alertTypeId: "cn.drought", governmentColor: "blue" }).status, "government_level_not_applicable");
    assert.equal(compareAlertSeverity(4, { alertTypeId: "cn.gale", governmentColor: "orange" }).status, "severity_no_match");
    assert.equal(compareAlertSeverity(2, { alertTypeId: "cn.gale", governmentColor: "red" }).status, "experimental_orange_required");
    assert.equal(compareAlertSeverity(1, { alertTypeId: "cn.gale", governmentColor: "red" }).status, "raw1_experiment_disabled");
    assert.equal(compareAlertSeverity(5, { alertTypeId: "cn.snowstorm", governmentColor: "orange" }).status, "severity_unverified");
});

test("unknown lifecycle, update and cancellation remain explicit and are never treated as active", () => {
    assert.equal(normalizeAlertLifecycle("alert"), "active");
    assert.equal(normalizeAlertLifecycle("update"), "update");
    assert.equal(normalizeAlertLifecycle("cancel"), "cancel");
    assert.equal(normalizeAlertLifecycle("mystery"), "unknown");
});
