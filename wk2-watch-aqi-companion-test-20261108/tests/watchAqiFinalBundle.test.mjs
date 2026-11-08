import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { Builder } from "flatbuffers";

const directory = new URL("../", import.meta.url);
const bundle = readFileSync(new URL("../response.bundle.js", import.meta.url), "utf8");
const moduleText = readFileSync(new URL("../WK2-Watch-AQI-Companion-Test.sgmodule", import.meta.url), "utf8");
const requestURL = "https://weatherkit.apple.com/api/v2/weather/zh-Hans-US/12.345/67.89?country=CN&timezone=Asia%2FShanghai&dataSets=airQuality,currentWeather";
const now = Math.trunc(Date.now() / 1000);

function createOpaqueTable(value = 777) {
    const builder = currentBuilder;
    builder.startObject(1);
    builder.addFieldInt32(0, value, 0);
    return builder.endObject();
}

function createAqiTable(builder) {
    builder.startObject(10);
    builder.addFieldInt32(1, now + 1800, 0);
    builder.addFieldFloat32(3, 12.345, 0);
    builder.addFieldFloat32(4, 67.89, 0);
    builder.addFieldInt32(7, now, 0);
    builder.addFieldInt32(8, now, 0);
    const metadata = builder.endObject();
    const scale = builder.createString("EPA_NowCast.2604");
    builder.startObject(8);
    builder.addFieldOffset(0, metadata, 0);
    builder.addFieldInt8(1, 2, 0);
    builder.addFieldInt16(2, 67, 0);
    builder.addFieldInt8(5, 0, 0);
    builder.addFieldOffset(7, scale, 0);
    return builder.endObject();
}

let currentBuilder;
function createWeatherRoot({ airQuality = false, includeCurrent = true, includeFuture = true, empty = false } = {}) {
    const builder = new Builder(1024);
    currentBuilder = builder;
    const aqOffset = airQuality && !empty ? createAqiTable(builder) : 0;
    const currentOffset = includeCurrent && !empty ? createOpaqueTable(222) : 0;
    const futureOffset = includeFuture && !empty ? createOpaqueTable(333) : 0;
    builder.startObject(12);
    if (!empty) {
        if (aqOffset) builder.addFieldOffset(0, aqOffset, 0);
        if (currentOffset) builder.addFieldOffset(1, currentOffset, 0);
        if (futureOffset) builder.addFieldOffset(11, futureOffset, 0);
    }
    const root = builder.endObject();
    builder.finish(root);
    currentBuilder = undefined;
    return new Uint8Array(builder.asUint8Array());
}

function removeAirQualityOffset(bytes) {
    const copy = bytes.slice();
    const view = new DataView(copy.buffer, copy.byteOffset, copy.byteLength);
    const tablePosition = view.getUint32(0, true);
    const vtablePosition = tablePosition - view.getInt32(tablePosition, true);
    const vtableLength = view.getUint16(vtablePosition, true);
    const fieldPosition = vtablePosition + 4;
    if (4 + 2 <= vtableLength) {
        const relative = view.getUint16(fieldPosition, true);
        if (relative) view.setUint32(tablePosition + relative, 0, true);
    }
    return copy;
}

function tableAt(bytes, position) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (position < 4 || position + 4 > bytes.length) return undefined;
    const vtablePosition = position - view.getInt32(position, true);
    if (vtablePosition < 0 || vtablePosition + 4 > bytes.length) return undefined;
    const vtableLength = view.getUint16(vtablePosition, true);
    const objectLength = view.getUint16(vtablePosition + 2, true);
    if (vtableLength < 4 || (vtableLength & 1) || vtablePosition + vtableLength > bytes.length || objectLength < 4 || position + objectLength > bytes.length) return undefined;
    return {
        position,
        vtablePosition,
        vtableLength,
        objectLength,
        field(index, width = 1) {
            const entry = vtablePosition + 4 + index * 2;
            if (entry + 2 > vtablePosition + vtableLength) return undefined;
            const offset = view.getUint16(entry, true);
            if (offset < 4 || offset + width > objectLength) return undefined;
            return position + offset;
        },
    };
}

function child(bytes, table, index) {
    const field = table?.field(index, 4);
    if (field === undefined) return undefined;
    const relative = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(field, true);
    return relative ? tableAt(bytes, field + relative) : undefined;
}

function scalarChild(bytes, table, childIndex, scalarIndex = 0) {
    const childTable = child(bytes, table, childIndex);
    return childTable ? readScalar(bytes, childTable, scalarIndex, "i32", NaN) : undefined;
}

function readScalar(bytes, table, index, type, fallback = 0) {
    const width = type === "i8" ? 1 : type === "i16" ? 2 : 4;
    const field = table?.field(index, width);
    if (field === undefined) return fallback;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (type === "i8") return view.getInt8(field);
    if (type === "i16") return view.getInt16(field, true);
    if (type === "f32") return view.getFloat32(field, true);
    return view.getInt32(field, true);
}

function readString(bytes, table, index) {
    const field = table?.field(index, 4);
    if (field === undefined) return undefined;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const target = field + view.getUint32(field, true);
    if (target + 4 > bytes.length) return undefined;
    const length = view.getUint32(target, true);
    if (length > 96 || target + 4 + length > bytes.length) return undefined;
    let value = "";
    for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[target + 4 + i]);
    return value;
}

function decodeOutput(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const root = tableAt(bytes, view.getUint32(0, true));
    assert.ok(root, "output has a valid WK2 root table");
    const aq = child(bytes, root, 0);
    assert.ok(aq, "output has an AQ product at WK2.Weather slot 0");
    const metadata = child(bytes, aq, 0);
    assert.ok(metadata, "AQ metadata is present");
    return {
        categoryIndex: readScalar(bytes, aq, 1, "i8", -1),
        index: readScalar(bytes, aq, 2, "i16", -1),
        comparison: readScalar(bytes, aq, 5, "i8", 0),
        scale: readString(bytes, aq, 7),
        latitude: readScalar(bytes, metadata, 3, "f32", NaN),
        longitude: readScalar(bytes, metadata, 4, "f32", NaN),
        readTime: readScalar(bytes, metadata, 7, "i32", 0),
        reportedTime: readScalar(bytes, metadata, 8, "i32", 0),
        unavailable: readScalar(bytes, metadata, 9, "i8", 0) !== 0,
        currentWeatherMarker: scalarChild(bytes, root, 1),
        unknownRootMarker: scalarChild(bytes, root, 11),
    };
}

function realtimeResponse({ index = 67, latitude = 12.345, longitude = 67.89, reportedTime = now, status = "ok" } = {}) {
    return {
        status: "ok",
        location: [latitude, longitude],
        result: {
            realtime: {
                status,
                air_quality: {
                    obs_time: reportedTime,
                    description: { usa: "Moderate", chn: "良" },
                    aqi: { usa: index, chn: 53 },
                    pm25: 18,
                    pm10: 29,
                    co: 0.42,
                    no2: 12,
                    so2: 3,
                    o3: 44,
                },
            },
            alert: { status: "ok", content: [] },
        },
    };
}

function hourlyResponse() {
    return {
        status: "ok",
        location: [12.345, 67.89],
        result: {
            server_time: now,
            hourly: { status: "ok", air_quality: { aqi: [{ value: { usa: 45, chn: 46 } }] } },
        },
    };
}

async function execute({ bytes = createWeatherRoot(), url = requestURL, contentType = "application/vnd.apple.flatbuffer;messageType=WK2.Weather", realtime = realtimeResponse(), yesterday = hourlyResponse(), sourceFailure = false } = {}) {
    const requests = [];
    const logs = [];
    let resolveDone;
    const done = new Promise(resolve => { resolveDone = resolve; });
    const context = {
        URL,
        Uint8Array,
        ArrayBuffer,
        DataView,
        TextDecoder,
        TextEncoder,
        Date,
        Promise,
        Map,
        setTimeout,
        clearTimeout,
        console: { log: (...parts) => logs.push(parts.join(" ")), warn: (...parts) => logs.push(parts.join(" ")), error: (...parts) => logs.push(parts.join(" ")) },
        $environment: { "surge-version": "6.100.0" },
        $script: { name: "WK2 Watch AQI Companion Test", startTime: now },
        $request: {
            method: "GET",
            url,
            headers: { Accept: "application/vnd.apple.flatbuffer;messageType=WK2.Weather" },
        },
        $response: { status: 200, headers: { "Content-Type": contentType }, body: bytes },
        $argument: "DataSets=airQuality&AirQuality.Current.Pollutants.Provider=ColorfulClouds&AirQuality.Current.Pollutants.Units.Replace=&AirQuality.Current.Pollutants.Units.Mode=Scale&AirQuality.Current.Index.Replace=HJ6332012,EU.EAQI,CN_AQHI,EPA_NowCast&AirQuality.Current.Index.Provider=ColorfulCloudsUS&AirQuality.Current.Index.ForceCNPrimaryPollutants=true&AirQuality.Comparison.ReplaceWhenCurrentChange=true&AirQuality.Comparison.Yesterday.IndexProvider=ColorfulCloudsUS&Storage=Argument&LogLevel=OFF",
        $persistentStore: { read: () => null, write: () => true },
        $httpClient: {
            get(request, callback) {
                const requestAddress = typeof request === "string" ? request : request?.url;
                requests.push(String(requestAddress ?? ""));
                if (sourceFailure) return callback(new Error("mock source unavailable"), undefined, undefined);
                if (String(requestAddress).includes("/realtime")) return callback(undefined, { status: 200, headers: { "Content-Type": "application/json" } }, JSON.stringify(realtime));
                if (String(requestAddress).includes("/hourly")) return callback(undefined, { status: 200, headers: { "Content-Type": "application/json" } }, JSON.stringify(yesterday));
                return callback(new Error("unexpected source route"), undefined, undefined);
            },
        },
        $done: result => resolveDone(result),
    };
    vm.runInNewContext(bundle, context, { timeout: 10000 });
    const result = await Promise.race([
        done,
        new Promise((_, reject) => setTimeout(() => reject(new Error("bundle completion timed out")), 5000)),
    ]);
    return { result, requests, logs };
}

function bodyBytes(result) {
    assert.ok(result.body instanceof Uint8Array, "Surge response body remains binary Uint8Array");
    return new Uint8Array(result.body.buffer, result.body.byteOffset, result.body.byteLength);
}

function diagnostic(result) {
    return result.headers["X-WK2-Watch-AQI-Diag"];
}

test("final bundle adds AQ at missing WK2 root slot and preserves untouched/future roots", async () => {
    const original = createWeatherRoot({ includeCurrent: true, includeFuture: true });
    const { result, requests, logs } = await execute({ bytes: original });
    assert.match(diagnostic(result), /^WK2AQI\/1;original=missing;source=ok;result=injected$/);
    assert.equal(logs.length, 0, "stable companion defaults to no script debug output");
    assert.equal(result.status, 200, "Surge response status is retained");
    assert.match(result.headers["Content-Type"], /messageType=WK2\.Weather/);
    assert.ok(!/31\.877|120\.556|token|authorization/i.test(diagnostic(result)), "diagnostics omit coordinates and credentials");
    assert.equal(requests.filter(url => url.includes("/realtime")).length, 1);
    assert.equal(requests.filter(url => url.includes("/hourly")).length, 1);
    const output = bodyBytes(result);
    const decoded = decodeOutput(output);
    assert.equal(decoded.index, 67);
    assert.equal(decoded.categoryIndex, 2);
    assert.equal(decoded.scale, "EPA_NowCast.2604");
    assert.equal(decoded.unavailable, false);
    assert.equal(decoded.currentWeatherMarker, 222, "known current-weather product survives root re-encoding");
    assert.equal(decoded.unknownRootMarker, 333, "future/unknown root product survives root re-encoding");
    assert.equal(Math.abs(decoded.latitude - 12.345) < 0.001, true);
    assert.equal(Math.abs(decoded.longitude - 67.89) < 0.001, true);
    assert.ok(decoded.reportedTime > now - 60);
    assert.notEqual(decoded.comparison, 0, "a valid same-source yesterday sample yields a non-UNKNOWN trend");
    assert.ok(Buffer.from(output).includes(Buffer.from(original)), "untouched and future root bytes remain embedded in the reassembled WK2 buffer");
});

test("final bundle can add the first root product when the source vtable has no AQ entry", async () => {
    const original = createWeatherRoot({ empty: true });
    const originalTable = tableAt(original, new DataView(original.buffer).getUint32(0, true));
    assert.equal(originalTable.vtableLength, 4, "source root vtable contains no product entries");
    const { result } = await execute({ bytes: original });
    assert.match(diagnostic(result), /original=missing;source=ok;result=injected/);
    assert.equal(decodeOutput(bodyBytes(result)).index, 67);
});

test("final bundle inserts AQ when the AirQuality vtable entry is present but its offset is zero", async () => {
    const original = removeAirQualityOffset(createWeatherRoot({ airQuality: true, includeCurrent: true, includeFuture: true }));
    const { result } = await execute({ bytes: original });
    assert.match(diagnostic(result), /original=missing;source=ok;result=injected/);
    const decoded = decodeOutput(bodyBytes(result));
    assert.equal(decoded.index, 67);
    assert.equal(decoded.scale, "EPA_NowCast.2604");
});

test("final bundle preserves an existing Apple AQ product byte-for-byte", async () => {
    const original = createWeatherRoot({ airQuality: true, includeCurrent: true, includeFuture: true });
    const { result, requests } = await execute({ bytes: original });
    assert.equal(decodeOutput(original).index, 67, "fixture contains a valid pre-existing WK2 AQ product");
    assert.equal(diagnostic(result), "WK2AQI/1;original=present;source=not_called;result=original_preserved");
    assert.deepEqual(Array.from(bodyBytes(result)), Array.from(original));
    assert.equal(requests.length, 0);
});

test("final bundle leaves a source failure as the complete original WK2 response", async () => {
    const original = createWeatherRoot({ includeCurrent: true, includeFuture: true });
    const { result, requests } = await execute({ bytes: original, sourceFailure: true });
    assert.match(diagnostic(result), /original=missing;source=called;result=source_unavailable/);
    assert.deepEqual(Array.from(bodyBytes(result)), Array.from(original));
    assert.equal(requests.filter(url => url.includes("/realtime")).length, 1);
});

test("final bundle fails closed for stale, distant, out-of-range or malformed provider AQI", async () => {
    const original = createWeatherRoot({ includeCurrent: true, includeFuture: true });
    for (const realtime of [
        realtimeResponse({ reportedTime: now - 7 * 3600 }),
        realtimeResponse({ latitude: 40.0, longitude: 67.89 }),
        realtimeResponse({ index: 501 }),
    ]) {
        const { result } = await execute({ bytes: original, realtime });
        assert.match(diagnostic(result), /result=safe_fallback/);
        assert.deepEqual(Array.from(bodyBytes(result)), Array.from(original));
    }
});

test("missing yesterday data leaves comparison UNKNOWN but keeps validated current AQI", async () => {
    const original = createWeatherRoot();
    const missingYesterday = { status: "error", result: {} };
    const { result } = await execute({ bytes: original, yesterday: missingYesterday });
    assert.match(diagnostic(result), /result=injected/);
    const decoded = decodeOutput(bodyBytes(result));
    assert.equal(decoded.index, 67);
    assert.equal(decoded.scale, "EPA_NowCast.2604");
    assert.equal(decoded.comparison, 0, "no yesterday data is not synthesized into a trend");
});

test("final bundle passes through non-CN, requests without airQuality, and non-WK2/invalid responses", async () => {
    const original = createWeatherRoot({ includeCurrent: true, includeFuture: true });
    const cases = [
        { url: requestURL.replace("country=CN", "country=US"), expected: /country_skip/ },
        { url: requestURL.replace("airQuality,currentWeather", "currentWeather"), expected: /dataset_skip/ },
        { contentType: "application/json", expected: /response_type_skip/ },
        { bytes: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]), expected: /invalid_response/ },
    ];
    for (const item of cases) {
        const { result, requests } = await execute({ bytes: original, ...item });
        assert.match(diagnostic(result), item.expected);
        assert.deepEqual(Array.from(bodyBytes(result)), Array.from(item.bytes ?? original));
        assert.equal(requests.length, 0);
    }
});

test("published bundle contains the binary guard and pinned WK2 codec failure gate", () => {
    assert.match(bundle, /WK2AQI\/1/);
    assert.match(bundle, /__wk2GuardState\?\.stop\)return/);
    assert.match(bundle, /EPA_NowCast\.2604/);
    assert.match(bundle, /WeatherKit2|class Nt/);
    assert.match(bundle, /globalThis\.__wk2WatchAQI\.encodeFailed=true/);
    assert.doesNotMatch(bundle, /Date: 2026\/8\/29 16:12:56/, "upstream startup banners are removed from the final asset");
    assert.match(moduleText, /pattern=\^https\?:\\\/\\\/weatherkit\\\.apple\\\.com\\\/api\\\/v2\\\/weather\\\//);
    assert.ok(moduleText.includes("/1a47df680773320f0885220b9388adaa7cbe7120/wk2-watch-aqi-companion-test-20261108/response.bundle.js"));
    assert.doesNotMatch(moduleText, /\/api\/v1\/|\/api\/v3\/|weatherAlerts|forecastNextHour|minute/);
    assert.doesNotMatch(moduleText, /[?&](?:token|authorization|cookie)=/i);
});
