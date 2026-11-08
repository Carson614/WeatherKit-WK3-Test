import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";
import { decodeWK3NextHour } from "../src/class/WK3NextHour.mjs";

const bundleUrl = new URL("../response.dev.bundle.js", import.meta.url);
const fixture = new Uint8Array(readFileSync(new URL("./fixtures/wk3-aq.synthetic.bin", import.meta.url)));
const realtimePayload = {
    status: "ok",
    result: { realtime: { status: "ok", air_quality: {
        obs_time: "2026-11-06T08:00:00+08:00", description: { usa: "Moderate", chn: "良" },
        aqi: { usa: 67, chn: 60 }, pm25: 30, pm10: 40, o3: 50, no2: 20, so2: 5, co: 0.5,
    } } }, location: [31.25, 121.5],
};
const yesterdayPayload = {
    status: "ok", result: { hourly: { status: "ok", air_quality: { aqi: [{ value: { usa: 25, chn: 20 } }] } } }, location: [31.25, 121.5],
};

function noNextHour(bytes = fixture) {
    const copy = bytes.slice(), bb = new ByteBuffer(copy), root = bb.readUint32(0), field = bb.__offset(root, 4 + 5 * 2);
    assert.ok(field);
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint32(root + field, 0, true);
    return copy;
}

function withoutAQ(bytes) {
    const copy = bytes.slice(), bb = new ByteBuffer(copy), root = bb.readUint32(0), vtable = root - bb.readInt32(root);
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint16(vtable + 4, 0, true);
    return copy;
}

function withoutNextHourRootSlot(bytes) {
    const copy = bytes.slice(), bb = new ByteBuffer(copy), root = bb.readUint32(0), vtable = root - bb.readInt32(root);
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint16(vtable, 4 + 5 * 2, true);
    return copy;
}

function withZeroNextHourRootField(bytes) {
    const copy = bytes.slice(), bb = new ByteBuffer(copy), root = bb.readUint32(0), vtable = root - bb.readInt32(root);
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint16(vtable + 4 + 5 * 2, 0, true);
    return copy;
}

function withBrokenOpaqueRootPointer(bytes, slot = 17) {
    const copy = bytes.slice(), bb = new ByteBuffer(copy), root = bb.readUint32(0), field = bb.__offset(root, 4 + slot * 2);
    assert.ok(field, `fixture has opaque root slot ${slot}`);
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint32(root + field, 0xffffffff, true);
    return copy;
}

function withBrokenAQPointer(bytes) {
    const copy = bytes.slice(), bb = new ByteBuffer(copy), root = bb.readUint32(0), field = bb.__offset(root, 4);
    assert.ok(field);
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint32(root + field, 0xffffffff, true);
    return copy;
}

function opaqueRootTarget(bytes, slot = 17) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4 + slot * 2);
    return field ? root + field + bb.readUint32(root + field) : 0;
}

function opaqueSummary(bytes, slot = 17) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4 + slot * 2), target = field ? root + field + bb.readUint32(root + field) : 0;
    if (!target) return { root, field, target };
    const vt = target - bb.readInt32(target), length = bb.readUint16(vt), size = bb.readUint16(vt + 2);
    const childField = bb.__offset(target, 4), value = childField ? bb.__string(target + childField) : undefined;
    return { root, field, target, length, size, table: Array.from(bytes.slice(target, target + size)), vtable: Array.from(bytes.slice(vt, vt + length)), value };
}

function rootTableWire(bytes, slot) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4 + slot * 2);
    if (!field) return null;
    const target = root + field + bb.readUint32(root + field), vtable = target - bb.readInt32(target);
    const vtableLength = bb.readUint16(vtable), objectLength = bb.readUint16(vtable + 2);
    return {
        vtable: Array.from(bytes.slice(vtable, vtable + vtableLength)),
        table: Array.from(bytes.slice(target, target + objectLength)),
    };
}

function readAq(bytes) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4);
    if (!field) return undefined;
    const table = bb.__indirect(root + field), scalar = (offset, method) => {
        const item = bb.__offset(table, offset); return item ? bb[method](table + item) : 0;
    };
    const scale = bb.__offset(table, 18);
    return {
        categoryIndex: scalar(6, "readInt8"), index: scalar(8, "readInt16"), comparison: scalar(14, "readInt8"),
        scale: scale ? bb.__string(table + scale) : undefined,
    };
}

function caiyunMinutelySample(forecast) {
    const precipitation = Array(120).fill(0);
    const put = (from, to, amountAt) => {
        for (let minute = from; minute < to; minute++) {
            precipitation[minute] = typeof amountAt === "function" ? amountAt(minute - from) : amountAt;
        }
    };
    switch (forecast) {
        case "dry": break;
        case "continuous": put(0, 85, 0.12); break;
        case "heavy": put(0, 85, 18); break;
        case "start": put(24, 85, 0.8); break;
        case "stop": put(0, 24, 0.8); break;
        case "intensity_change": put(0, 20, 0.2); put(20, 40, 5.2); put(40, 85, 18.4); break;
        case "rain_dry_rain": put(0, 15, 0.8); put(30, 85, 1.2); break;
        case "too_many_transitions": put(5, 15, 0.8); put(25, 35, 1.2); put(45, 55, 0.8); break;
        case "snow": put(0, 85, 2); break;
        case "hail": put(0, 85, 2); break;
        case "invalid_probability": break;
        case "rain": put(4, 12, 0.3); put(12, 22, 1.2); break;
        default: throw new TypeError("Unknown synthetic Caiyun sample");
    }
    return {
        status: "ok",
        server_time: 1_799_280_000,
        location: [0, 0],
        result: { minutely: {
            status: "ok",
            probability: forecast === "dry" ? [0, 0, 0, 0] : forecast === "invalid_probability" ? [1.2, 0.61, 0.33, 0.12] : [0.82, 0.61, 0.33, 0.12],
            precipitation_2h: precipitation,
            description: forecast === "dry" || forecast === "invalid_probability" ? "未来两小时没有降水" : forecast === "snow" ? "snow" : forecast === "hail" ? "冰雹" : "未来两小时有降雨",
        } },
    };
}

function responseFixture({ forecast = "rain", minutelyFailure = false, disableNextHour = false, body,
    requestDataSets = "airQuality,forecastNextHour", settingDataSets = ["airQuality", "forecastNextHour"],
    latitude = 31.25, longitude = 121.5, country = "CN" } = {}) {
    globalThis.$environment = { "surge-version": "test" };
    globalThis.$script = { startTime: Date.now() / 1000 };
    globalThis.$request = { method: "GET", headers: {}, url: `https://weatherkit.apple.com/api/v3/weather/zh-Hans-US/${latitude}/${longitude}?timezone=Asia%2FShanghai&country=${country}&dataSets=${encodeURIComponent(requestDataSets)}` };
    globalThis.$response = { status: 200, headers: { "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather" }, bodyBytes: body };
    globalThis.$argument = {
        Storage: "Argument", LogLevel: "OFF", DataSets: settingDataSets,
        Weather: { Replace: ["CN"] }, NextHour: { Provider: disableNextHour ? "WeatherKit" : "ColorfulClouds" },
        AirQuality: {
            Current: { Index: { Provider: "ColorfulCloudsUS", Replace: ["HJ6332012", "EU.EAQI", "CN_AQHI", "EPA_NowCast"] },
                Pollutants: { Provider: "ColorfulClouds", Units: { Replace: [], Mode: "Scale" } } },
            Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { IndexProvider: "ColorfulCloudsUS" } },
        },
    };
    globalThis.$persistentStore = { read: () => null, write: () => true };
    const requests = [];
    globalThis.$httpClient = {
        get(request, callback) {
            const requestUrl = typeof request === "string" ? request : request.url;
            requests.push(requestUrl);
            if (requestUrl.includes("/minutely")) {
                if (minutelyFailure) return callback(null, { status: 503, headers: {} }, "{}");
                return callback(null, { status: 200, headers: {} }, JSON.stringify(caiyunMinutelySample(forecast)));
            }
            if (requestUrl.includes("/realtime")) return callback(null, { status: 200, headers: {} }, JSON.stringify(realtimePayload));
            if (requestUrl.includes("/hourly")) return callback(null, { status: 200, headers: {} }, JSON.stringify(yesterdayPayload));
            callback(null, { status: 404, headers: {} }, "{}");
        },
    };
    return requests;
}

let replayQueue = Promise.resolve();
function invoke(options = {}) {
    const replay = replayQueue.then(() => invokeOnce(options));
    replayQueue = replay.then(() => undefined, () => undefined);
    return replay;
}

async function invokeOnce(options = {}) {
    const original = options.body ?? noNextHour();
    const requests = responseFixture({ ...options, body: original });
    let target = `${bundleUrl.href}?replay=${Math.random()}`;
    let temporaryDirectory;
    if (options.normalizedProvider) {
        const anchor = "const __nhOutcome = await __patchWK3NextHour(rawBody, () => enviroments.colorfulClouds.Minutely(), () => enviroments.colorfulClouds.nextHourSourceStatus);";
        const originalBundle = await readFile(bundleUrl, "utf8");
        assert.equal(originalBundle.split(anchor).length, 2, "generated response has one provider adapter call site");
        const testBundle = originalBundle.replace(anchor,
            "const __nhOutcome = await __patchWK3NextHour(rawBody, () => globalThis.__WK3_FINAL_BUNDLE_PROVIDER, () => enviroments.colorfulClouds.nextHourSourceStatus);");
        temporaryDirectory = await mkdtemp(join(tmpdir(), "wk3-final-response-"));
        const testPath = join(temporaryDirectory, "response.dev.bundle.mjs");
        await writeFile(testPath, testBundle);
        globalThis.__WK3_FINAL_BUNDLE_PROVIDER = options.normalizedProvider;
        target = pathToFileURL(testPath).href;
    }
    let result;
    try {
        result = await new Promise((resolve, reject) => {
            globalThis.$done = resolve;
            import(target).catch(reject);
        });
    } finally {
        delete globalThis.__WK3_FINAL_BUNDLE_PROVIDER;
        if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
    }
    assert.ok(result.body instanceof Uint8Array, "Surge binary-body-mode keeps a Uint8Array");
    assert.equal(result.response, undefined, "$done receives the top-level response shape");
    assert.equal(result.headers["Content-Type"], "application/vnd.apple.flatbuffer;messageType=WK3.Weather");
    assert.equal(typeof result.headers["X-WK3-NextHour-Diag"], "string");
    assert.match(result.headers["X-WK3-NextHour-Diag"], /^WK3NH\/5;/);
    return { original, bytes: result.body, requests, headers: result.headers };
}

function normalizedProviderSummary(symbol, { conditionSymbol = symbol, wet = true, intensity = 0.8, probability = 80, timeline = "valid" } = {}) {
    const start = 1_799_280_000;
    const minutes = Array.from({ length: 60 }, (_, index) => ({ startTime: start + index * 60 + (timeline === "broken_minute" && index === 20 ? 60 : 0), precipitationChance: wet ? probability : 0, precipitationIntensity: wet ? intensity : 0, perceivedPrecipitationIntensity: wet ? intensity : 0 }));
    const summary = [{ startTime: start + (timeline === "misaligned_summary" ? 60 : 0), endTime: 0, condition: [symbol], precipitationChance: wet ? probability : 0, precipitationIntensity: wet ? intensity : 0 }];
    return {
        metadata: { attributionUrl: "https://www.caiyunapp.com/h5", expireTime: start + 900, language: "zh-CN", latitude: 0, longitude: 0, providerLogo: "", providerName: "彩云天气", readTime: start, reportedTime: start, temporarilyUnavailable: false, sourceType: "MODELED" },
        forecastStart: start, forecastEnd: start + 3600, minutes, summary,
        condition: [{ startTime: summary[0].startTime, endTime: 0, forecastToken: "CONSTANT", beginCondition: conditionSymbol, endCondition: conditionSymbol, parameters: [] }],
    };
}

test("combined AQI and minute-rain writes keep EPA AQI, opaque root slots, and encode/decode consistency", async () => {
    const original = withoutAQ(noNextHour());
    const { bytes, requests, headers } = await invoke({ body: original });
    const aq = readAq(bytes), nextHour = decodeWK3NextHour(bytes);
    assert.ok(nextHour, headers["X-WK3-NextHour-Diag"]);
    assert.equal(aq.scale, "EPA_NowCast.2604");
    assert.equal(aq.index, 67);
    assert.equal(aq.categoryIndex, 2);
    assert.equal(aq.comparison, 2);
    assert.equal(nextHour.minutes.length, 85);
    assert.ok(Math.abs(nextHour.minutes[4].precipitationIntensity - 0.3) < 0.00001);
    assert.ok(Math.abs(nextHour.minutes[12].precipitationIntensity - 1.2) < 0.00001);
    assert.equal(nextHour.minutes[22].precipitationIntensity, 0);
    const opaqueAfter = opaqueSummary(bytes);
    assert.notEqual(opaqueRootTarget(bytes), 0);
    assert.deepEqual(opaqueAfter.table, opaqueSummary(original).table);
    assert.deepEqual(opaqueAfter.vtable, opaqueSummary(original).vtable);
    assert.equal(opaqueAfter.value, opaqueSummary(original).value);
    assert.ok(requests.some(url => url.includes("/realtime")));
    assert.ok(requests.some(url => url.includes("/hourly")));
    assert.ok(requests.some(url => url.includes("/minutely")));
    assert.match(headers["X-WK3-NextHour-Diag"], /ds=1\/1;provider=cc;region=mainland;replace=1;gate=on;slot=slot_present_child_null;source=source_called;result=injected/);
    assert.doesNotMatch(headers["X-WK3-NextHour-Diag"], /31\.25|121\.5|token|obs_time/i);
});

test("a valid no-rain response is encoded as dry minutes, not treated as a source failure", async () => {
    const { bytes, requests, headers } = await invoke({ forecast: "dry" });
    const nextHour = decodeWK3NextHour(bytes);
    assert.equal(nextHour.minutes.length, 85);
    assert.ok(nextHour.minutes.every(minute => minute.precipitationIntensity === 0));
    assert.equal(nextHour.summary[0].condition[0], 1, "WK3 clear precipitation enum");
    assert.ok(requests.some(url => url.includes("/minutely")));
    assert.match(headers["X-WK3-NextHour-Diag"], /result=injected/);
});

test("final bundle preserves measured snow minutes when the provider emits an unnumbered FLURRIES description", async () => {
    const original = noNextHour();
    const { bytes, requests, headers } = await invoke({ body: original, forecast: "snow" });
    const nextHour = decodeWK3NextHour(bytes);
    assert.ok(nextHour, headers["X-WK3-NextHour-Diag"]);
    assert.equal(headers["X-WK3-NextHour-Diag"].split(";result=")[1], "injected");
    assert.deepEqual(Array.from(nextHour.summary[0].condition), [3], "snow remains WK3 precipitation.SNOW");
    assert.deepEqual(nextHour.condition, [], "unnumbered FLURRIES is omitted as a whole WK3 condition vector");
    assert.equal(nextHour.minutes.length, 85);
    assert.equal(nextHour.minutes[0].precipitationIntensity, 2);
    assert.equal(nextHour.minutes[0].precipitationChance, 82);
    assert.ok(requests.some(url => url.includes("/minutely")));
    assert.equal(readAq(bytes).scale, "EPA_NowCast.2604");
});

test("final bundle still fails open when the generator filters an unsupported non-snow condition", async () => {
    const original = noNextHour();
    const { bytes, headers } = await invoke({ body: original, forecast: "hail" });
    assert.equal(decodeWK3NextHour(bytes), null, "unsupported phase does not get an invented condition or precipitation vector");
    assert.match(headers["X-WK3-NextHour-Diag"], /result=provider_data_rejected_arrays;stage=arrays;.*case=generator_condition_missing/);
    assert.equal(readAq(bytes).scale, "EPA_NowCast.2604");
});

test("anonymous Caiyun probability fractions and continuous drizzle retain minute timestamps and intensity", async () => {
    const { bytes, headers } = await invoke({ forecast: "continuous" });
    const nextHour = decodeWK3NextHour(bytes);
    assert.equal(headers["X-WK3-NextHour-Diag"].split(";result=")[1], "injected");
    assert.equal(nextHour.minutes.length, 85);
    assert.equal(nextHour.forecastEnd - nextHour.forecastStart, 85 * 60);
    assert.deepEqual(nextHour.minutes.slice(0, 4).map(minute => minute.startTime), Array.from({ length: 4 }, (_, i) => nextHour.forecastStart + i * 60));
    assert.equal(nextHour.minutes[0].precipitationChance, 82);
    assert.equal(nextHour.minutes[30].precipitationChance, 61);
    assert.equal(nextHour.minutes[60].precipitationChance, 33);
    assert.ok(Math.abs(nextHour.minutes[0].precipitationIntensity - 0.12) < 0.00001);
    assert.equal(nextHour.condition[0].beginCondition, 7, "possible drizzle uses the confirmed coarse RAIN enum");
});

test("heavy rain and intensity changes encode using confirmed rain enum while preserving the numeric minute series", async () => {
    const heavy = await invoke({ forecast: "heavy" });
    const heavyNextHour = decodeWK3NextHour(heavy.bytes);
    assert.equal(heavy.headers["X-WK3-NextHour-Diag"].split(";result=")[1], "injected");
    assert.equal(heavyNextHour.condition[0].beginCondition, 7, "HEAVY_RAIN maps only to the b66-confirmed RAIN enum");
    assert.equal(heavyNextHour.minutes[0].precipitationIntensity, 18);

    const changing = await invoke({ forecast: "intensity_change" });
    const changingNextHour = decodeWK3NextHour(changing.bytes);
    assert.equal(changing.headers["X-WK3-NextHour-Diag"].split(";result=")[1], "injected");
    [0, 20, 40, 84].forEach((i, j) => assert.ok(Math.abs(changingNextHour.minutes[i].precipitationIntensity - [0.2, 5.2, 18.4, 18.4][j]) < 0.00001));
    assert.equal(changingNextHour.summary.length, 1, "intensity changes alone do not split the broad RAIN summary timeline");
});

test("final response bundle injects snowfall without changing its phase, intensity, AQI, or opaque root fields", async () => {
    const original = noNextHour();
    const snow = await invoke({ body: original, normalizedProvider: normalizedProviderSummary("SNOW", { conditionSymbol: "HEAVY_SNOW", intensity: 3.4 }) });
    const decoded = decodeWK3NextHour(snow.bytes);
    assert.equal(snow.headers["X-WK3-NextHour-Diag"].split(";result=")[1], "injected");
    assert.deepEqual(decoded.summary.map(item => item.condition), [[3]]);
    assert.equal(decoded.condition[0].beginCondition, 10);
    assert.equal(decoded.minutes[0].precipitationIntensity, Math.fround(3.4));
    assert.equal(decoded.minutes[0].precipitationChance, 80);
    assert.equal(decoded.minutes[59].startTime, decoded.forecastStart + 59 * 60);
    assert.equal(decoded.forecastEnd, decoded.forecastStart + 3600);
    assert.equal(readAq(snow.bytes).scale, "EPA_NowCast.2604");
    assert.equal(readAq(snow.bytes).index, 67);
    assert.equal(readAq(snow.bytes).categoryIndex, 2);
    assert.equal(readAq(snow.bytes).comparison, 2);
    const opaqueAfter = opaqueSummary(snow.bytes), opaqueBefore = opaqueSummary(original);
    assert.deepEqual(opaqueAfter.table, opaqueBefore.table, "unknown WK3 root table bytes remain preserved");
    assert.deepEqual(opaqueAfter.vtable, opaqueBefore.vtable, "unknown WK3 root vtable bytes remain preserved");
    assert.equal(opaqueAfter.value, opaqueBefore.value, "unknown WK3 field content remains preserved");
});

test("final response bundle injects sleet and omits only unnumbered FLURRIES descriptions", async () => {
    const sleet = await invoke({ normalizedProvider: normalizedProviderSummary("SLEET", { conditionSymbol: "POSSIBLE_SLEET", intensity: 0.45 }) });
    const decodedSleet = decodeWK3NextHour(sleet.bytes);
    assert.equal(sleet.headers["X-WK3-NextHour-Diag"].split(";result=")[1], "injected");
    assert.deepEqual(decodedSleet.summary[0].condition, [4]);
    assert.equal(decodedSleet.condition[0].beginCondition, 5);
    assert.equal(decodedSleet.minutes[0].precipitationIntensity, Math.fround(0.45));

    const flurries = await invoke({ normalizedProvider: normalizedProviderSummary("SNOW", { conditionSymbol: "FLURRIES", intensity: 0.12 }) });
    const decodedFlurries = decodeWK3NextHour(flurries.bytes);
    assert.equal(flurries.headers["X-WK3-NextHour-Diag"].split(";result=")[1], "injected");
    assert.deepEqual(decodedFlurries.summary[0].condition, [3]);
    assert.deepEqual(decodedFlurries.condition, []);
    assert.equal(decodedFlurries.minutes[0].precipitationIntensity, Math.fround(0.12));
    assert.equal(readAq(flurries.bytes).scale, "EPA_NowCast.2604");
});

test("rain start and stop use b66-verified START and STOP tokens with exact transition timestamps", async () => {
    const startResult = await invoke({ forecast: "start" });
    const start = decodeWK3NextHour(startResult.bytes);
    assert.ok(start, startResult.headers["X-WK3-NextHour-Diag"]);
    assert.equal(start.condition[0].forecastToken, 2);
    assert.equal(start.condition[0].parameters[0].date, start.minutes[24].startTime);
    assert.equal(start.condition[1].forecastToken, 6);

    const stopResult = await invoke({ forecast: "stop" });
    const stop = decodeWK3NextHour(stopResult.bytes);
    assert.ok(stop, stopResult.headers["X-WK3-NextHour-Diag"]);
    assert.equal(stop.condition[0].forecastToken, 3);
    assert.equal(stop.condition[0].parameters[0].date, stop.minutes[24].startTime);
    assert.equal(stop.condition[1].forecastToken, 1);
});

test("rain-dry-rain is decomposed into verified STOP, START, CONSTANT tokens", async () => {
    const { bytes, headers } = await invoke({ forecast: "rain_dry_rain" });
    const nextHour = decodeWK3NextHour(bytes);
    assert.ok(nextHour, headers["X-WK3-NextHour-Diag"]);
    assert.equal(headers["X-WK3-NextHour-Diag"].split(";result=")[1], "injected", headers["X-WK3-NextHour-Diag"]);
    assert.deepEqual(nextHour.condition.map(condition => condition.forecastToken), [3, 2, 6]);
    assert.deepEqual(nextHour.condition[0].parameters, [{ type: 1, date: nextHour.minutes[15].startTime }]);
    assert.deepEqual(nextHour.condition[1].parameters, [{ type: 1, date: nextHour.minutes[30].startTime }]);
    assert.deepEqual(nextHour.summary.map(summary => summary.condition), [[2], [1], [2]]);
});

test("unsupported five-segment timeline reports a safe code and keeps the original next-hour field", async () => {
    const original = noNextHour();
    const { bytes, headers, requests } = await invoke({ forecast: "too_many_transitions", body: original });
    const diagnostic = headers["X-WK3-NextHour-Diag"];
    assert.match(diagnostic, /result=provider_data_rejected_composite_token$/);
    assert.doesNotMatch(diagnostic, /0\.12|1\.2|coordinate|RAIN|29\.|110\./i);
    assert.ok(requests.some(url => url.includes("/minutely")));
    assert.equal(decodeWK3NextHour(bytes), null, "provider data is not written when the condition timeline was truncated");
    assert.equal(readAq(bytes).scale, "EPA_NowCast.2604", "independent AQI processing still completes");
});

test("unsupported snow summaries and phase mismatches fail open without impacting AQI", async () => {
    const hail = await invoke({ body: noNextHour(), normalizedProvider: normalizedProviderSummary("HAIL") });
    assert.match(hail.headers["X-WK3-NextHour-Diag"], /result=provider_data_rejected_summary_enum/);
    assert.equal(decodeWK3NextHour(hail.bytes), null);
    assert.equal(readAq(hail.bytes).scale, "EPA_NowCast.2604");

    const drySnow = await invoke({ body: noNextHour(), normalizedProvider: normalizedProviderSummary("SNOW", { conditionSymbol: "SNOW", wet: false }) });
    assert.match(drySnow.headers["X-WK3-NextHour-Diag"], /result=provider_data_rejected_summary_enum/);
    assert.equal(decodeWK3NextHour(drySnow.bytes), null, "zero snow intensity is not fabricated");
    assert.equal(readAq(drySnow.bytes).scale, "EPA_NowCast.2604");

    const mismatch = await invoke({ body: noNextHour(), normalizedProvider: normalizedProviderSummary("SNOW", { conditionSymbol: "RAIN" }) });
    assert.match(mismatch.headers["X-WK3-NextHour-Diag"], /result=provider_data_rejected_condition_enum/);
    assert.equal(decodeWK3NextHour(mismatch.bytes), null, "snow data is never encoded using a rain condition");
    assert.equal(readAq(mismatch.bytes).scale, "EPA_NowCast.2604");
});

test("malformed snow minute arrays and timelines preserve the Apple child while AQI succeeds", async () => {
    for (const timeline of ["broken_minute", "misaligned_summary"]) {
        const result = await invoke({ body: noNextHour(), normalizedProvider: normalizedProviderSummary("SNOW", { conditionSymbol: "SNOW", timeline }) });
        assert.match(result.headers["X-WK3-NextHour-Diag"], /result=provider_data_rejected_(minute_timeline|condition_summary_timeline|summary_enum)/);
        assert.equal(decodeWK3NextHour(result.bytes), null);
        assert.equal(readAq(result.bytes).scale, "EPA_NowCast.2604");
    }
    const noProbability = await invoke({ body: noNextHour(), normalizedProvider: normalizedProviderSummary("SNOW", { conditionSymbol: "SNOW", probability: 0 }) });
    assert.match(noProbability.headers["X-WK3-NextHour-Diag"], /result=provider_data_rejected_summary_enum/);
    assert.equal(decodeWK3NextHour(noProbability.bytes), null);
    assert.equal(readAq(noProbability.bytes).scale, "EPA_NowCast.2604");
});

test("real response bundle routes summary-enum rejection details to WK3NH/5 and leaves Next Hour absent", async () => {
    const original = noNextHour();
    const { bytes, headers } = await invoke({ body: original, normalizedProvider: normalizedProviderSummary("HAIL") });
    const diagnostic = headers["X-WK3-NextHour-Diag"];
    assert.match(diagnostic, /result=provider_data_rejected_summary_enum;stage=summary_enum;symbol=hail;phase=unknown;wet=1;prob=1;arrays=1\/1\/60;interval=60;time=ok;pattern=hail/);
    assert.equal(decodeWK3NextHour(bytes), null, "unsupported ice-phase provider data never inserts a next-hour child");
    assert.equal(readAq(bytes).scale, "EPA_NowCast.2604", "AQI remains independent of the rejected minute-rain conversion");
    assert.doesNotMatch(diagnostic, /0\.8|80|latitude|longitude|token|response/i);
});

test("ColorfulClouds failure keeps Apple minute data while stable AQI conversion still works", async () => {
    const { bytes, requests, headers } = await invoke({ minutelyFailure: true });
    assert.equal(readAq(bytes).scale, "EPA_NowCast.2604");
    assert.equal(decodeWK3NextHour(bytes), null);
    assert.ok(requests.some(url => url.includes("/minutely")));
    assert.match(headers["X-WK3-NextHour-Diag"], /slot=slot_present_child_null;source=source_called;result=provider_response_invalid/);
});

test("an unknown nextHour child makes the complete response fail open before AQI or provider work", async () => {
    const original = fixture;
    const { bytes, requests, headers } = await invoke({ body: original });
    assert.deepEqual(bytes, original, "unsupported binary structure remains byte-for-byte unchanged");
    assert.deepEqual(readAq(bytes), readAq(original));
    assert.equal(requests.length, 0, "unknown child prevents ColorfulClouds and AQI requests");
    assert.match(headers["X-WK3-NextHour-Diag"], /slot=native_child_present;source=not_called;result=native_child_decode_failed/);
    assert.throws(() => decodeWK3NextHour(bytes), /Unsupported WK3 nextHour table layout/);
});

test("a root vtable shorter than slot 5 is safely extended before the AQI final re-encode", async () => {
    const original = withoutNextHourRootSlot(fixture);
    const originalOtherRootTables = new Map([1, 2, 3, 4].map(slot => [slot, rootTableWire(original, slot)]));
    const { bytes, requests, headers } = await invoke({ body: original });
    assert.ok(decodeWK3NextHour(bytes), headers["X-WK3-NextHour-Diag"]);
    assert.equal(readAq(bytes).scale, "EPA_NowCast.2604");
    assert.equal(readAq(bytes).index, 67);
    assert.equal(readAq(bytes).categoryIndex, 2);
    assert.equal(readAq(bytes).comparison, 2);
    for (const slot of [1, 2, 3, 4]) assert.deepEqual(rootTableWire(bytes, slot), originalOtherRootTables.get(slot));
    assert.equal(decodeWK3NextHour(bytes).minutes.length, 85);
    assert.ok(requests.some(url => url.includes("/minutely")));
    assert.match(headers["X-WK3-NextHour-Diag"], /slot=vtable_entry_absent;source=source_called;result=injected/);
});

test("a zero vtable entry can be rebuilt with AQI and opaque root slot 17 intact", async () => {
    const original = withZeroNextHourRootField(fixture);
    const opaqueSlots = [1, 2, 3, 4, 9, 14, 17];
    const before = new Map(opaqueSlots.map(slot => [slot, rootTableWire(original, slot)]));
    assert.ok(before.get(17));
    const { bytes, requests, headers } = await invoke({ body: original });
    assert.equal(readAq(bytes).scale, "EPA_NowCast.2604");
    assert.equal(readAq(bytes).index, 67);
    assert.equal(readAq(bytes).categoryIndex, 2);
    assert.equal(readAq(bytes).comparison, 2);
    assert.equal(decodeWK3NextHour(bytes).minutes.length, 85);
    assert.ok(requests.some(url => url.includes("/minutely")));
    for (const slot of opaqueSlots) assert.deepEqual(rootTableWire(bytes, slot), before.get(slot));
    assert.match(headers["X-WK3-NextHour-Diag"], /slot=slot_offset_zero;source=source_called;result=injected/);
});

test("an illegal unknown root pointer fails open before any provider or AQI request", async () => {
    const original = withBrokenOpaqueRootPointer(withZeroNextHourRootField(fixture));
    const { bytes, requests, headers } = await invoke({ body: original });
    assert.deepEqual(bytes, original, "invalid pointer leaves the exact input bytes untouched");
    assert.deepEqual(readAq(bytes), readAq(original));
    assert.equal(requests.length, 0, "pointer validation runs before all data-source requests");
    assert.match(headers["X-WK3-NextHour-Diag"], /slot=slot_offset_zero;source=not_called;result=root_rebuild_root_pointer_invalid/);
});

test("reprocessing an injected response updates one root slot and preserves AQI plus opaque roots", async () => {
    const first = await invoke({ body: withZeroNextHourRootField(fixture) });
    assert.ok(decodeWK3NextHour(first.bytes), first.headers["X-WK3-NextHour-Diag"]);
    const before = readAq(first.bytes);
    const opaque = opaqueSummary(first.bytes);
    assert.equal(decodeWK3NextHour(first.bytes).minutes.length, 85);

    const second = await invoke({ body: first.bytes });
    assert.equal(readAq(second.bytes).scale, before.scale);
    assert.equal(readAq(second.bytes).index, before.index);
    assert.equal(readAq(second.bytes).categoryIndex, before.categoryIndex);
    assert.equal(readAq(second.bytes).comparison, before.comparison);
    assert.equal(decodeWK3NextHour(second.bytes).minutes.length, 85);
    assert.deepEqual(opaqueSummary(second.bytes).table, opaque.table);
    assert.deepEqual(opaqueSummary(second.bytes).vtable, opaque.vtable);
    assert.equal(opaqueSummary(second.bytes).value, opaque.value);
    const bb = new ByteBuffer(second.bytes), root = bb.readUint32(0), nextHourField = bb.__offset(root, 4 + 5 * 2);
    assert.ok(nextHourField, "the second pass leaves one addressable root slot 5");
    assert.match(second.headers["X-WK3-NextHour-Diag"], /slot=native_child_present;source=source_called;result=injected/);
});

test("a failed AQ child decode does not prevent the independent nextHour patch", async () => {
    const original = withBrokenAQPointer(noNextHour());
    const bb = new ByteBuffer(original), root = bb.readUint32(0), aqField = bb.__offset(root, 4), aqPointer = bb.readUint32(root + aqField);
    const { bytes, requests } = await invoke({ body: original });
    assert.ok(decodeWK3NextHour(bytes));
    assert.equal(new ByteBuffer(bytes).readUint32(root + aqField), aqPointer, "failed AQ data is not re-encoded");
    assert.equal(decodeWK3NextHour(bytes).minutes.length, 85);
    assert.ok(requests.some(url => url.includes("/minutely")));
});

test("the independent NextHour.Provider switch disables the feature without changing stable AQI", async () => {
    const { bytes, requests, headers } = await invoke({ disableNextHour: true });
    assert.equal(readAq(bytes).scale, "EPA_NowCast.2604");
    assert.equal(decodeWK3NextHour(bytes), null);
    assert.equal(requests.some(url => url.includes("/minutely")), false);
    assert.match(headers["X-WK3-NextHour-Diag"], /provider=other;region=mainland;replace=1;gate=provider_off;slot=not_checked;source=not_called/);
});

test("the response gate reports requested and configured dataSets plus region decisions", async () => {
    const disabledByRequestedDataSet = await invoke({ requestDataSets: "airQuality" });
    assert.match(disabledByRequestedDataSet.headers["X-WK3-NextHour-Diag"], /ds=0\/1;provider=cc;region=mainland;replace=1;gate=request_ds_off/);
    assert.equal(disabledByRequestedDataSet.requests.some(url => url.includes("/minutely")), false);

    const disabledByRegion = await invoke({ latitude: 47.6, longitude: -122.3, country: "US" });
    assert.match(disabledByRegion.headers["X-WK3-NextHour-Diag"], /ds=1\/1;provider=cc;region=outside;replace=0;gate=region_skip/);
    assert.equal(disabledByRegion.requests.some(url => url.includes("/minutely")), false);

    const explicitNonChina = await invoke({ latitude: 31.25, longitude: 121.5, country: "US" });
    assert.match(explicitNonChina.headers["X-WK3-NextHour-Diag"], /region=mainland;replace=0;gate=region_skip/);
    assert.equal(explicitNonChina.requests.some(url => url.includes("/minutely")), false);

    const pingbian = await invoke({ latitude: 22.987, longitude: 103.675 });
    assert.match(pingbian.headers["X-WK3-NextHour-Diag"], /ds=1\/1;provider=cc;region=mainland;replace=1;gate=on/);
    assert.ok(pingbian.requests.some(url => url.includes("/minutely")));

    const disabledByConfiguredDataSet = await invoke({ settingDataSets: ["airQuality"] });
    assert.match(disabledByConfiguredDataSet.headers["X-WK3-NextHour-Diag"], /ds=1\/0;provider=cc;region=mainland;replace=1;gate=setting_ds_off/);
    assert.equal(disabledByConfiguredDataSet.requests.some(url => url.includes("/minutely")), false);
});
