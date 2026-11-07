import { readFileSync } from "node:fs";
import { Builder, ByteBuffer } from "flatbuffers";

export const region = "jiangsu-101190404";
export const regionCode = "101190404";
export const issueSeconds = Math.floor(Date.parse("2026-11-07T10:00:00+08:00") / 1000);
export const sourceIssueTime = new Date(issueSeconds * 1000).toISOString();
export const baseFixture = new Uint8Array(readFileSync(new URL("../fixtures/wk3-aq.synthetic.bin", import.meta.url)));

function uuidBytes(value) {
    const hex = value.replaceAll("-", "");
    return Array.from({ length: 16 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

function encodeSummary(builder, spec) {
    const strings = new Map();
    for (const [slot, key] of [[1, "areaId"], [2, "areaName"], [4, "countryCode"], [5, "description"], [12, "detailsUrl"], [16, "source"]]) {
        if (spec[key] !== undefined) strings.set(slot, builder.createString(spec[key]));
    }
    const idValues = uuidBytes(spec.id);
    builder.startVector(1, 16, 1);
    for (const byte of idValues.reverse()) builder.addInt8(byte);
    const idVector = builder.endVector();
    builder.startObject(1); builder.addFieldOffset(0, idVector, 0);
    const idTable = builder.endObject();

    builder.startVector(1, 0, 1);
    const responses = builder.endVector();
    builder.startObject(22);
    builder.addFieldOffset(0, idTable, 0);
    for (const [slot, offset] of strings) builder.addFieldOffset(slot, offset, 0);
    builder.addFieldInt32(9, spec.issuedTime ?? issueSeconds, 0);
    builder.addFieldInt32(8, spec.expireTime ?? issueSeconds + 3600, 0);
    builder.addFieldInt8(14, spec.severity ?? 3, 0);
    builder.addFieldOffset(21, responses, 0);
    return builder.endObject();
}

export function alertSpec({ index = 1, id, description = "雷电黄色预警", severity = 3, issuedTime = issueSeconds, areaId = regionCode, areaName } = {}) {
    return {
        id: id ?? `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        description, severity, issuedTime, areaId, areaName,
        detailsUrl: "https://www.qweather.com/severe-weather/jiangsu-101190404.html?from=AppleWeatherService",
        countryCode: "CN",
    };
}

function encodeCollection(specs) {
    const builder = new Builder();
    const entries = specs.map(spec => encodeSummary(builder, spec));
    builder.startVector(4, entries.length, 4);
    for (const entry of [...entries].reverse()) builder.addOffset(entry);
    const alerts = builder.endVector();
    const url = builder.createString("https://www.qweather.com/severe-weather/jiangsu-101190404.html?from=AppleWeatherService");
    builder.startObject(3);
    builder.addFieldOffset(1, url, 0);
    builder.addFieldOffset(2, alerts, 0);
    const collection = builder.endObject();
    builder.finish(collection);
    return builder.asUint8Array();
}

/** Grafts a synthetic WK3 b66 alert collection into root slot 9 of the stable
 * accepted AQI/minute-rain fixture. All other root bytes and child tables stay
 * byte-identical; slots 14 and 17 remain opaque. */
export function withWeatherAlerts(specs = [alertSpec()], { absentCollection = false } = {}) {
    const root = baseFixture.slice();
    const bb = new ByteBuffer(root), rootTable = bb.readUint32(0), fieldOffset = bb.__offset(rootTable, 4 + 9 * 2);
    if (!fieldOffset) throw new Error("Base fixture lacks WK3 root slot 9 storage");
    const nextHourField = bb.__offset(rootTable, 4 + 5 * 2);
    if (nextHourField) new DataView(root.buffer, root.byteOffset, root.byteLength).setUint32(rootTable + nextHourField, 0, true);
    const fieldAddress = rootTable + fieldOffset;
    if (absentCollection) {
        const vtable = rootTable - bb.readInt32(rootTable);
        new DataView(root.buffer, root.byteOffset, root.byteLength).setUint16(vtable + 4 + 9 * 2, 0, true);
        return root;
    }
    const child = encodeCollection(specs);
    const alignment = Math.ceil(root.length / 8) * 8;
    const output = new Uint8Array(alignment + child.length);
    output.set(root); output.set(child, alignment);
    const collectionTarget = alignment + new DataView(child.buffer, child.byteOffset, child.byteLength).getUint32(0, true);
    new DataView(output.buffer).setUint32(fieldAddress, collectionTarget - fieldAddress, true);
    return output;
}

export function qweatherHTML(events = [{ description: "雷电黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "请注意防范雷电。" }]) {
    return `<html><head><title>张家港市天气预警</title></head><body><h1 class="c-submenu__location">张家港市</h1>${events.map(event => `
<div class="c-city-warning-events warning--${event.color ?? "yellow"}">
<h3>江苏省张家港市气象台发布 ${event.description}</h3>
<p>发布日期：${event.issueText ?? "2026-11-07 10:00"}</p>
<p class="warning-events__txt">${event.message ?? "请注意防范。"}</p>
<div class="warning-explain"><h4>预警说明</h4><p>详细说明内容。</p></div>
<div class="warning-defense__txt"><p>1. 关注天气变化。</p></div>
</div>`).join("")}</body></html>`;
}

export function tableFingerprint(bytes, slot) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4 + slot * 2);
    if (!field) return null;
    const target = root + field + bb.readUint32(root + field), vtable = target - bb.readInt32(target);
    const vtableLength = bb.readUint16(vtable), objectLength = bb.readUint16(vtable + 2);
    return { table: Array.from(bytes.slice(target, target + objectLength)), vtable: Array.from(bytes.slice(vtable, vtable + vtableLength)) };
}

export function qweatherFetch({ html = qweatherHTML(), status = 200, contentType = "text/html; charset=utf-8", fail = false, count } = {}) {
    let calls = 0;
    const fetchImpl = async (url, options) => {
        calls++;
        assertQWeatherRequest(url, options);
        if (fail) throw new Error("test source failure");
        return { status, headers: { "content-type": contentType }, body: html };
    };
    return { fetchImpl, get calls() { return calls; }, get expectedCalls() { return count; } };
}

function assertQWeatherRequest(value, options) {
    const url = new URL(value);
    if (url.hostname !== "www.qweather.com" || !url.pathname.includes("/severe-weather/") || url.searchParams.get("from") !== "AppleWeatherService") throw new Error("Unexpected source request");
    if (options?.headers?.Authorization || options?.headers?.Cookie) throw new Error("Sensitive headers must not be forwarded");
}
