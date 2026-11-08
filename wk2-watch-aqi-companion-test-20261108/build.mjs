import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL(".", import.meta.url));
const upstreamPath = new URL("./vendor/nsringo-weatherkit-v3.3.2-response.bundle.js", import.meta.url);
const guardPath = new URL("./watch-aqi-guard.runtime.js", import.meta.url);
const outputPath = new URL("./response.bundle.js", import.meta.url);
const expectedUpstreamSha256 = "ce1db90d77c44fce972db0c2e319845fc1d6a276d41d772c0294882e59d7f999";
const bytes = await readFile(upstreamPath);
assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedUpstreamSha256, "pinned official NSRingo v3.3.2 source bundle changed");

const guard = await readFile(guardPath, "utf8");
let bundle = bytes.toString("utf8");

const bannerAnchor = 'console.log("Date: 2026/8/29 16:12:56"),console.log("Version: 3.3.2"),console.log("response.bundle.js"),console.log(" iRingo: 🌤 WeatherKit");';
assert.equal(bundle.split(bannerAnchor).length - 1, 1, "expected the pinned upstream startup banner once");
bundle = bundle.replace(bannerAnchor, "");

const scaleAnchor = 'EPA_NowCast:{weatherKitScale:{name:"EPA_NowCast"},categories:';
assert.equal(bundle.split(scaleAnchor).length - 1, 1, "expected one upstream EPA_NowCast scale definition");
bundle = bundle.replace(scaleAnchor, 'EPA_NowCast:{weatherKitScale:{name:"EPA_NowCast",version:"2604"},categories:');

const encodeAnchor = ",t=Nt.encode(i,l);break";
assert.equal(bundle.split(encodeAnchor).length - 1, 1, "expected one WK2 root encoder call");
bundle = bundle.replace(
    encodeAnchor,
    ";try{t=Nt.encode(i,l)}catch(__wk2EncodeError){globalThis.__wk2WatchAQI.encodeFailed=true;throw __wk2EncodeError}break",
);

const startAnchor = "(async()=>{$response=await Pt($request,$response)})().catch(t=>e.error(t)).finally(";
assert.equal(bundle.split(startAnchor).length - 1, 1, "expected one final Surge response entrypoint");
const start = bundle.indexOf(startAnchor);
bundle = `${bundle.slice(0, start)};(()=>{\nconst __wk2GuardState=(()=>{\n${guard}\nreturn globalThis.__wk2WatchAQI;\n})();\nif(__wk2GuardState?.stop)return;\n${bundle.slice(start)}\n})();\n`;
await writeFile(outputPath, bundle);

const report = {
    upstream: {
        repository: "https://github.com/NSRingo/WeatherKit",
        release: "v3.3.2",
        sourceCommit: "c40e8f8a13c8304a7ef500cb74acc5948af14b3f",
        responseBundleSha256: expectedUpstreamSha256,
    },
    output: {
        file: "response.bundle.js",
        sha256: createHash("sha256").update(await readFile(outputPath)).digest("hex"),
        guardSha256: createHash("sha256").update(guard).digest("hex"),
    },
    constraints: [
        "Module rule matches only /api/v2/weather/.",
        "Runtime requires explicit country=CN, explicit airQuality dataSet, WK2.Weather FlatBuffer response, and valid coordinates/root table.",
        "Existing AQ roots are preserved byte-for-byte and are not sent to a provider.",
        "Missing AQ root is encoded only through the pinned NSRingo WeatherKit2 codec.",
        "Output must contain fresh, in-range EPA_NowCast.2604 AQI with matching category and provider coordinates within 10 km; otherwise original bytes are restored.",
    ],
};
await writeFile(new URL("./build-report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
