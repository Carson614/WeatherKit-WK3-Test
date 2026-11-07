/**
 * Traceable, conservative CN warning registry.
 * National categories are from CMA Order 16 and local additions are scoped to
 * the cited jurisdiction. QWeather event codes are global identifiers and are
 * kept separate from title strings, government colors, and severity systems.
 * Unknown/ambiguous titles intentionally resolve to null.
 */
export const ALERT_REGISTRY_VERSION = "2026-11-07.5";

export const ALERT_REGISTRY_SOURCES = Object.freeze({
    national: "https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/gz/202005/P020220628619411458474.pdf",
    qweatherEvents: "https://dev.qweather.com/docs/api/warning/alert-events/",
    qweatherAlertSchema: "https://dev.qweather.com/docs/api/warning/weather-alert/",
    qweatherLifecycle: "https://dev.qweather.com/docs/api/warning/alert-changes/",
    qweatherGuide: "https://dev.qweather.com/docs/api/warning/alert-guide/",
    qxT408: "https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/bz/202209/P020220921686798381547.pdf",
    sichuan: "https://www.moj.gov.cn/pub/sfbgw/flfggz/flfggzdfzwgz/202410/t20241023_508240.html",
    shenzhen: "https://weather.sz.gov.cn/xingxigongkai/qita/jishubiaozhun/content/post_11595663.html",
    shenzhenStandard: "https://www.sz.gov.cn/attachment/1/1234/1234420/10369443.pdf",
    snowAliasEvidence: "Carson614/WeatherKit-WK3-Test Snow Alias Test real-device title observation, 2026-11-07",
    severityEvidence: "WK3 b66 upstream v3.3.6 source records raw 3=MODERATE and raw 4=MINOR; Tangshan strict real-device pairing motivates raw2=SEVERE as an experimental inference only",
    wk3B66SeveritySource: "https://github.com/patrickyanxxxxx/WeatherKit-WK3/blob/v3.3.6/src/wk3/class/WK3Alerts.mjs#L3-L16",
    qweatherBlueGaleMinorExample: "Official QWeather Weather Alert API example: eventType.name=大风, eventType.code=1006, color.code=blue, severity=minor",
    turpanBlueGaleRealCapture: "User-provided iPhone WK3WA/3: region=1,type=1,issued=1,raw4,QWeather API severity unavailable,government color blue; no broader raw/color inference",
    fangshanColorEvidence: "Fangshan real-device dual-warning success: cn.snowstorm and cn.road_icing both matched yellow page events under the verified raw-3 crosswalk",
    zhangjiagangColdWaveEvidence: "Zhangjiagang real Surge log: Apple cn.cold_wave severityRaw=3 matched QWeather yellow event at exact issuedTime",
    nationalLevels: "CMA Order 16 national warning signal annex; color levels are type-specific and are not WK3 severity integers",
    qweatherStructuredSeverity: "QWeather GET Weather Alert API schema; requires configured JWT and API host; HTML fallback remains available without API credentials",
});

/** The CMA national base list. Government level/color is not a WK3 enum. */
export const NATIONAL_WARNING_TYPES = Object.freeze([
    { id: "cn.typhoon", name: "台风", qweatherCode: "1001" },
    { id: "cn.rainstorm", name: "暴雨", qweatherCode: "1003" },
    { id: "cn.snowstorm", name: "暴雪", qweatherCode: "1004" },
    { id: "cn.cold_wave", name: "寒潮", qweatherCode: "1005" },
    { id: "cn.gale", name: "大风", qweatherCode: "1006" },
    { id: "cn.sandstorm", name: "沙尘暴", qweatherCode: "1007" },
    { id: "cn.high_temperature", name: "高温", qweatherCode: "1009" },
    { id: "cn.drought", name: "干旱", qweatherCode: "1022" },
    { id: "cn.lightning", name: "雷电", qweatherCode: "1014" },
    { id: "cn.hail", name: "冰雹", qweatherCode: "1015" },
    { id: "cn.frost", name: "霜冻", qweatherCode: "1016" },
    { id: "cn.dense_fog", name: "大雾", qweatherCode: "1017" },
    { id: "cn.haze", name: "霾", qweatherCode: "1019" },
    { id: "cn.road_icing", name: "道路结冰", qweatherCode: "1021" },
].map(Object.freeze));

/** Official CMA Order 16 levels for the national base types. This is a
 * government-color applicability table, not a mapping to Apple WK3 enums. */
export const NATIONAL_WARNING_GOVERNMENT_LEVELS = Object.freeze({
    "cn.typhoon": Object.freeze(["blue", "yellow", "orange", "red"]),
    "cn.rainstorm": Object.freeze(["blue", "yellow", "orange", "red"]),
    "cn.snowstorm": Object.freeze(["blue", "yellow", "orange", "red"]),
    "cn.cold_wave": Object.freeze(["blue", "yellow", "orange", "red"]),
    "cn.gale": Object.freeze(["blue", "yellow", "orange", "red"]),
    "cn.sandstorm": Object.freeze(["yellow", "orange", "red"]),
    "cn.high_temperature": Object.freeze(["yellow", "orange", "red"]),
    "cn.drought": Object.freeze(["orange", "red"]),
    "cn.lightning": Object.freeze(["yellow", "orange", "red"]),
    "cn.hail": Object.freeze(["orange", "red"]),
    "cn.frost": Object.freeze(["blue", "yellow", "orange"]),
    "cn.dense_fog": Object.freeze(["yellow", "orange", "red"]),
    "cn.haze": Object.freeze(["yellow", "orange"]),
    "cn.road_icing": Object.freeze(["yellow", "orange", "red"]),
});

/**
 * Locally specified additions, not a claim that these exhaust every province.
 * They resolve only under the named QWeather location slug. Overlapping local
 * categories retain distinct IDs from the national category with the same text.
 */
export const LOCAL_WARNING_TYPES = Object.freeze([
    { id: "local.sichuan.strong_cooling", name: "强降温", jurisdiction: "四川", regionSlug: "sichuan", qweatherCode: "1039", source: "sichuan" },
    { id: "local.sichuan.thunderstorm_gale", name: "雷暴大风", jurisdiction: "四川", regionSlug: "sichuan", qweatherCode: "1020", source: "sichuan" },
    { id: "local.shenzhen.cold", name: "寒冷", jurisdiction: "深圳", regionSlug: "shenzhen", qweatherCode: "1034", source: "shenzhenStandard" },
    { id: "local.shenzhen.strong_monsoon", name: "强季风", jurisdiction: "深圳", regionSlug: "shenzhen", qweatherCode: "1080", source: "shenzhenStandard" },
    { id: "local.shenzhen.gray_haze", name: "灰霾", jurisdiction: "深圳", regionSlug: "shenzhen", qweatherCode: null, source: "shenzhenStandard" },
    { id: "local.shenzhen.forest_fire", name: "森林火险", jurisdiction: "深圳", regionSlug: "shenzhen", qweatherCode: "1025", source: "shenzhenStandard" },
    { id: "local.shenzhen.geological_hazard", name: "地质灾害", jurisdiction: "深圳", regionSlug: "shenzhen", qweatherCode: "1037", source: "shenzhenStandard" },
].map(Object.freeze));

/** Exact title alias backed by a real-device title comparison. */
export const VERIFIED_ALERT_TYPE_ALIASES = Object.freeze([
    { exactNormalizedTitle: "分区暴雪", targetId: "cn.snowstorm", key: "partitioned_snow_to_snow", source: "snowAliasEvidence" },
].map(Object.freeze));

/** WK3 b66 raw enum evidence; never derive these integers from warning colors. */
export const APPLE_WK3_SEVERITY = Object.freeze({
    3: "moderate",
    4: "minor",
});

/** Experimental inference from the Tangshan strict event pairing. This is
 * deliberately separate from the verified WK3 enum table and is enabled only
 * for nationally registered orange warnings in this isolated test branch. */
export const APPLE_WK3_EXPERIMENTAL_SEVERITY = Object.freeze({
    2: "severe",
});

/** QWeather API severity vocabulary, independent of its government color. */
export const QWEATHER_SEVERITIES = Object.freeze(["unknown", "minor", "moderate", "severe", "extreme"]);
export const GOVERNMENT_WARNING_COLORS = Object.freeze(["blue", "yellow", "orange", "red"]);

/** QX/T 408-2017 Table 6 crosswalks government color to CAP severity. */
export const CAP_SEVERITY_BY_GOVERNMENT_COLOR = Object.freeze({
    blue: "minor",
    yellow: "moderate",
    orange: "severe",
    red: "extreme",
});

/** The standard's color-to-CAP crosswalk is generic. The orange entry is an
 * explicit experiment, not a protocol fact; red remains unmatchable. */
export const WK3_HTML_COLOR_EVIDENCE = Object.freeze({
    blue: Object.freeze({ appleRawSeverity: 4, capSeverity: "minor", status: "standard_plus_wk3_enum", source: Object.freeze(["qxT408", "wk3B66SeveritySource", "turpanBlueGaleRealCapture", "qweatherBlueGaleMinorExample"]) }),
    yellow: Object.freeze({ appleRawSeverity: 3, capSeverity: "moderate", status: "standard_plus_wk3_enum", source: Object.freeze(["qxT408", "wk3B66SeveritySource", "fangshanColorEvidence", "zhangjiagangColdWaveEvidence"]) }),
    orange: Object.freeze({ appleRawSeverity: 2, capSeverity: "severe", status: "experimental_inferred", source: Object.freeze(["qxT408", "tangshanSnowstormStrictPairing"]) }),
    red: Object.freeze({ appleRawSeverity: null, capSeverity: "extreme", status: "wk3_enum_unverified", source: Object.freeze(["qxT408"]) }),
});

/** Crosswalk view retained for diagnostics and tests. Type-specific color
 * applicability is checked separately using the CMA national-level table. */
function htmlColorCrosswalkEntry([governmentColor, evidence]) {
    return Object.freeze({
        appleRawSeverity: evidence.appleRawSeverity,
        governmentColor,
        capSeverity: evidence.capSeverity,
        appleSeverity: evidence.appleRawSeverity === null ? null : appleWK3SeverityForNativeDetails(evidence.appleRawSeverity),
        source: evidence.source,
        status: evidence.status,
    });
}

export const VERIFIED_HTML_COLOR_CROSSWALK = Object.freeze(
    Object.entries(WK3_HTML_COLOR_EVIDENCE).filter(([, evidence]) => evidence.status === "standard_plus_wk3_enum").map(htmlColorCrosswalkEntry),
);
export const EXPERIMENTAL_HTML_COLOR_CROSSWALK = Object.freeze(
    Object.entries(WK3_HTML_COLOR_EVIDENCE).filter(([, evidence]) => evidence.status === "experimental_inferred").map(htmlColorCrosswalkEntry),
);

export function normalizeAlertTitle(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        // Strip only conventional color and warning suffixes, not semantic prefixes.
        .replace(/(?:蓝|黄|橙|红)色?(?:预警信号|预警)$/u, "")
        .replace(/(?:预警信号|预警)$/u, "")
        .replace(/[。．.]+$/u, "");
}

function qweatherCode(value) {
    if (typeof value === "string" && /^\d{4}$/.test(value)) return value;
    if (Number.isInteger(value) && value >= 1000 && value <= 9999) return String(value);
    return "";
}

function exactNameMatch(normalized, regionIdentifier = "") {
    const local = LOCAL_WARNING_TYPES.filter(item => item.name === normalized
        && String(regionIdentifier).toLowerCase().startsWith(`${item.regionSlug}-`));
    if (local.length === 1) return { ...local[0], alias: "none", sourceKind: "local_exact_title" };
    const national = NATIONAL_WARNING_TYPES.filter(item => item.name === normalized);
    if (national.length === 1) return { ...national[0], alias: "none", sourceKind: "national_exact_title" };
    const alias = VERIFIED_ALERT_TYPE_ALIASES.find(item => item.exactNormalizedTitle === normalized);
    if (alias) {
        const target = [...NATIONAL_WARNING_TYPES, ...LOCAL_WARNING_TYPES].find(item => item.id === alias.targetId);
        if (target) return { ...target, alias: alias.key, sourceKind: "verified_exact_alias" };
    }
    return null;
}

export function resolveWeatherAlertType({ code, name, regionIdentifier = "" } = {}) {
    const codeValue = qweatherCode(code);
    if (codeValue) {
        const matches = [...LOCAL_WARNING_TYPES, ...NATIONAL_WARNING_TYPES].filter(item => item.qweatherCode === codeValue);
        const scoped = matches.filter(item => !item.regionSlug || String(regionIdentifier).toLowerCase().startsWith(`${item.regionSlug}-`));
        // An out-of-scope local code is not reinterpreted as a national event.
        if (matches.some(item => item.regionSlug) && scoped.length !== matches.filter(item => !item.regionSlug).length) {
            const localMatch = matches.find(item => item.regionSlug);
            if (localMatch && !String(regionIdentifier).toLowerCase().startsWith(`${localMatch.regionSlug}-`)) return null;
        }
        if (scoped.length === 1) return { ...scoped[0], alias: "none", sourceKind: "qweather_event_code" };
        if (scoped.length > 1) return null;
        // A known but out-of-scope code is authoritative; do not fall through to its title.
        if ([...LOCAL_WARNING_TYPES, ...NATIONAL_WARNING_TYPES].some(item => item.qweatherCode === codeValue)) return null;
    }
    const normalized = normalizeAlertTitle(name);
    if (!normalized) return null;
    return exactNameMatch(normalized, regionIdentifier);
}

export function matchNativeAlertType(value, regionIdentifier = "") {
    return resolveWeatherAlertType({ name: value, regionIdentifier });
}

export function verifiedAppleWK3Severity(raw) {
    return Object.hasOwn(APPLE_WK3_SEVERITY, String(raw)) ? APPLE_WK3_SEVERITY[String(raw)] : null;
}

/** Used only after the strict match pipeline permits the orange/raw2 test. */
export function experimentalAppleWK3Severity(raw) {
    return Object.hasOwn(APPLE_WK3_EXPERIMENTAL_SEVERITY, String(raw)) ? APPLE_WK3_EXPERIMENTAL_SEVERITY[String(raw)] : null;
}

/** Native detail payload severity: verified values plus this branch's raw2
 * experiment. Keep this out of verifiedAppleWK3Severity(). */
export function appleWK3SeverityForNativeDetails(raw) {
    return verifiedAppleWK3Severity(raw) ?? experimentalAppleWK3Severity(raw);
}

export function normalizeQWeatherSeverity(value) {
    const token = String(value ?? "").trim().toLowerCase();
    return QWEATHER_SEVERITIES.includes(token) ? token : null;
}

export function normalizeGovernmentColor(value) {
    const token = String(value ?? "").trim().toLowerCase();
    const exact = { 蓝: "blue", 蓝色: "blue", blue: "blue", yellow: "yellow", 黄: "yellow", 黄色: "yellow", orange: "orange", 橙: "orange", 橙色: "orange", red: "red", 红: "red", 红色: "red" };
    return exact[token] ?? null;
}

export function isNationalWarningColorApplicable(alertTypeId, governmentColor) {
    const levels = NATIONAL_WARNING_GOVERNMENT_LEVELS[alertTypeId];
    const color = normalizeGovernmentColor(governmentColor);
    if (!levels || !color) return null;
    return levels.includes(color);
}

/** API severity and color-derived CAP severity must agree when both exist.
 * Unknown WK3 raw enums and unobserved severe/extreme values fail closed. */
export function compareAlertSeverity(appleRaw, { qweatherSeverity, governmentColor, alertTypeId } = {}) {
    const raw = Number(appleRaw);
    const verifiedSeverity = verifiedAppleWK3Severity(raw);
    const experimentalSeverity = experimentalAppleWK3Severity(raw);
    const appleSeverity = verifiedSeverity ?? experimentalSeverity;
    if (!appleSeverity) return { ok: false, status: "severity_unverified", appleSeverity: null };
    const color = normalizeGovernmentColor(governmentColor);
    if (color && isNationalWarningColorApplicable(alertTypeId, color) === false) {
        return { ok: false, status: "government_level_not_applicable", appleSeverity };
    }
    const qSeverity = normalizeQWeatherSeverity(qweatherSeverity);
    const apiSeverity = qSeverity && qSeverity !== "unknown" ? qSeverity : null;
    const capSeverity = CAP_SEVERITY_BY_GOVERNMENT_COLOR[color] ?? null;
    if (apiSeverity && capSeverity && apiSeverity !== capSeverity) return { ok: false, status: "severity_evidence_conflict", appleSeverity };
    if (capSeverity && !Object.hasOwn(NATIONAL_WARNING_GOVERNMENT_LEVELS, alertTypeId)) return { ok: false, status: "severity_crosswalk_unverified", appleSeverity };
    if (experimentalSeverity) {
        if (color !== "orange" || !Object.hasOwn(NATIONAL_WARNING_GOVERNMENT_LEVELS, alertTypeId)) {
            return { ok: false, status: "experimental_orange_required", appleSeverity: null };
        }
        if (apiSeverity && apiSeverity !== "severe") return { ok: false, status: "severity_evidence_conflict", appleSeverity };
        if (capSeverity !== "severe") return { ok: false, status: "experimental_orange_required", appleSeverity: null };
        return { ok: true, status: "matched_experimental_inferred", appleSeverity, capSeverity, evidence: WK3_HTML_COLOR_EVIDENCE.orange.source };
    }
    const expectedSeverity = apiSeverity ?? capSeverity;
    if (!expectedSeverity) return { ok: false, status: "severity_unverified", appleSeverity };
    if (expectedSeverity !== appleSeverity) return { ok: false, status: "severity_no_match", appleSeverity };
    if (apiSeverity) return { ok: true, status: "matched_qweather_severity", appleSeverity };
    return { ok: true, status: "matched_standard_color_crosswalk", appleSeverity, capSeverity, evidence: WK3_HTML_COLOR_EVIDENCE[color].source };
}

export function normalizeAlertLifecycle(value) {
    const lifecycle = String(value ?? "active").trim().toLowerCase();
    if (["alert", "active", ""].includes(lifecycle)) return "active";
    if (["update", "updated", "变更", "更新"].includes(lifecycle)) return "update";
    if (["cancel", "cancelled", "canceled", "解除", "取消"].includes(lifecycle)) return "cancel";
    return "unknown";
}
