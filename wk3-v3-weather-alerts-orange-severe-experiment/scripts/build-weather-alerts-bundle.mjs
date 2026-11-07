import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stableRoot = resolve(root, "..", "wk3-v3-next-hour-provider-conversion-test");
const hash = value => createHash("sha256").update(value).digest("hex");
const EXPECTED_RESPONSE = "3306e2fa3898e302333cb695fd51f21578cef47c29b1af73f220f8c168bbf7a8";
const EXPECTED_REQUEST = "be8032a6764793e8daf1af5c2e3bef8581c0f017b879cf926f7f941495f3b83d";

function replaceOnce(text, before, after, label) {
    if (text.split(before).length !== 2) throw new Error(`Expected exactly one ${label} anchor`);
    return text.replace(before, after);
}

async function alertToolsSource() {
    const registry = (await readFile(resolve(root, "src/class/WeatherAlertTypeRegistry.mjs"), "utf8"))
        .replace(/^export /gm, "");
    const weather = (await readFile(resolve(root, "src/class/WeatherAlerts.mjs"), "utf8"))
        .replace(/^import .*;\n/gm, "")
        .replace(/^export default class WeatherAlerts/m, "class WK3WeatherAlerts")
        .replace(/\bWeatherAlerts\b/g, "WK3WeatherAlerts");
    const native = (await readFile(resolve(root, "src/class/NativeAlertDetails.mjs"), "utf8"))
        .replace(/^import .*;\n/gm, "")
        .replace(/^export /gm, "")
        .replace(/\bWeatherAlerts\b/g, "WK3WeatherAlerts");
    const alerts = (await readFile(resolve(root, "src/class/WK3Alerts.mjs"), "utf8"))
        .replace(/^import .*;\n/gm, "")
        .replace(/^export /gm, "")
        .replace(/\bWeatherAlerts\b/g, "WK3WeatherAlerts");
    return `\n/* WK3 b66 weather-alert codec and safe details route; derived from WeatherKit-WK3 v3.3.6 (Apache-2.0). */\nconst __WK3_ALERT_TOOLS = (() => {\n${registry}\n${weather}\n${native}\n${alerts}\nreturn { isNativeAlertDetailsID, resolveNativeAlertDetails, patchWK3QWeatherAlertsDiagnostic, buildWK3Raw2SeverityEvidence };\n})();\n`;
}

let response = await readFile(resolve(stableRoot, "response.dev.bundle.js"), "utf8");
let request = await readFile(resolve(stableRoot, "request.dev.bundle.js"), "utf8");
if (hash(response) !== EXPECTED_RESPONSE) throw new Error("Stable response baseline hash mismatch");
if (hash(request) !== EXPECTED_REQUEST) throw new Error("Stable request baseline hash mismatch");
function stripStartupBanner(source, label) {
    const banner = /^console\.log\('Date: [^']+'\);\nconsole\.log\('Version: [^']+'\);\nconsole\.log\('[^']+'\);\nconsole\.log\('[^']+'\);\n/;
    if (!banner.test(source)) throw new Error(`Missing ${label} startup banner`);
    return source.replace(banner, "");
}
response = stripStartupBanner(response, "response");
request = stripStartupBanner(request, "request");
const quietInit = `if (globalThis.$argument.LogLevel) Console.logLevel = globalThis.$argument.LogLevel;`;
const quietInitReplacement = `if (globalThis.$argument) globalThis.$argument.LogLevel = "OFF";\nConsole.logLevel = "OFF";\n${quietInit}`;
response = replaceOnce(response, quietInit, quietInitReplacement, "response initial log redaction");
request = replaceOnce(request, quietInit, quietInitReplacement, "request initial log redaction");

const inlineTools = await alertToolsSource();
response = replaceOnce(response, "async function Response($request, $response) {", `${inlineTools}\nasync function Response($request, $response) {`, "response alert codec");
request = replaceOnce(request, "async function Request($request) {", `${inlineTools}\nasync function Request($request) {`, "request alert codec");

const responseDiag = `\nconst __WK3_ALERTS_DIAG = { active: false, requested: 0, configured: 0, provider: "off", region: "unknown", result: "not_run", events: 0, sources: 0, parse: "na", eventDetails: [] };\nfunction __wk3DiagCount(value) { return Number.isInteger(value) && value >= 0 ? Math.min(value, 99) : 0; }\nfunction __wk3AlertEventDiag(events) { return (events || []).slice(0, 4).map((event, index) => { const c = event.counts || {}; const status = String(event.status || "unknown").replace(/[^a-z_]/g, "").slice(0, 40); const raw = Number.isInteger(event.rawSeverity) && event.rawSeverity >= 0 && event.rawSeverity <= 255 ? event.rawSeverity : "na"; const qsev = ["minor", "moderate", "severe", "extreme"].includes(event.qweatherSeverity) ? event.qweatherSeverity : "unknown"; const color = ["blue", "yellow", "orange", "red"].includes(event.governmentColor) ? event.governmentColor : "unknown"; return \`e\${index}=\${status}:r\${__wk3DiagCount(c.region)}t\${__wk3DiagCount(c.type)}s\${__wk3DiagCount(c.severity)}p\${__wk3DiagCount(c.issued)}c\${__wk3DiagCount(c.candidates)}:raw\${raw}:q\${qsev}:g\${color}\`; }).join(";"); }\nfunction __wk3AlertParseDiag(value) { if (!value || typeof value !== "object" || Object.keys(value).length === 0) return "na"; const d = value; return [d.blocks, d.skippedTitle, d.skippedIssueTime, d.unknownGovernmentColor].map(__wk3DiagCount).join(","); }\nfunction __wk3AlertsDiagHeader() { const d = __WK3_ALERTS_DIAG; const events = __wk3AlertEventDiag(d.eventDetails); return \`WK3WA/3;gate=\${d.requested}/\${d.configured};provider=\${d.provider};region=\${d.region};events=\${d.events};src=\${d.sources};parse=\${d.parse};link=\${d.result === "rewritten" ? "native_api" : "original"};\${events ? events + ";" : ""}result=\${d.result}\`; }\nfunction __wk3AttachAlertsDiag(response) { if (!__WK3_ALERTS_DIAG.active || !response) return; response.headers = response.headers || {}; response.headers["X-WK3-Alerts-Diag"] = __wk3AlertsDiagHeader(); }\n`;
response = replaceOnce(response, "async function Response($request, $response) {", `${responseDiag}\nasync function Response($request, $response) {`, "response alert diagnostics");
const typeLogHelpers = `
function __wk3AlertLogText(value) { return Array.from(String(value ?? "").replace(/[\\u0000-\\u001f\\u007f]/g, " ").replace(/\\s+/g, " ").trim()).slice(0, 160).join(""); }
function __wk3EmitAlertTypeDiagnostics(data) {
    if (!data) return;
    for (const event of data.apple || []) console.log("[WK3WA event] Apple e" + event.index + " type=" + JSON.stringify(__wk3AlertLogText(event.rawDescription)) + " normalized=" + JSON.stringify(__wk3AlertLogText(event.normalized)) + " typeId=" + __wk3AlertLogText(event.typeId || "unknown") + " severityRaw=" + event.rawSeverity + " severity=" + (event.verifiedSeverity || "unverified") + " experimentalSeverity=" + (event.experimentalSeverity || "none") + " issued=" + __wk3AlertLogText(event.issuedTime));
    for (const source of data.qweather || []) console.log("[WK3WA event] QWeather q" + source.index + " type=" + JSON.stringify(__wk3AlertLogText(source.rawEventName)) + " normalized=" + JSON.stringify(__wk3AlertLogText(source.normalizedEventName || source.normalizedMatchType)) + " typeId=" + __wk3AlertLogText(source.typeId || "unknown") + " eventCode=" + (source.eventTypeCode || "unavailable") + " severity=" + __wk3AlertLogText(source.qweatherSeverity) + " governmentColor=" + __wk3AlertLogText(source.governmentColor) + " issued=" + __wk3AlertLogText(source.issuedTime) + " lifecycle=" + source.lifecycle);
    for (const pair of data.comparisons || []) console.log("[WK3WA match] e" + pair.appleIndex + "/q" + pair.qweatherIndex + " region=" + Number(pair.region) + " type=" + Number(pair.type) + " severity=" + Number(pair.severity) + " issueTime=" + Number(pair.issueTime) + " unique=" + Number(pair.uniqueCandidate) + " lifecycle=" + pair.lifecycle + " matched=" + Number(pair.matched) + " alias=" + pair.alias + " appleOnly=" + JSON.stringify(__wk3AlertLogText(pair.appleOnly)) + " qweatherOnly=" + JSON.stringify(__wk3AlertLogText(pair.qweatherOnly)));
    for (const evidence of __WK3_ALERT_TOOLS.buildWK3Raw2SeverityEvidence(data)) console.log("[WK3WA raw2-evidence] " + JSON.stringify(evidence));
}
`;
response = replaceOnce(response, "async function Response($request, $response) {", `${typeLogHelpers}\nasync function Response($request, $response) {`, "alert type log helpers");
response = replaceOnce(response, "async function Response($request, $response) {\n", "async function Response($request, $response) {\n    if (globalThis.$argument) globalThis.$argument.LogLevel = \"OFF\";\n    Console.logLevel = \"OFF\";\n", "response log redaction");
response = replaceOnce(response, "    Console.logLevel = Settings.LogLevel;", "    Console.logLevel = Settings.LogLevel;\n    Console.logLevel = \"OFF\";", "response log redaction after settings");
response = replaceOnce(
    response,
    "    Object.assign(__WK3_NEXT_HOUR_DIAG, { active: url.hostname === \"weatherkit.apple.com\" && /^\\/api\\/v3\\/weather\\//.test(url.pathname), requested: 0, configured: 0, provider: \"off\", region: \"unknown\", replace: 0, gate: \"pending\", slot: \"not_checked\", source: \"not_called\", result: \"not_run\" });",
    "    Object.assign(__WK3_NEXT_HOUR_DIAG, { active: url.hostname === \"weatherkit.apple.com\" && /^\\/api\\/v3\\/weather\\//.test(url.pathname), requested: 0, configured: 0, provider: \"off\", region: \"unknown\", replace: 0, gate: \"pending\", slot: \"not_checked\", source: \"not_called\", result: \"not_run\" });\n    Object.assign(__WK3_ALERTS_DIAG, { active: url.hostname === \"weatherkit.apple.com\" && /^\\/api\\/v3\\/weather\\//.test(url.pathname), requested: 0, configured: 0, provider: \"off\", region: \"unknown\", result: \"not_requested\", events: 0, sources: 0, parse: \"na\", eventDetails: [] });",
    "response diagnostic initialization",
);
const nextHourGate = `                                const __nhProvider = Settings.NextHour?.Provider === "ColorfulClouds";\n                                const patchNextHour = __nhRequested && __nhConfigured && __nhProvider && __nhReplace;`;
response = replaceOnce(response, nextHourGate,
    `                                const __nhProvider = Settings.NextHour?.Provider === "ColorfulClouds";\n                                const patchNextHour = __nhRequested && __nhConfigured && __nhProvider && __nhReplace;\n                                const __waRequested = parameters.version === "v3" && parameters.dataSets.includes("weatherAlerts");\n                                const __waConfigured = Settings.DataSets.includes("weatherAlerts");\n                                const __waProvider = Settings.WeatherAlerts?.Provider === "QWeatherWeb";\n                                const patchAlerts = __waRequested && __waConfigured && __waProvider && __nhRegion;\n                                if (__WK3_ALERTS_DIAG.active) Object.assign(__WK3_ALERTS_DIAG, { requested: Number(__waRequested), configured: Number(__waConfigured), provider: __waProvider ? "qweatherweb" : (Settings.WeatherAlerts?.Provider ? "other" : "off"), region: __nhRegion ? "mainland" : "outside", result: patchAlerts ? "pending" : !__waRequested ? "not_requested" : !__waConfigured ? "setting_ds_off" : !__waProvider ? "provider_off" : "region_skip" });`,
    "alert processing gate");
response = replaceOnce(response,
    "                                if (dataSets.length === 0 && !patchNextHour) break;",
    "                                if (dataSets.length === 0 && !patchNextHour && !patchAlerts) break;",
    "alert-only response path");
response = replaceOnce(response,
    "                                if (body === null) { if (!patchNextHour) break; dataSets = []; body = {}; }",
    "                                if (body === null) { if (!patchNextHour && !patchAlerts) break; dataSets = []; body = {}; }",
    "alert processing after selective decode failure");
const encodeAnchor = "                                if (dataSets.length && !__nhRollbackOriginal) rawBody = WeatherKit.encode(ByteBuffer$1, body);\n                                break;";
response = replaceOnce(response, encodeAnchor,
    `                                if (dataSets.length && !__nhRollbackOriginal) {\n                                    rawBody = WeatherKit.encode(ByteBuffer$1, body);\n                                    for (const key of Object.keys($response.headers || {})) if (key.toLowerCase() === "content-length") delete $response.headers[key];\n                                }\n                                if (patchAlerts) {\n                                    const __waOutcome = await __WK3_ALERT_TOOLS.patchWK3QWeatherAlertsDiagnostic(rawBody, { language: parameters.language || "zh-CN", timezone: url.searchParams.get("timezone") || undefined, fetchImpl: async (target, options = {}) => fetch({ url: target, ...options, timeout: 8, "auto-cookie": false }) });\n                                    if (__waOutcome.bytes !== rawBody) {\n                                        rawBody = __waOutcome.bytes;\n                                        for (const key of Object.keys($response.headers || {})) if (key.toLowerCase() === "content-length") delete $response.headers[key];\n                                    }\n                                    __WK3_ALERTS_DIAG.result = __waOutcome.status;\n                                    __WK3_ALERTS_DIAG.events = __waOutcome.eventCount || 0;\n                                    __WK3_ALERTS_DIAG.sources = __waOutcome.sourceCount || 0;\n                                    __WK3_ALERTS_DIAG.parse = __wk3AlertParseDiag(__waOutcome.sourceDiagnostics);\n                                    __WK3_ALERTS_DIAG.eventDetails = __waOutcome.eventDiagnostics || [];\n                                    Console.info("[WK3] alerts", __wk3AlertsDiagHeader());\n                                }\n                                break;`,
    "alert patch after AQ and minute encoding");
response = replaceOnce(response,
    "        __wk3AttachNextHourDiag($response);\n        done($response);",
    "        __wk3AttachNextHourDiag($response);\n        __wk3AttachAlertsDiag($response);\n        done($response);",
    "alert diagnostic response header");
response = replaceOnce(response,
    "        Console.error(\"[WK3] response script failed\");",
    "        if (__WK3_ALERTS_DIAG.active) __WK3_ALERTS_DIAG.result = \"script_error\";\n        Console.error(\"[WK3] response script failed\");",
    "redacted alert script error");

const requestDiag = `\nfunction __wk3RequestDiag(result, route) { return \`WK3WD/2;route=\${route};result=\${result}\`; }\nasync function __wk3BuildNativeAlertResponse(ids, language, Settings, route) {\n    let result = "invalid_request", body = "[]";\n    const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };\n    try {\n        if (!Settings?.DataSets?.includes("weatherAlerts") || Settings?.WeatherAlerts?.Provider !== "QWeatherWeb") result = "provider_off";\n        else {\n            const originalLevel = Console.logLevel;\n            try { Console.logLevel = "OFF"; const alerts = await __WK3_ALERT_TOOLS.resolveNativeAlertDetails(ids, language, async (target, options = {}) => fetch({ url: target, ...options, timeout: 8, "auto-cookie": false })); body = JSON.stringify(alerts); result = alerts.length ? "details_served" : "details_empty"; }\n            finally { Console.logLevel = originalLevel; }\n        }\n    } catch { result = "details_unavailable"; }\n    headers["X-WK3-Alerts-Diag"] = __wk3RequestDiag(result, route);\n    return { status: 200, statusCode: 200, headers, body };\n}\n`;
request = replaceOnce(request, "async function Request($request) {", `${requestDiag}\nasync function Request($request) {`, "request alert handler");
request = replaceOnce(request, "async function Request($request) {\n", "async function Request($request) {\n    if (globalThis.$argument) globalThis.$argument.LogLevel = \"OFF\";\n    Console.logLevel = \"OFF\";\n", "request log redaction");
request = replaceOnce(request,
    "    Console.info(`url: ${url.toJSON()}`);",
    "    const __wk3NativeAlertRequest = url.hostname === \"weatherkit.apple.com\" && /^\\/api\\/v[12]\\/weatherAlerts$/.test(url.pathname) && __WK3_ALERT_TOOLS.isNativeAlertDetailsID(url.searchParams.get(\"ids\") || \"\");\n    if (__wk3NativeAlertRequest) Console.debug(\"[WK3] native alert details route\"); else Console.info(`url: ${url.toJSON()}`);",
    "redacted native alert request URL");
request = replaceOnce(request,
    `                        case "/api/v1/weatherAlerts": {\n                            $response = await GetWeatherAlerts(url.searchParams.get("ids")?.trim(), parameters, Settings, $request.headers);\n                            break;\n                        }`,
    `                        case "/api/v1/weatherAlerts":\n                        case "/api/v2/weatherAlerts": {\n                            const __alertIDs = url.searchParams.get("ids")?.trim() || "";\n                            if (__wk3NativeAlertRequest) $response = await __wk3BuildNativeAlertResponse(__alertIDs, url.searchParams.get("lang") || "zh-CN", Settings, url.pathname.split("/")[2] || "unknown");\n                            else if (url.pathname === "/api/v1/weatherAlerts") $response = await GetWeatherAlerts(__alertIDs, parameters, Settings, $request.headers);\n                            break;\n                        }`,
    "WK3 alert details request route");
request = replaceOnce(request, "    const { Settings, Caches } = setENV(\"iRingo\", \"WeatherKit\", database);", "    const { Settings, Caches } = setENV(\"iRingo\", \"WeatherKit\", database);\n    Console.logLevel = \"OFF\";", "request log redaction after settings");

response = replaceOnce(response,
    "                                    __WK3_ALERTS_DIAG.eventDetails = __waOutcome.eventDiagnostics || [];\n                                    Console.info(\"[WK3] alerts\", __wk3AlertsDiagHeader());",
    "                                    __WK3_ALERTS_DIAG.eventDetails = __waOutcome.eventDiagnostics || [];\n                                    __wk3EmitAlertTypeDiagnostics(__waOutcome.typeDiagnostics);\n                                    Console.info(\"[WK3] alerts\", __wk3AlertsDiagHeader());",
    "alert type diagnostics emission");

await mkdir(resolve(root, "artifacts"), { recursive: true });
await writeFile(resolve(root, "response.dev.bundle.js"), response);
await writeFile(resolve(root, "request.dev.bundle.js"), request);
console.log(JSON.stringify({
    buildType: "fixed-anchor augmentation of the device-verified Next Hour Provider Conversion bundles; not Rollup",
    baseResponseSha256: EXPECTED_RESPONSE,
    baseRequestSha256: EXPECTED_REQUEST,
    responseBundleSha256: hash(response),
    requestBundleSha256: hash(request),
    responseBytes: Buffer.byteLength(response),
    requestBytes: Buffer.byteLength(request),
}, null, 2));

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    // Running this file rebuilds both distributable scripts from the pinned stable bundles.
}
