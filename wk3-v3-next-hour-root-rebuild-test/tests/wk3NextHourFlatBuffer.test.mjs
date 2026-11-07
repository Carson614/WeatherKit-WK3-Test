import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";
import { encodeNextHour, decodeNextHour, decodeWK3NextHour, providerToWK3NextHour, WK3NextHourTable } from "../src/class/WK3NextHour.mjs";
import { inspectWK3NextHourRootSlot, patchWK3NextHour, patchWK3NextHourDiagnostic } from "../src/function/wk3NextHourFlatBuffer.mjs";

const fixture = new Uint8Array(readFileSync(new URL("./fixtures/wk3-aq.synthetic.bin", import.meta.url)));
const start = 1_799_280_000;

function providerForecast({ rainRanges = [], missing = false, unknownEnum = false } = {}) {
    if (missing) return undefined;
    const minutes = Array.from({ length: 60 }, (_, i) => {
        const range = rainRanges.find(([from, to]) => i >= from && i < to);
        const amount = range ? range[2] : 0;
        return { startTime: start + i * 60, precipitationChance: amount ? 80 : 0, precipitationIntensity: amount, perceivedPrecipitationIntensity: amount };
    });
    const cuts = [...new Set([0, ...rainRanges.flatMap(([from, to]) => [from, to]), 60])].sort((a, b) => a - b);
    const summary = [];
    const condition = [];
    for (let i = 0; i < cuts.length - 1; i++) {
        const from = cuts[i], to = cuts[i + 1];
        const wet = minutes[from]?.precipitationIntensity > 0;
        const wasWet = from > 0 && minutes[from - 1]?.precipitationIntensity > 0;
        const nextWet = to < 60 && minutes[to]?.precipitationIntensity > 0;
        const token = !wasWet && wet ? "START" : wasWet && !wet ? "STOP" : "CONSTANT";
        summary.push({ startTime: start + from * 60, endTime: to === 60 ? 0 : start + to * 60, condition: [wet ? "RAIN" : "CLEAR"], precipitationChance: wet ? 80 : 0, precipitationIntensity: minutes[from]?.precipitationIntensity ?? 0 });
        condition.push({ startTime: start + from * 60, endTime: to === 60 ? 0 : start + to * 60, forecastToken: unknownEnum ? "FUTURE_TOKEN" : token, beginCondition: wet ? "RAIN" : "CLEAR", endCondition: nextWet ? "RAIN" : wet ? "RAIN" : "CLEAR", parameters: [] });
    }
    return {
        metadata: { attributionUrl: "https://www.caiyunapp.com/h5", expireTime: start + 900, language: "zh-CN", latitude: 31.4, longitude: 120.9, providerLogo: "https://example.invalid/logo", providerName: "彩云天气", readTime: start, reportedTime: start, temporarilyUnavailable: false, sourceType: "MODELED" },
        condition, summary, forecastStart: start, forecastEnd: start + 3600, minutes,
    };
}

function slotAddress(bytes, slot) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), vtable = root - bb.readInt32(root);
    const entry = vtable + 4 + slot * 2, offset = bb.readUint16(entry);
    return offset ? root + offset : 0;
}

function withNoNextHour(bytes = fixture) {
    const copy = bytes.slice(), address = slotAddress(copy, 5);
    assert.ok(address, "synthetic root has the documented WK3 slot 5");
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint32(address, 0, true);
    return copy;
}

function withMissingNextHourRootSlot(bytes = fixture) {
    const copy = bytes.slice(), bb = new ByteBuffer(copy), root = bb.readUint32(0), vtable = root - bb.readInt32(root);
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint16(vtable, 4 + 5 * 2, true);
    return copy;
}

function withZeroNextHourRootSlot(bytes = fixture) {
    const copy = bytes.slice(), bb = new ByteBuffer(copy), root = bb.readUint32(0), vtable = root - bb.readInt32(root);
    new DataView(copy.buffer, copy.byteOffset, copy.byteLength).setUint16(vtable + 4 + 5 * 2, 0, true);
    return copy;
}

function tableFingerprint(bytes, slot) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4 + slot * 2);
    if (!field) return null;
    const target = root + field + bb.readUint32(root + field), vtable = target - bb.readInt32(target);
    const vtableLength = bb.readUint16(vtable), objectLength = bb.readUint16(vtable + 2);
    return {
        vtable: Array.from(bytes.slice(vtable, vtable + vtableLength)),
        object: Array.from(bytes.slice(target, target + objectLength)),
    };
}

function readAqSnapshot(bytes) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4);
    if (!field) return null;
    const table = bb.__indirect(root + field), scalar = (offset, method) => {
        const value = bb.__offset(table, offset);
        return value ? bb[method](table + value) : 0;
    };
    const scale = bb.__offset(table, 18);
    return { index: scalar(8, "readInt16"), categoryIndex: scalar(6, "readInt8"), comparison: scalar(14, "readInt8"), scale: scale ? bb.__string(table + scale) : null };
}

function withNextHour(data, bytes = fixture) {
    const encodedBuilder = new Builder();
    encodedBuilder.finish(encodeNextHour(encodedBuilder, providerToWK3NextHour(data, { intensityUnit: "mm/h", chanceUnit: "percent" })));
    const encoded = encodedBuilder.asUint8Array();
    const copy = withNoNextHour(bytes), field = slotAddress(copy, 5), appendAt = Math.ceil(copy.length / 4) * 4;
    const output = new Uint8Array(appendAt + encoded.length);
    output.set(copy); output.set(encoded, appendAt);
    const target = appendAt + new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength).getUint32(0, true);
    new DataView(output.buffer, output.byteOffset, output.byteLength).setUint32(field, target - field, true);
    return output;
}

test("WK3 b66 codec round-trips dry and changing-rain forecasts with minute vectors", () => {
    for (const forecast of [providerForecast(), providerForecast({ rainRanges: [[5, 19, 0.8], [39, 47, 5.2]] })]) {
        const builder = new Builder();
        builder.finish(encodeNextHour(builder, providerToWK3NextHour(forecast, { intensityUnit: "mm/h", chanceUnit: "percent" })));
        const bytes = builder.asUint8Array(), bb = new ByteBuffer(bytes);
        const decoded = decodeNextHour(new WK3NextHourTable().__init(bb.readUint32(0), bb));
        assert.equal(decoded.minutes.length, 60);
        assert.equal(decoded.forecastEnd, start + 3600);
        assert.equal(decoded.minutes[0].startTime, start);
        assert.ok(Math.abs(decoded.minutes[5].precipitationIntensity - forecast.minutes[5].precipitationIntensity) < 0.00001);
        assert.ok(Math.abs(decoded.minutes[39].precipitationIntensity - forecast.minutes[39].precipitationIntensity) < 0.00001);
        assert.ok(decoded.summary.length >= 1);
        assert.ok(decoded.condition.length >= 1);
    }
});

test("a validated empty WK3 root slot 5 can receive a child while other root bytes stay intact", async () => {
    const original = withNoNextHour();
    const field = slotAddress(original, 5);
    let calls = 0;
    const output = await patchWK3NextHour(original, async () => { calls++; return providerForecast({ rainRanges: [[3, 12, 1.2]] }); });
    assert.equal(calls, 1);
    assert.notDeepEqual(output, original);
    const decoded = decodeWK3NextHour(output);
    assert.equal(decoded.minutes.length, 60);
    assert.ok(Math.abs(decoded.minutes[3].precipitationIntensity - 1.2) < 0.00001);
    assert.equal(decoded.minutes[20].precipitationIntensity, 0);
    const mutableOffsets = new Set([field, field + 1, field + 2, field + 3]);
    for (let i = 0; i < original.length; i++) if (!mutableOffsets.has(i)) assert.equal(output[i], original[i], `unchanged byte ${i}`);
});

test("an existing native child is updated in place by vector redirection and retains opaque root slots", async () => {
    const original = withNextHour(providerForecast({ rainRanges: [[0, 60, 0.1]] }));
    const bb = new ByteBuffer(original), root = bb.readUint32(0), futureField = bb.__offset(root, 4 + 17 * 2);
    assert.ok(futureField, "fixture includes an opaque future root slot");
    const futureTarget = root + futureField + bb.readUint32(root + futureField);
    const output = await patchWK3NextHour(original, async () => providerForecast({ rainRanges: [[20, 35, 2.5]] }));
    const after = new ByteBuffer(output), afterRoot = after.readUint32(0), afterFutureField = after.__offset(afterRoot, 4 + 17 * 2);
    assert.equal(afterRoot + afterFutureField + after.readUint32(afterRoot + afterFutureField), futureTarget);
    const decoded = decodeWK3NextHour(output);
    assert.equal(decoded.minutes[0].precipitationIntensity, 0);
    assert.ok(Math.abs(decoded.minutes[20].precipitationIntensity - 2.5) < 0.00001);
});

test("missing, invalid, unavailable, and unknown-enum provider data fail open byte-for-byte", async () => {
    const original = withNoNextHour();
    for (const getData of [
        async () => { throw new Error("provider unavailable"); },
        async () => providerForecast({ missing: true }),
        async () => providerForecast({ unknownEnum: true }),
        async () => ({ ...providerForecast(), minutes: [] }),
    ]) {
        const output = await patchWK3NextHour(original, getData);
        assert.deepEqual(output, original);
    }
});

test("unknown or malformed native nextHour layout is left untouched without provider requests", async () => {
    const original = withNextHour(providerForecast());
    // Make the nextHour table advertise a future seventh field; the codec rejects it.
    const bb = new ByteBuffer(original), root = bb.readUint32(0), rootField = bb.__offset(root, 4 + 5 * 2), child = root + rootField + bb.readUint32(root + rootField);
    const vtable = child - bb.readInt32(child), oldLength = bb.readUint16(vtable);
    new DataView(original.buffer, original.byteOffset, original.byteLength).setUint16(vtable, oldLength + 2, true);
    const rejected = original.slice();
    let calls = 0;
    const output = await patchWK3NextHour(rejected, async () => { calls++; return providerForecast(); });
    assert.equal(calls, 0);
    assert.deepEqual(output, rejected);
});

test("diagnostics distinguish a slot beyond the serialized root vtable", async () => {
    const original = withMissingNextHourRootSlot();
    assert.equal(inspectWK3NextHourRootSlot(original).status, "root_vtable_short");
    let calls = 0;
    const result = await patchWK3NextHourDiagnostic(original, async () => { calls++; return providerForecast(); });
    assert.equal(result.status, "injected");
    assert.equal(result.slotStatus, "root_vtable_short");
    assert.equal(result.sourceCalled, true);
    assert.equal(calls, 1);
    assert.equal(decodeWK3NextHour(result.bytes).minutes.length, 60);
    assert.deepEqual(readAqSnapshot(result.bytes), readAqSnapshot(original));
    for (let slot = 0; slot < 5; slot++) assert.deepEqual(tableFingerprint(result.bytes, slot), tableFingerprint(original, slot));
});

test("a serialized zero field offset can be extended while preserving AQI and opaque root slot 17", async () => {
    const original = withZeroNextHourRootSlot();
    assert.equal(inspectWK3NextHourRootSlot(original).status, "root_slot_offset_zero");
    const opaqueSlots = [1, 2, 3, 4, 9, 14, 17];
    const opaqueBefore = new Map(opaqueSlots.map(slot => [slot, tableFingerprint(original, slot)]));
    assert.ok(opaqueBefore.get(17), "fixture contains an opaque future root table at slot 17");
    let calls = 0;
    const result = await patchWK3NextHourDiagnostic(original, async () => { calls++; return providerForecast({ rainRanges: [[4, 9, 1.4]] }); });
    assert.equal(result.status, "injected");
    assert.equal(result.slotStatus, "root_slot_offset_zero");
    assert.equal(calls, 1);
    assert.deepEqual(readAqSnapshot(result.bytes), readAqSnapshot(original));
    for (const slot of opaqueSlots) assert.deepEqual(tableFingerprint(result.bytes, slot), opaqueBefore.get(slot));
    assert.ok(Math.abs(decodeWK3NextHour(result.bytes).minutes[4].precipitationIntensity - 1.4) < 0.00001);
});

test("root extension fails open before calling Caiyun if any existing root child cannot be validated", async () => {
    const original = withZeroNextHourRootSlot();
    const bb = new ByteBuffer(original), root = bb.readUint32(0), field = bb.__offset(root, 4 + 17 * 2);
    assert.ok(field);
    new DataView(original.buffer, original.byteOffset, original.byteLength).setUint32(root + field, 0xffffffff, true);
    const corrupted = original.slice();
    let calls = 0;
    const result = await patchWK3NextHourDiagnostic(corrupted, async () => { calls++; return providerForecast(); });
    assert.equal(result.status, "root_rebuild_root_pointer_invalid");
    assert.equal(result.sourceCalled, false);
    assert.equal(calls, 0);
    assert.deepEqual(result.bytes, corrupted);
});

test("diagnostics identify an existing but undecodable native child before requesting Caiyun", async () => {
    const original = withNextHour(providerForecast());
    const bb = new ByteBuffer(original), root = bb.readUint32(0), field = bb.__offset(root, 4 + 5 * 2), child = root + field + bb.readUint32(root + field);
    const vtable = child - bb.readInt32(child), oldLength = bb.readUint16(vtable);
    new DataView(original.buffer, original.byteOffset, original.byteLength).setUint16(vtable, oldLength + 2, true);
    let calls = 0;
    const result = await patchWK3NextHourDiagnostic(original, async () => { calls++; return providerForecast(); });
    assert.equal(result.status, "native_child_decode_failed");
    assert.equal(result.slotStatus, "native_child_present");
    assert.equal(result.sourceCalled, false);
    assert.equal(calls, 0);
    assert.deepEqual(result.bytes, original);
});

test("diagnostics distinguish provider failure from conversion rejection and keep original bytes", async () => {
    const original = withNoNextHour();
    const transport = await patchWK3NextHourDiagnostic(original, async () => { throw new Error("private error text"); });
    assert.equal(transport.status, "provider_request_failed");
    assert.equal(transport.sourceCalled, true);
    assert.deepEqual(transport.bytes, original);

    const rejected = await patchWK3NextHourDiagnostic(original, async () => ({}), () => "ready");
    assert.equal(rejected.status, "provider_data_rejected");
    assert.equal(rejected.sourceCalled, true);
    assert.deepEqual(rejected.bytes, original);
});
