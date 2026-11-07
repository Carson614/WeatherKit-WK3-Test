/**
 * Traceable, conservative CN warning registry.
 * National categories are from CMA Order 16 and local additions are scoped to
 * the cited jurisdiction. QWeather event codes are global identifiers and are
 * kept separate from title strings, government colors, and severity systems.
 * Unknown/ambiguous titles intentionally resolve to null.
 */
export const ALERT_REGISTRY_VERSION = "2026-11-07.1";

export const ALERT_REGISTRY_SOURCES = Object.freeze({
    national: "https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/gz/202005/P020220628619411458474.pdf",
    qweatherEvents: "https://dev.qweather.com/docs/api/warning/alert-events/",
    qweatherAlertSchema: "https://dev.qweather.com/docs/en/api/warning/weather-warning/",
    qweatherLifecycle: "https://dev.qweather.com/docs/api/warning/alert-changes/",
    qweatherGuide: "https://dev.qweather.com/docs/api/warning/alert-guide/",
    sichuan: "https://www.moj.gov.cn/pub/sfbgw/flfggz/flfggzdfzwgz/202410/t20241023_508240.html",
    shenzhen: "https://weather.sz.gov.cn/xingxigongkai/qita/jishubiaozhun/content/post_11595663.html",
    shenzhenStandard: "https://www.sz.gov.cn/attachment/1/1234/1234420/10369443.pdf",
    snowAliasEvidence: "Carson614/WeatherKit-WK3-Test Snow Alias Test real-device title observation, 2026-11-07",
    severityEvidence: "Paired Apple JSON/WK3 b66 captures recorded in the MinFix-US-AQI baseline; only raw 3=moderate and raw 4=minor are verified",
    fangshanColorEvidence: "Fangshan e1 real-device match log under the Snow Alias Test baseline; only raw WK3 severity 3 with QWeather page yellow is accepted for HTML-source severity cross-check",
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

/** QWeather API severity vocabulary, independent of its government color. */
export const QWEATHER_SEVERITIES = Object.freeze(["unknown", "minor", "moderate", "severe", "extreme"]);
export const GOVERNMENT_WARNING_COLORS = Object.freeze(["blue", "yellow", "orange", "red"]);

/** Only this HTML-page color/WK3 pair is backed by a reported device match. */
export const VERIFIED_HTML_COLOR_CROSSWALK = Object.freeze([
    { appleRawSeverity: 3, governmentColor: "yellow", appleSeverity: "moderate", source: "fangshanColorEvidence" },
].map(Object.freeze));

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

export function normalizeQWeatherSeverity(value) {
    const token = String(value ?? "").trim().toLowerCase();
    return QWEATHER_SEVERITIES.includes(token) ? token : null;
}

export function normalizeGovernmentColor(value) {
    const token = String(value ?? "").trim().toLowerCase();
    const exact = { 蓝: "blue", 蓝色: "blue", blue: "blue", yellow: "yellow", 黄: "yellow", 黄色: "yellow", orange: "orange", 橙: "orange", 橙色: "orange", red: "red", 红: "red", 红色: "red" };
    return exact[token] ?? null;
}

/** QWeather API severity is compared directly; HTML color uses only a measured pair. */
export function compareAlertSeverity(appleRaw, { qweatherSeverity, governmentColor } = {}) {
    const appleSeverity = verifiedAppleWK3Severity(appleRaw);
    if (!appleSeverity) return { ok: false, status: "severity_unverified", appleSeverity: null };
    const qSeverity = normalizeQWeatherSeverity(qweatherSeverity);
    if (qSeverity && qSeverity !== "unknown") return qSeverity === appleSeverity
        ? { ok: true, status: "matched_qweather_severity", appleSeverity }
        : { ok: false, status: "severity_no_match", appleSeverity };
    const color = normalizeGovernmentColor(governmentColor);
    const crosswalk = VERIFIED_HTML_COLOR_CROSSWALK.find(item => item.appleRawSeverity === Number(appleRaw) && item.governmentColor === color);
    return crosswalk
        ? { ok: true, status: "matched_verified_color_crosswalk", appleSeverity, evidence: crosswalk.source }
        : { ok: false, status: color ? "severity_crosswalk_unverified" : "severity_unverified", appleSeverity };
}

export function normalizeAlertLifecycle(value) {
    const lifecycle = String(value ?? "active").trim().toLowerCase();
    if (["alert", "active", ""].includes(lifecycle)) return "active";
    if (["update", "updated", "变更", "更新"].includes(lifecycle)) return "update";
    if (["cancel", "cancelled", "canceled", "解除", "取消"].includes(lifecycle)) return "cancel";
    return "unknown";
}
