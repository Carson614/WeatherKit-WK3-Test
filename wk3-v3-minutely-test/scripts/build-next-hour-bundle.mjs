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
    .replace(/^export async function patchWK3NextHour/m, "async function patchWK3NextHour");

const inlineCodec = `\n/* WK3 b66 forecastNextHour codec, reused from upstream v3.3.6 (Apache-2.0). */\nconst __patchWK3NextHour = (() => {\nconst Metadata = mt.Metadata;\n${codec}\n${patcher}\nreturn patchWK3NextHour;\n})();\n`;
const responseMarker = "async function Response($request, $response) {";
if (bundle.split(responseMarker).length !== 2) throw new Error("Response insertion point is not unique");
bundle = bundle.replace(responseMarker, `${inlineCodec}\n${responseMarker}`);
const bufferDeclaration = "                    const ByteBuffer$1 = new ByteBuffer(rawBody);";
if (bundle.split(bufferDeclaration).length !== 2) throw new Error("Expected one response ByteBuffer declaration");
bundle = bundle.replace(bufferDeclaration, bufferDeclaration.replace("const ByteBuffer$1", "let ByteBuffer$1"));

const replacements = [
    [
        "                                const dataSets = parameters.dataSets.filter(dataSet => Settings.DataSets.includes(dataSet) && (parameters.version !== \"v3\" || dataSet === \"airQuality\") && (dataSet !== \"airQuality\" || shouldReplaceWeatherKit(parameters, Settings)));",
        "                                const patchNextHour = parameters.version === \"v3\" && parameters.dataSets.includes(\"forecastNextHour\") && Settings.DataSets.includes(\"forecastNextHour\") && Settings.NextHour?.Provider === \"ColorfulClouds\" && shouldReplaceWeatherKit(parameters, Settings);\n                                let dataSets = parameters.dataSets.filter(dataSet => Settings.DataSets.includes(dataSet) && (parameters.version !== \"v3\" || dataSet === \"airQuality\") && (dataSet !== \"airQuality\" || shouldReplaceWeatherKit(parameters, Settings)));",
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
        "                                if (patchNextHour) {\n                                    const before = rawBody;\n                                    rawBody = await __patchWK3NextHour(rawBody, () => enviroments.colorfulClouds.Minutely());\n                                    ByteBuffer$1 = new ByteBuffer(rawBody);\n                                    Console.info(\"[WK3] nextHour\", rawBody === before ? \"unchanged; native data kept\" : \"updated from ColorfulClouds\");\n                                }\n                                if (dataSets.length) rawBody = WeatherKit.encode(ByteBuffer$1, body);",
    ],
];
for (const [before, after] of replacements) {
    if (bundle.split(before).length !== 2) throw new Error(`Expected one build anchor, found ${before.slice(0, 80)}`);
    bundle = bundle.replace(before, after);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, bundle);
console.log(JSON.stringify({
    buildType: "deterministic fixed-anchor augmentation of the verified MinFix bundle; not a full Rollup build",
    baseSha256: expectedBaseHash,
    outputSha256: hash(bundle),
    outputBytes: Buffer.byteLength(bundle),
}, null, 2));
