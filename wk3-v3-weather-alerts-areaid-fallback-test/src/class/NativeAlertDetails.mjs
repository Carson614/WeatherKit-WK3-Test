import { resolveWeatherAlertType, verifiedAppleWK3Severity } from "./WeatherAlertTypeRegistry.mjs";

const PREFIX = "wk3_";
const MAX_IDS = 16384, MAX_JSON_BYTES = 12000, MAX_ALERTS = 32;
const REGION = /^[a-zA-Z0-9][a-zA-Z0-9_-]*-\d{9}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DETAIL_KEYS = new Set([
    "id", "areaId", "areaName", "attributionURL", "certainty", "countryCode", "description", "detailsUrl",
    "effectiveTime", "eventEndTime", "eventOnsetTime", "eventSource", "expireTime", "issuedTime", "importance",
    "messages", "name", "phenomenon", "precedence", "responses", "significance", "reportedAt", "severity", "source", "token", "urgency",
]);

/** Recognizes the reserved namespace, including malformed payloads, so callers
 * can reject them locally instead of forwarding them to Apple. */
export function isNativeAlertDetailsID(ids) {
    return typeof ids === "string" && ids.startsWith(PREFIX);
}

function languageTag(value) {
    if (typeof value !== "string" || value.length > 64 || !/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(value)) throw new TypeError("Invalid alert language");
    return value;
}
function exactKeys(value, keys) {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError("Invalid native alert payload shape");
}
function validateDetails(details, appleID) {
    if (!details || typeof details !== "object" || Array.isArray(details)) throw new TypeError("Invalid alert details");
    if (Object.keys(details).some(key => !DETAIL_KEYS.has(key))) throw new TypeError("Unknown alert detail field");
    if (details.id !== appleID || details.detailsUrl !== `#${appleID}`) throw new TypeError("Alert detail identity mismatch");
    if (typeof details.description !== "string" || !details.description.trim() || details.description.length > 512) throw new TypeError("Invalid alert detail description");
    if (typeof details.issuedTime !== "string" || !Number.isFinite(Date.parse(details.issuedTime))) throw new TypeError("Invalid alert detail issue time");
    if (!new Set(["minor", "moderate", "severe", "extreme", "unknown"]).has(details.severity)) throw new TypeError("Invalid alert detail severity");
    for (const key of DETAIL_KEYS) {
        if (details[key] !== undefined && ["areaId", "areaName", "attributionURL", "certainty", "countryCode", "description", "detailsUrl", "effectiveTime", "eventEndTime", "eventOnsetTime", "eventSource", "expireTime", "issuedTime", "importance", "name", "phenomenon", "reportedAt", "severity", "source", "token", "urgency"].includes(key)) {
            if (typeof details[key] !== "string") throw new TypeError("Invalid alert detail text");
            if (details[key].length > MAX_JSON_BYTES) throw new RangeError("Native alert payload too long");
        }
    }
    if (!Array.isArray(details.messages) || details.messages.length > 32) throw new TypeError("Invalid alert detail messages");
    for (const message of details.messages) {
        if (!message || typeof message !== "object" || Array.isArray(message)
            || Object.keys(message).length !== 2 || typeof message.language !== "string" || message.language.length > 64
            || typeof message.text !== "string") throw new TypeError("Invalid alert detail messages");
        if (message.text.length > MAX_JSON_BYTES) throw new RangeError("Native alert payload too long");
    }
    if (!Array.isArray(details.responses) || details.responses.length > 32 || details.responses.some(response => typeof response !== "string" || response.length > 256)) throw new TypeError("Invalid alert detail responses");
    if (!Number.isInteger(details.precedence) || details.precedence < 0 || details.precedence >= MAX_ALERTS) throw new TypeError("Invalid alert detail order");
    return details;
}

function validatePayload(payload) {
    exactKeys(payload, ["region", "alerts"]);
    if (typeof payload.region !== "string" || payload.region.length > 128 || !REGION.test(payload.region)) throw new TypeError("Invalid QWeather region");
    if (!Array.isArray(payload.alerts) || !payload.alerts.length || payload.alerts.length > MAX_ALERTS) throw new RangeError("Invalid native alert count");
    const ids = new Set();
    for (const alert of payload.alerts) {
        exactKeys(alert, ["id", "description", "issuedTime", "severity", "details"]);
        if (typeof alert.id !== "string" || !UUID.test(alert.id) || ids.has(alert.id)) throw new TypeError("Invalid or duplicate Apple UUID");
        ids.add(alert.id);
        if (typeof alert.description !== "string" || !alert.description.trim() || alert.description.length > 512) throw new TypeError("Invalid alert description");
        if (!Number.isInteger(alert.issuedTime) || alert.issuedTime <= 0 || alert.issuedTime > 0xffffffff) throw new TypeError("Invalid alert issuedTime");
        if (!Number.isInteger(alert.severity) || alert.severity < 0 || alert.severity > 255) throw new TypeError("Invalid WK3 severity");
        validateDetails(alert.details, alert.id);
        if (Date.parse(alert.details.issuedTime) !== alert.issuedTime * 1000) throw new TypeError("Alert detail publish time mismatch");
        const severity = verifiedAppleWK3Severity(alert.severity);
        if (!severity || alert.details.severity !== severity) throw new TypeError("Alert detail severity mismatch");
    }
    return payload;
}
function uuidFromBytes(bytes) {
    if (!(Array.isArray(bytes) || bytes instanceof Uint8Array) || bytes.length !== 16 || !Array.from(bytes).every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) throw new TypeError("Expected 16 Apple UUID bytes");
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function base64url(bytes) {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Build once from the original/enriched WK3 summaries; assign this SAME URL to
 * the collection and every summary. The payload contains no location/auth data
 * beyond the public region identifier and the minimum event matching fields. */
export function buildNativeAlertDetailsURL({ identifier, language = "zh-CN", alerts, matchedSources, timezone }) {
    languageTag(language);
    if (timezone !== undefined && (typeof timezone !== "string" || !/^[A-Za-z0-9_+/-]{1,128}$/.test(timezone))) throw new TypeError("Invalid alert timezone");
    if (!Array.isArray(alerts) || !alerts.length || alerts.length > MAX_ALERTS || !Array.isArray(matchedSources) || matchedSources.length !== alerts.length) throw new RangeError("Invalid native alert count");
    const payload = validatePayload({ region: identifier, alerts: alerts.map((alert, index) => {
        const id = uuidFromBytes(alert?.id?.bytes);
        const source = matchedSources[index];
        if (!source || typeof source !== "object") throw new TypeError("Missing matched QWeather details");
        const appleSeverity = verifiedAppleWK3Severity(alert.severity);
        if (!appleSeverity) throw new TypeError("Unverified WK3 severity");
        // The detail payload is bound to the already verified Apple severity;
        // QWeather government color is never promoted to WK3 severity.
        const details = { ...source, id, detailsUrl: `#${id}`, severity: appleSeverity };
        return { id, description: alert.description, issuedTime: alert.issuedTime, severity: alert.severity, details };
    }) });
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (bytes.length > MAX_JSON_BYTES) throw new RangeError("Native alert payload too long");
    const ids = PREFIX + base64url(bytes);
    if (ids.length > MAX_IDS) throw new RangeError("Native alert ids too long");
    const url = new URL("https://weatherkit.apple.com/alertDetails/index.html");
    url.searchParams.set("lang", language);
    url.searchParams.set("ids", ids);
    url.searchParams.set("party", "qweather");
    if (timezone !== undefined) url.searchParams.set("timezone", timezone);
    return url.toString();
}
function parseIDs(ids) {
    if (!isNativeAlertDetailsID(ids) || ids.length > MAX_IDS) throw new TypeError("Invalid native alert ids");
    const encoded = ids.slice(PREFIX.length);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) throw new TypeError("Invalid native alert base64url");
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - encoded.length % 4) % 4));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    if (bytes.length > MAX_JSON_BYTES || base64url(bytes) !== encoded) throw new TypeError("Invalid native alert encoding");
    return validatePayload(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
}
export function matchedNativeAlertType(value, regionIdentifier = "") {
    return resolveWeatherAlertType({ name: value, regionIdentifier })?.id ?? "";
}

/** Returns the already matched QWeather details captured when the WK3 response
 * was rewritten. The details route performs no second network fetch, so a
 * provider outage after a successful match cannot turn the Apple alert page
 * blank. The bounded locator is not a signed token or authorization grant. */
export async function resolveNativeAlertDetails(ids, language = "zh-CN") {
    const payload = parseIDs(ids);
    languageTag(language);
    // Paired Apple JSON / WK3: only raw 3 and 4 are verified.
    if (payload.alerts.some(alert => !verifiedAppleWK3Severity(alert.severity))) throw new TypeError("Unverified WK3 severity");
    return payload.alerts.map(alert => {
        if (alert.details.countryCode !== "CN" || alert.details.areaId !== payload.region.match(/-(\d{9})$/)?.[1]
            || matchedNativeAlertType(alert.description, payload.region) !== matchedNativeAlertType(alert.details.description, payload.region)) throw new Error("Native alert details binding mismatch");
        return alert.details;
    });
}
