import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
                const serverTime = 1_799_280_000;
                const precipitation = Array.from({ length: 120 }, (_, i) => {
                    if (forecast === "rain" && i >= 4 && i < 22) return i < 12 ? 0.3 : 1.2;
                    return 0;
                });
                return callback(null, { status: 200, headers: {} }, JSON.stringify({
                    status: "ok", server_time: serverTime, location: [31.25, 121.5],
                    result: { minutely: { status: "ok", probability: forecast === "rain" ? [0.8, 0.6, 0.2, 0] : [0, 0, 0, 0], precipitation_2h: precipitation, description: forecast === "rain" ? "未来几分钟开始降雨" : "未来两小时没有降水" } },
                }));
            }
            if (requestUrl.includes("/realtime")) return callback(null, { status: 200, headers: {} }, JSON.stringify(realtimePayload));
            if (requestUrl.includes("/hourly")) return callback(null, { status: 200, headers: {} }, JSON.stringify(yesterdayPayload));
            callback(null, { status: 404, headers: {} }, "{}");
        },
    };
    return requests;
}

async function invoke(options = {}) {
    const original = options.body ?? noNextHour();
    const requests = responseFixture({ ...options, body: original });
    const result = await new Promise((resolve, reject) => {
        globalThis.$done = resolve;
        import(`${bundleUrl.href}?replay=${Math.random()}`).catch(reject);
    });
    assert.ok(result.body instanceof Uint8Array, "Surge binary-body-mode keeps a Uint8Array");
    assert.equal(result.response, undefined, "$done receives the top-level response shape");
    assert.equal(result.headers["Content-Type"], "application/vnd.apple.flatbuffer;messageType=WK3.Weather");
    assert.equal(typeof result.headers["X-WK3-NextHour-Diag"], "string");
    return { original, bytes: result.body, requests, headers: result.headers };
}

test("combined AQI and minute-rain writes keep EPA AQI, opaque root slots, and encode/decode consistency", async () => {
    const original = withoutAQ(noNextHour());
    const { bytes, requests, headers } = await invoke({ body: original });
    const aq = readAq(bytes), nextHour = decodeWK3NextHour(bytes);
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
