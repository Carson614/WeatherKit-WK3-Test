import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const basePath = resolve(root, "artifacts/base/minfix-response.dev.bundle.js");
const outputPath = resolve(root, "response.dev.bundle.js");
const expectedBaseHash = "e9c1d40ce93e85b423dd2bae2b9775c3a5686a19d5b999ab74f8b10d25d15b28";
const hash = value => createHash("sha256").update(value).digest("hex");

let bundle = await readFile(basePath, "utf8");
if (hash(bundle) !== expectedBaseHash) throw new Error("MinFix response base hash mismatch");

let codec = await readFile(resolve(root, "src/class/WK3NextHour.mjs"), "utf8");
codec = codec
    .replace(/^import \{ ByteBuffer \} from "flatbuffers";\n/m, "")
    .replace(/^import \{ Metadata \} from .*;\n/m, "")
    .replace(/^export /gm, "");
let patcher = await readFile(resolve(root, "src/function/wk3NextHourFlatBuffer.mjs"), "utf8");
patcher = patcher
    .replace(/^import \{ Builder \} from "flatbuffers";\n/m, "")
    .replace(/^import \{ decodeWK3NextHour, encodeNextHour, providerToWK3NextHour \} from .*;\n/m, "")
    .replace(/^export function inspectWK3NextHourRootSlot\(/m, "function inspectWK3NextHourRootSlot(")
    .replace(/^export async function patchWK3NextHourDiagnostic\(/m, "async function patchWK3NextHourDiagnostic(")
    .replace(/^export async function patchWK3NextHour\(/m, "async function patchWK3NextHour(");

const inlineCodec = `\n/* WK3 b66 forecastNextHour codec, reused from upstream v3.3.6 (Apache-2.0). */\nconst __patchWK3NextHour = (() => {\nconst Metadata = mt.Metadata;\n${codec}\n${patcher}\nreturn patchWK3NextHourDiagnostic;\n})();\n`;
const responseMarker = "async function Response($request, $response) {";
if (bundle.split(responseMarker).length !== 2) throw new Error("Response insertion point is not unique");
bundle = bundle.replace(responseMarker, `${inlineCodec}\n${responseMarker}`);
const bufferDeclaration = "                    const ByteBuffer$1 = new ByteBuffer(rawBody);";
if (bundle.split(bufferDeclaration).length !== 2) throw new Error("Expected one response ByteBuffer declaration");
bundle = bundle.replace(bufferDeclaration, bufferDeclaration.replace("const ByteBuffer$1", "let ByteBuffer$1"));

const replacements = [
    [
        "                                const dataSets = parameters.dataSets.filter(dataSet => Settings.DataSets.includes(dataSet) && (parameters.version !== \"v3\" || dataSet === \"airQuality\") && (dataSet !== \"airQuality\" || shouldReplaceWeatherKit(parameters, Settings)));",
        "                                const patchNextHour = parameters.version === \"v3\" && parameters.dataSets.includes(\"forecastNextHour\") && Settings.DataSets.includes(\"forecastNextHour\") && Settings.NextHour?.Provider === \"ColorfulClouds\" && shouldReplaceWeatherKit(parameters, Settings);\n                                let __nhRollbackOriginal = false;\n                                let dataSets = parameters.dataSets.filter(dataSet => Settings.DataSets.includes(dataSet) && (parameters.version !== \"v3\" || dataSet === \"airQuality\") && (dataSet !== \"airQuality\" || shouldReplaceWeatherKit(parameters, Settings)));",
    ],
    ["                                if (dataSets.length === 0) break;", "                                if (dataSets.length === 0 && !patchNextHour) break;"],
    ["                                body = WeatherKit.decode(ByteBuffer$1, rootNames);", "                                body = dataSets.length ? WeatherKit.decode(ByteBuffer$1, rootNames) : {};"],
    ["                                if (body === null) break;", "                                if (body === null) { if (!patchNextHour) break; dataSets = []; body = {}; }"],
    [
        "                                if (Settings?.LogLevel === \"DEBUG\" || Settings?.LogLevel === \"ALL\") {\n                                    await matchEnum.init();\n                                }",
        "                                if (dataSets.length && (Settings?.LogLevel === \"DEBUG\" || Settings?.LogLevel === \"ALL\")) {\n                                    await matchEnum.init();\n                                }",
    ],
    [
        "                                rawBody = WeatherKit.encode(ByteBuffer$1, body);",
        "                                if (dataSets.length && !__nhRollbackOriginal) rawBody = WeatherKit.encode(ByteBuffer$1, body);",
    ],
];
for (const [before, after] of replacements) {
    if (bundle.split(before).length !== 2) throw new Error(`Expected one build anchor, found ${before.slice(0, 80)}`);
    bundle = bundle.replace(before, after);
}

function replaceOnce(text, before, after, label) {
    if (text.split(before).length !== 2) throw new Error(`Expected one ${label} anchor`);
    return text.replace(before, after);
}

// Track only the ColorfulClouds minute request outcome. No request body, token,
// URL, or coordinates are stored in the diagnostic state.
const ccStart = bundle.indexOf("class ColorfulClouds {");
const ccEnd = bundle.indexOf("class QWeather {", ccStart);
if (ccStart < 0 || ccEnd < 0) throw new Error("ColorfulClouds class anchors missing");
let colorfulClouds = bundle.slice(ccStart, ccEnd);
colorfulClouds = replaceOnce(
    colorfulClouds,
    `    async Minutely() {\n        Console.info("☑️ Minutely");\n        // 判断可用性：当前数据源不支持这个国家/地区\n        if (!this.#Config.Availability.Minutely.includes(this.country)) {`,
    `    async Minutely() {\n        this.nextHourSourceStatus = "not_called";\n        Console.info("☑️ Minutely");\n        // 判断可用性：当前数据源不支持这个国家/地区\n        if (!this.#Config.Availability.Minutely.includes(this.country)) {\n            this.nextHourSourceStatus = "region_unavailable";`,
    "ColorfulClouds minute gate",
);
colorfulClouds = replaceOnce(
    colorfulClouds,
    `        let forecastNextHour;\n        try {\n            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));`,
    `        let forecastNextHour;\n        let __wk3MinuteResponseReceived = false;\n        try {\n            const body = await fetch(request).then(response => JSON.parse(response?.body ?? "{}"));\n            __wk3MinuteResponseReceived = true;`,
    "ColorfulClouds minute fetch",
);
colorfulClouds = replaceOnce(
    colorfulClouds,
    `                            forecastNextHour.condition = ForecastNextHour.Condition(forecastNextHour.summary);\n                            break;`,
    `                            forecastNextHour.condition = ForecastNextHour.Condition(forecastNextHour.summary);\n                            this.nextHourSourceStatus = "ready";\n                            break;`,
    "ColorfulClouds minute normalization",
);
colorfulClouds = replaceOnce(
    colorfulClouds,
    `        } catch (error) {\n            Console.error(\`Minutely: \${error}\`);`,
    `        } catch (error) {\n            this.nextHourSourceStatus = __wk3MinuteResponseReceived ? "response_invalid" : "request_failed";\n            Console.error("Minutely: provider request/response failed");`,
    "ColorfulClouds minute error",
);
bundle = bundle.slice(0, ccStart) + colorfulClouds + bundle.slice(ccEnd);

const diagnosticBlock = `\nconst __WK3_NEXT_HOUR_DIAG = { active: false, requested: 0, configured: 0, provider: "off", region: "unknown", replace: 0, gate: "pending", slot: "not_checked", source: "not_called", result: "not_run" };\nfunction __wk3NextHourDiagHeader() {\n    const d = __WK3_NEXT_HOUR_DIAG;\n    return \`WK3NH/2;ds=\${d.requested}/\${d.configured};provider=\${d.provider};region=\${d.region};replace=\${d.replace};gate=\${d.gate};slot=\${d.slot};source=\${d.source};result=\${d.result}\`;\n}\nfunction __wk3AttachNextHourDiag(response) {\n    const d = __WK3_NEXT_HOUR_DIAG;\n    if (!d.active || !response) return;\n    response.headers = response.headers || {};\n    response.headers["X-WK3-NextHour-Diag"] = __wk3NextHourDiagHeader();\n}\n`;
bundle = replaceOnce(bundle, "async function Response($request, $response) {", `${diagnosticBlock}\nasync function Response($request, $response) {`, "response diagnostic block");
bundle = replaceOnce(
    bundle,
    "    const url = new URL($request.url);",
    `    const url = new URL($request.url);\n    Object.assign(__WK3_NEXT_HOUR_DIAG, { active: url.hostname === "weatherkit.apple.com" && /^\\/api\\/v3\\/weather\\//.test(url.pathname), requested: 0, configured: 0, provider: "off", region: "unknown", replace: 0, gate: "pending", slot: "not_checked", source: "not_called", result: "not_run" });`,
    "diagnostic request scope",
);
bundle = replaceOnce(bundle, "    Console.info(\`url: \${url.toJSON()}\`);", "    Console.debug(\"[WK3] response route\");", "URL log redaction");
bundle = replaceOnce(bundle, "    Console.info(\`PATHs: \${PATHs}\`);", "    Console.debug(\"[WK3] route parsed\");", "path log redaction");
bundle = replaceOnce(
    bundle,
    "                                const patchNextHour = parameters.version === \"v3\" && parameters.dataSets.includes(\"forecastNextHour\") && Settings.DataSets.includes(\"forecastNextHour\") && Settings.NextHour?.Provider === \"ColorfulClouds\" && shouldReplaceWeatherKit(parameters, Settings);",
    `                                const __nhRegion = isChinaMainland(parameters);\n                                const __nhReplace = shouldReplaceWeatherKit(parameters, Settings);\n                                const __nhRequested = parameters.version === "v3" && parameters.dataSets.includes("forecastNextHour");\n                                const __nhConfigured = Settings.DataSets.includes("forecastNextHour");\n                                const __nhProvider = Settings.NextHour?.Provider === "ColorfulClouds";\n                                const patchNextHour = __nhRequested && __nhConfigured && __nhProvider && __nhReplace;\n                                if (__WK3_NEXT_HOUR_DIAG.active) {\n                                    Object.assign(__WK3_NEXT_HOUR_DIAG, {\n                                        requested: Number(__nhRequested), configured: Number(__nhConfigured),\n                                        provider: __nhProvider ? "cc" : (Settings.NextHour?.Provider ? "other" : "off"),\n                                        region: __nhRegion ? "mainland" : "outside", replace: Number(__nhReplace),\n                                        gate: patchNextHour ? "on" : !__nhRequested ? "request_ds_off" : !__nhConfigured ? "setting_ds_off" : !__nhProvider ? "provider_off" : "region_skip",\n                                    });\n                                }`,
    "nextHour gate diagnostics",
);
const preflightAnchor = "                                await Promise.all(\n                                    dataSets.map";
const preflightBlock = `                                if (patchNextHour) {\n                                    const __nhOutcome = await __patchWK3NextHour(rawBody, () => enviroments.colorfulClouds.Minutely(), () => enviroments.colorfulClouds.nextHourSourceStatus);\n                                    rawBody = __nhOutcome.bytes;\n                                    ByteBuffer$1 = new ByteBuffer(rawBody);\n                                    __nhRollbackOriginal = ["invalid_body", "root_invalid", "root_slot_invalid", "native_child_pointer_invalid", "native_child_decode_failed", "encode_rejected", "merge_rejected"].includes(__nhOutcome.status) || __nhOutcome.status.startsWith("root_rebuild_");\n                                    if (__nhRollbackOriginal) { dataSets = []; body = {}; }\n                                    if (__WK3_NEXT_HOUR_DIAG.active) {\n                                        const slot = __nhOutcome.slotStatus;\n                                        __WK3_NEXT_HOUR_DIAG.slot = slot === "root_vtable_short" ? "vtable_entry_absent" : slot === "root_slot_offset_zero" ? "slot_offset_zero" : slot === "root_slot_empty" ? "slot_present_child_null" : slot === "native_child_present" ? "native_child_present" : slot;\n                                        __WK3_NEXT_HOUR_DIAG.source = __nhOutcome.sourceCalled ? "source_called" : "not_called";\n                                        __WK3_NEXT_HOUR_DIAG.result = __nhOutcome.status;\n                                    }\n                                    Console.info("[WK3] nextHour diagnostic", __wk3NextHourDiagHeader());\n                                }\n`;
bundle = replaceOnce(bundle, preflightAnchor, `${preflightBlock}${preflightAnchor}`, "nextHour structural preflight");
bundle = replaceOnce(
    bundle,
    "                            const parameters = parseWeatherKitURL(url);",
    `                            const parameters = parseWeatherKitURL(url);\n                                if (__WK3_NEXT_HOUR_DIAG.active) __WK3_NEXT_HOUR_DIAG.result = "parsed";`,
    "parsed route diagnostics",
);
bundle = replaceOnce(
    bundle,
    "!(async () => {\n    $response = await Response($request, $response);\n})()\n    .catch(e => Console.error(e))\n    .finally(() => done($response));",
    `!(async () => {\n    $response = await Response($request, $response);\n})()\n    .catch(e => {\n        if (__WK3_NEXT_HOUR_DIAG.active) __WK3_NEXT_HOUR_DIAG.result = "script_error";\n        Console.error("[WK3] response script failed");\n    })\n    .finally(() => {\n        __wk3AttachNextHourDiag($response);\n        done($response);\n    });`,
    "final diagnostic response",
);
bundle = replaceOnce(
    bundle,
    `Console.info("✅ parseWeatherKitURL", \`🟧version: \${result.version} 🟧language: \${result.language} 🟧country: \${result.country}\`, \`🟧latitude: \${result.latitude} 🟧longitude: \${result.longitude}\`);`,
    `Console.debug("✅ parseWeatherKitURL", \`version: \${result.version} language: \${result.language} country: \${result.country}\`);`,
    "coordinate log redaction",
);
bundle = replaceOnce(bundle, "    Console.info(\`typeof Settings: \${typeof Settings}\`, \`Settings: \${JSON.stringify(Settings, null, 2)}\`);", "    Console.debug(\`typeof Settings: \${typeof Settings}\`);", "settings token log redaction");
bundle = replaceOnce(bundle, "                                                Console.debug(\`body.forecastNextHour: \${JSON.stringify(body?.forecastNextHour, null, 2)}\`);", "                                                Console.debug(\"[WK3] native nextHour present\");", "response body log redaction");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, bundle);
console.log(JSON.stringify({
    buildType: "deterministic fixed-anchor augmentation of the verified MinFix bundle; not a full Rollup build",
    baseSha256: expectedBaseHash,
    outputSha256: hash(bundle),
    outputBytes: Buffer.byteLength(bundle),
}, null, 2));
