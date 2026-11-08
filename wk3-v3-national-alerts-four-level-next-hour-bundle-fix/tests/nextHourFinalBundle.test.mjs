import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";
import { Metadata } from "../src/proto/apple/Metadata.mjs";

const bundle = readFileSync(new URL("../response.dev.bundle.js", import.meta.url), "utf8");
const fixture = new Uint8Array(readFileSync(new URL("./fixtures/wk3-aq.synthetic.bin", import.meta.url)));
const codecStart = "const __patchWK3NextHour = (() => {";
const codecEnd = "\n\n\nconst __WK3_NEXT_HOUR_DIAG =";

function loadFinalBundleAPI() {
    const start = bundle.indexOf(codecStart);
    const end = bundle.indexOf(codecEnd, start);
    assert.ok(start >= 0 && end > start, "compiled response contains the complete current Next Hour patch block");
    let block = bundle.slice(start, end);
    const returnAnchor = "return patchWK3NextHourDiagnostic;";
    assert.equal(block.split(returnAnchor).length, 2, "final bundle has one diagnostic adapter return anchor");
    block = block.replace(returnAnchor,
        "globalThis.__wk3NextHourFinalAPI = { providerToWK3NextHour, encodeNextHour, decodeNextHour, WK3NextHourTable, patchWK3NextHourDiagnostic };\n" + returnAnchor);

    const diagStart = bundle.indexOf("const __WK3_NEXT_HOUR_DIAG =");
    const diagEnd = bundle.indexOf("function __wk3AttachNextHourDiag", diagStart);
    assert.ok(diagStart >= 0 && diagEnd > diagStart, "final bundle contains the response-header formatter");
    const headerCode = bundle.slice(diagStart, diagEnd)
        + "\nglobalThis.__wk3NextHourFinalHeaderAPI = { state: __WK3_NEXT_HOUR_DIAG, header: __wk3NextHourDiagHeader };";

    const context = vm.createContext({ ByteBuffer, Builder, Uint8Array, DataView, mt: { Metadata } });
    vm.runInContext(block + "\n" + headerCode, context, { timeout: 5000 });
    return context;
}

const finalAPI = loadFinalBundleAPI();
const startTime = 1_799_280_000;

function providerForecast(symbol, { wet = true, timeline = "valid" } = {}) {
    const precipitationIntensity = wet ? 0.8 : 0;
    const precipitationChance = wet ? 80 : 0;
    const minutes = Array.from({ length: 60 }, (_, index) => ({
        startTime: startTime + index * 60,
        precipitationChance,
        precipitationIntensity,
        perceivedPrecipitationIntensity: precipitationIntensity,
    }));
    const summary = [{
        startTime: startTime + (timeline === "misaligned" ? 60 : 0),
        endTime: 0,
        condition: [symbol],
        precipitationChance,
        precipitationIntensity,
    }];
    const condition = [{
        startTime: summary[0].startTime,
        endTime: 0,
        forecastToken: "CONSTANT",
        beginCondition: symbol,
        endCondition: symbol,
        parameters: [],
    }];
    return {
        metadata: {
            attributionUrl: "https://www.caiyunapp.com/h5", expireTime: startTime + 900,
            language: "zh-CN", latitude: 0, longitude: 0, providerLogo: "",
            providerName: "彩云天气", readTime: startTime, reportedTime: startTime,
            temporarilyUnavailable: false, sourceType: "MODELED",
        },
        forecastStart: startTime, forecastEnd: startTime + 3600, minutes, summary, condition,
    };
}

function encodeAndDecode(provider) {
    const converted = finalAPI.__wk3NextHourFinalAPI.providerToWK3NextHour(provider, { intensityUnit: "mm/h", chanceUnit: "percent" });
    const builder = new Builder();
    builder.finish(finalAPI.__wk3NextHourFinalAPI.encodeNextHour(builder, converted));
    const bb = new ByteBuffer(builder.asUint8Array());
    const table = new finalAPI.__wk3NextHourFinalAPI.WK3NextHourTable().__init(bb.readUint32(0), bb);
    return finalAPI.__wk3NextHourFinalAPI.decodeNextHour(table);
}

function rootWithoutNextHour() {
    const bytes = fixture.slice();
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4 + 5 * 2);
    assert.ok(field, "known synthetic WK3 root has a serialized slot 5");
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(root + field, 0, true);
    return bytes;
}

test("final response bundle converts only wet DRIZZLE, HEAVY_RAIN, and POSSIBLE_DRIZZLE with aligned evidence", () => {
    for (const symbol of ["DRIZZLE", "HEAVY_RAIN", "POSSIBLE_DRIZZLE"]) {
        const decoded = encodeAndDecode(providerForecast(symbol));
        assert.deepEqual(Array.from(decoded.summary[0].condition), [2], `${symbol} uses b66 precipitation RAIN`);
        assert.equal(decoded.minutes.length, 60);
        assert.equal(decoded.minutes[0].startTime, startTime);
        assert.equal(decoded.minutes[0].precipitationChance, 80);
        assert.ok(Math.abs(decoded.minutes[0].precipitationIntensity - 0.8) < 0.000001);
        assert.equal(decoded.condition[0].beginCondition, symbol === "DRIZZLE" ? 8 : 7);
    }
});

test("final response bundle retains original bytes and formats detailed WK3NH/4 diagnostics on rejected summaries", async () => {
    const original = rootWithoutNextHour();
    for (const [symbol, options, expected] of [
        ["SNOW", { wet: true }, /stage=summary_enum;symbol=snow;wet=1;prob=1;arrays=1\/1\/60;interval=60;time=ok;pattern=snow/],
        ["POSSIBLE_DRIZZLE", { wet: false }, /stage=summary_enum;symbol=possible_drizzle;wet=0;prob=0;arrays=1\/1\/60;interval=60;time=ok;pattern=other/],
        ["FUTURE_CONDITION", { wet: true }, /stage=summary_enum;symbol=other;wet=1;prob=1;arrays=1\/1\/60;interval=60;time=ok;pattern=other/],
    ]) {
        const provider = providerForecast(symbol, options);
        const result = await finalAPI.__wk3NextHourFinalAPI.patchWK3NextHourDiagnostic(original, async () => provider);
        assert.equal(result.status, "provider_data_rejected_summary_enum");
        assert.deepEqual(Array.from(result.bytes), Array.from(original), "rejection leaves complete WK3/AQ bytes unchanged");
        assert.equal(result.diagnostic?.stage, "summary_enum");

        const headerAPI = finalAPI.__wk3NextHourFinalHeaderAPI;
        Object.assign(headerAPI.state, {
            active: true, requested: 1, configured: 1, provider: "cc", region: "mainland",
            replace: 1, gate: "on", slot: "slot_present_child_null", source: "source_called",
            result: result.status, detail: result.diagnostic,
        });
        const header = headerAPI.header();
        assert.match(header, /^WK3NH\/4;/);
        assert.match(header, expected);
        assert.doesNotMatch(header, /0\.8|80|latitude|longitude|token|response/i);
    }
});

test("final response wiring carries adapter diagnostics into the request-detail header", () => {
    assert.match(bundle, /__WK3_NEXT_HOUR_DIAG\.detail = __nhOutcome\.diagnostic \|\| null;/);
    assert.match(bundle, /function safeSummaryDiagnostic\(value\)/);
    assert.match(bundle, /unchanged\(safeCode, true, safeSummaryDiagnostic\(error\?\.wk3Diagnostic\)\)/);
    assert.match(bundle, /function verifiedLiquidSummary\(data, summary, index\)/);
    assert.doesNotMatch(bundle, /condition: names\.map\(c => mapEnum\("precipitation", c, "provider_data_rejected_summary_enum"\)\)/);
});
