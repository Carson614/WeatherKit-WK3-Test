import { Builder, ByteBuffer } from "flatbuffers";
import WeatherAlerts from "./WeatherAlerts.mjs";
import { buildNativeAlertDetailsURL } from "./NativeAlertDetails.mjs";

/** Verified against paired Apple v3 JSON / WK3 b66 responses (2026-11-04):
 * Shanghai wind alert and Miami Coastal Flood Statement. NOT a WK2 codec.
 * Root slot 9; collection: metadata=0, detailsUrl=1, alerts=2.
 * Area-name slot 2 and slots >=22 of summaries remain UNVERIFIED.
 * Only observed enum tokens are translated. Unknown raw integers round-trip.
 */
export const WK3_ALERTS_ROOT_SLOT = 9;
export const WK3_ALERT_ENUMS = {
    severity: { UNKNOWN: 0, MODERATE: 3, MINOR: 4 },
    significance: { UNKNOWN: 0, STATEMENT: 10 },
    urgency: { UNKNOWN: 0, EXPECTED: 2 },
    certainty: { UNKNOWN: 0, LIKELY: 2 },
    importance: { LOW: 2 },
    responses: { MONITOR: 7 },
};
const TEXT = { attributionUrl: 3, countryCode: 4, description: 5, token: 6, detailsUrl: 12, phenomenon: 13, source: 16, eventSource: 17 };
const TIMES = { effectiveTime: 7, expireTime: 8, issuedTime: 9, eventOnsetTime: 10, eventEndTime: 11 };
const ENUMS = { severity: 14, significance: 15, urgency: 18, certainty: 19, importance: 20 };
const SOURCE = Symbol("WK3Alerts.originalArena");
const uint = (v, max = 0xffffffff) => {
    if (!Number.isInteger(v) || v < 0 || v > max) throw new RangeError("Expected unsigned wire integer");
    return v;
};
function input(bytes) {
    if (bytes instanceof ByteBuffer) return bytes.bytes().subarray(bytes.position());
    if (!(bytes instanceof Uint8Array)) throw new TypeError("Expected Uint8Array or ByteBuffer");
    return bytes;
}
function reader(bytes) {
    const b = input(bytes), v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const check = (p, n) => { if (!Number.isInteger(p) || p < 0 || p + n > b.length) throw new RangeError("Invalid WK3 offset"); };
    const u16 = p => { check(p, 2); return v.getUint16(p, true); };
    const u32 = p => { check(p, 4); return v.getUint32(p, true); };
    const indirect = p => { const q = p + u32(p); check(q, 4); return q; };
    const field = (t, i) => {
        check(t, 4); const vt = t - v.getInt32(t, true), n = u16(vt), size = u16(vt + 2);
        check(vt, n); check(t, size);
        if (n < 4 || n % 2 || size < 4) throw new RangeError("Invalid WK3 table");
        const o = 4 + i * 2 < n ? u16(vt + 4 + i * 2) : 0;
        if (o && (o < 4 || o >= size)) throw new RangeError("Invalid WK3 field");
        return o ? t + o : 0;
    };
    const string = p => {
        if (!p) return null; const q = indirect(p), n = u32(q); check(q + 4, n + 1);
        if (b[q + 4 + n]) throw new RangeError("Invalid WK3 string");
        return new TextDecoder("utf-8", { fatal: true }).decode(b.subarray(q + 4, q + 4 + n));
    };
    const vector = (p, width) => { if (!p) return { start: 0, length: 0 }; const q = indirect(p), length = u32(q); check(q + 4, length * width); return { start: q + 4, length }; };
    return { b, v, check, u16, u32, indirect, field, string, vector };
}
function collection(r) { const root = r.indirect(0), f = r.field(root, WK3_ALERTS_ROOT_SLOT); return f ? r.indirect(f) : 0; }
function summary(r, t) {
    const data = {};
    const id = r.field(t, 0);
    if (id) {
        const f = r.field(r.indirect(id), 0), vector = r.vector(f, 1);
        if (vector.length !== 16) throw new RangeError("Expected 16 UUID bytes");
        data.id = { bytes: Array.from(r.b.subarray(vector.start, vector.start + 16)) };
    } else data.id = null;
    const area = r.field(t, 1); data.areaId = r.string(area);
    for (const [k, i] of Object.entries(TEXT)) data[k] = r.string(r.field(t, i));
    for (const [k, i] of Object.entries(TIMES)) { const p = r.field(t, i); data[k] = p ? r.u32(p) : 0; }
    for (const [k, i] of Object.entries(ENUMS)) { const p = r.field(t, i); data[k] = p ? r.b[p] : 0; }
    const responses = r.vector(r.field(t, 21), 1);
    data.responses = Array.from(r.b.subarray(responses.start, responses.start + responses.length));
    return data;
}
/** Read raw numeric enums, never WK2 symbolic mappings. Opaque source is kept
 * for codec encoding. The input must not be mutated after decoding. */
export function decodeWK3Alerts(bytes) {
    const r = reader(bytes), c = collection(r); if (!c) return null;
    const vector = r.vector(r.field(c, 2), 4);
    const data = { detailsUrl: r.string(r.field(c, 1)), alerts: Array.from({ length: vector.length }, (_, i) => summary(r, r.indirect(vector.start + i * 4))) };
    Object.defineProperty(data, SOURCE, { value: r.b, enumerable: true });
    return data;
}
function hasUnverifiedFields(r, t) {
    const vt = t - r.v.getInt32(t, true), count = (r.u16(vt) - 4) / 2;
    const idField = r.field(t, 0);
    if (idField) {
        const id = r.indirect(idField), idVtable = id - r.v.getInt32(id, true), idCount = (r.u16(idVtable) - 4) / 2;
        if (Array.from({ length: Math.max(0, idCount - 1) }, (_, i) => r.field(id, i + 1)).some(Boolean)) return true;
    }
    return Boolean(r.field(t, 2)) || Array.from({ length: Math.max(0, count - 22) }, (_, i) => r.field(t, i + 22)).some(Boolean);
}
function encodeSummary(data) {
    const b = new Builder(), strings = {};
    for (const [k, i] of Object.entries({ areaId: 1, ...TEXT })) {
        if (data[k] != null) { if (typeof data[k] !== "string") throw new TypeError(`Expected string ${k}`); strings[i] = b.createString(data[k]); }
    }
    let id = 0;
    if (data.id) {
        if (!Array.isArray(data.id.bytes) || data.id.bytes.length !== 16) throw new TypeError("Expected UUID byte array");
        b.startVector(1, 16, 1); for (const byte of [...data.id.bytes].reverse()) b.addInt8(uint(byte, 255));
        const vector = b.endVector(); b.startObject(1); b.addFieldOffset(0, vector, 0); id = b.endObject();
    }
    if (!Array.isArray(data.responses)) throw new TypeError("Expected raw responses array");
    b.startVector(1, data.responses.length, 1);
    for (const response of [...data.responses].reverse()) b.addInt8(uint(response, 255));
    const responses = b.endVector();
    b.startObject(22); b.addFieldOffset(0, id, 0);
    for (const [i, offset] of Object.entries(strings)) b.addFieldOffset(Number(i), offset, 0);
    for (const [k, i] of Object.entries(TIMES)) b.addFieldInt32(i, uint(data[k]), 0);
    for (const [k, i] of Object.entries(ENUMS)) b.addFieldInt8(i, uint(data[k], 255), 0);
    b.addFieldOffset(21, responses, 0); b.finish(b.endObject()); return b.asUint8Array();
}
/** Replace existing summaries only. Never invent IDs, remove/add/reorder alerts,
 * rebuild the weather root, touch AQ, or discard unverified summary fields.
 * Unchanged data returns the identical input view; failures throw atomically.
 * Use in a try/catch and retain rawBody on failure. */
export function patchWK3Alerts(bytes, alerts, options = {}) {
    const r = reader(bytes), c = collection(r);
    if (!c) { if (alerts?.length) throw new RangeError("Apple response has no alerts collection"); return r.b; }
    const vector = r.vector(r.field(c, 2), 4);
    if (!Array.isArray(alerts) || alerts.length !== vector.length) throw new RangeError("Cannot add/remove WK3 alerts");
    const replacements = [];
    for (let i = 0; i < alerts.length; i++) {
        const p = vector.start + i * 4, t = r.indirect(p), before = summary(r, t), after = alerts[i];
        if (!after || JSON.stringify(after.id) !== JSON.stringify(before.id)) throw new TypeError("Cannot change WK3 alert identity/order");
        const known = new Set(["id", "areaId", ...Object.keys(TEXT), ...Object.keys(TIMES), ...Object.keys(ENUMS), "responses"]);
        if (Object.keys(after).some(k => !known.has(k))) throw new TypeError("Unverified WK3 alert field");
        if (JSON.stringify(after) === JSON.stringify(before)) continue;
        if (hasUnverifiedFields(r, t)) throw new RangeError("Unverified WK3 summary fields; preserve original");
        replacements.push({ p, bytes: encodeSummary(after) });
    }
    let out = r.b;
    for (const replacement of replacements) {
        const start = Math.ceil(out.length / 8) * 8, next = new Uint8Array(start + replacement.bytes.length);
        next.set(out); next.set(replacement.bytes, start);
        new DataView(next.buffer).setUint32(replacement.p, start + new DataView(replacement.bytes.buffer, replacement.bytes.byteOffset).getUint32(0, true) - replacement.p, true);
        out = next;
    }
    if (options.detailsUrl !== undefined) {
        const p = r.field(c, 1);
        if (!p || typeof options.detailsUrl !== "string") throw new TypeError("Expected existing collection URL field");
        if (options.detailsUrl !== r.string(p)) {
            const value = new TextEncoder().encode(options.detailsUrl), start = Math.ceil(out.length / 4) * 4;
            const next = new Uint8Array(start + value.length + 5); next.set(out); next.set(value, start + 4);
            const v = new DataView(next.buffer); v.setUint32(start, value.length, true); v.setUint32(p, start - p, true); out = next;
        }
    }
    return out;
}
/** Conservative provider enrichment: keeps Apple identity, URLs and all
 * non-empty fields; unsupported symbolic enums are not guessed or written.
 * Caller supplies unambiguously matched source records in Apple array order. */
export function enrichWK3Alerts(original, matchedSources) {
    if (!Array.isArray(matchedSources) || original.alerts.length !== matchedSources.length) throw new RangeError("Expected one matched source per Apple alert");
    return original.alerts.map((alert, i) => {
        const source = matchedSources[i]; if (!source) return alert;
        const out = { ...alert };
        if (source.description) out.description = source.description;
        for (const key of ["source", "areaId", "phenomenon", "token"]) if (!out[key] && source[key]) out[key] = source[key];
        for (const key of Object.keys(TIMES)) {
            if (out[key] || source[key] == null) continue;
            const time = typeof source[key] === "number" ? source[key] : Date.parse(source[key]) / 1000;
            if (Number.isInteger(time) && time > 0 && time <= 0xffffffff) out[key] = time;
        }
        if (!out.eventEndTime && out.expireTime) out.eventEndTime = out.expireTime;
        if (!out.eventOnsetTime && out.effectiveTime) out.eventOnsetTime = out.effectiveTime;
        for (const key of Object.keys(ENUMS)) {
            if (out[key]) continue;
            const token = String(source[key] ?? "").toUpperCase(), value = WK3_ALERT_ENUMS[key][token];
            if (value !== undefined) out[key] = value;
        }
        return out;
    });
}
/** FlatBufferRootProcessor-compatible codec. Requires a decoded source arena;
 * not a from-scratch weather/schema encoder. Root accessor must be slot 9. */
export class WK3AlertsTable { __init(position, bb) { this.bb_pos = position; this.bb = bb; return this; } }
export const wk3AlertsCodec = {
    tableClass: WK3AlertsTable,
    decode(table) {
        // The processor passes an arena with an arbitrary child table position.
        const source = table.bb.bytes(), wrapper = new Uint8Array(40 + source.length); wrapper.set(source, 40);
        const v = new DataView(wrapper.buffer);
        v.setUint32(0, 28, true); v.setUint16(4, 24, true); v.setUint16(6, 8, true); v.setUint16(26, 4, true);
        v.setInt32(28, 24, true); v.setUint32(32, 40 + table.bb_pos - 32, true);
        return decodeWK3Alerts(wrapper);
    },
    encode(builder, data) {
        if (!data?.[SOURCE]) throw new TypeError("WK3 alerts codec requires decoded source arena");
        const bytes = patchWK3Alerts(data[SOURCE], data.alerts, { detailsUrl: data.detailsUrl }), r = reader(bytes), c = collection(r);
        builder.prep(8, bytes.length); builder.pad(bytes.length);
        builder.dataBuffer().bytes().set(bytes, builder.space);
        return builder.offset() - c;
    },
};

function normalizedAlertType(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/(?:蓝|黄|橙|红)色?(?:预警信号|预警)$/u, "")
        .replace(/(?:预警信号|预警)$/u, "")
        .replace(/[。．.]+$/u, "");
}

function exactSourceMatches(alert, extracted, region) {
    const counts = { region: 0, type: 0, severity: 0, issued: 0, candidates: 0 };
    const fail = (status, result = status) => ({ status: result, diagnostic: status, counts });
    const regionCode = region.match(/-(\d{9})$/)?.[1];
    if (!regionCode || alert.countryCode !== "CN") return fail("region_unverified");
    if (alert.areaId && alert.areaId !== regionCode) return fail("region_mismatch");
    const regionCandidates = extracted.alerts.filter(source => source?.areaId === regionCode);
    counts.region = regionCandidates.length;
    if (!regionCandidates.length) return fail("source_region_no_match", "event_unmatched");
    if (!alert.description) return fail("type_unverified", "apple_fields_unverified");
    const appleType = normalizedAlertType(alert.description);
    if (!appleType) return fail("type_unverified", "apple_fields_unverified");
    const typeCandidates = regionCandidates.filter(source => {
        const sourceType = normalizedAlertType(source?.eventName || source?.description);
        return sourceType !== "" && sourceType === appleType;
    });
    counts.type = typeCandidates.length;
    if (!typeCandidates.length) return fail("type_no_match", "event_unmatched");
    const expectedSeverity = { 3: "moderate", 4: "minor" }[alert.severity];
    if (!expectedSeverity) return fail("severity_unverified", "apple_fields_unverified");
    const severityCandidates = typeCandidates.filter(source => source?.severity === expectedSeverity);
    counts.severity = severityCandidates.length;
    if (!severityCandidates.length) return fail("severity_no_match", "event_unmatched");
    if (!Number.isInteger(alert.issuedTime) || alert.issuedTime <= 0) return fail("issue_time_unverified", "apple_fields_unverified");
    const candidates = severityCandidates.filter(source => {
        const sourceTime = Date.parse(source?.issuedTime);
        return Number.isFinite(sourceTime) && sourceTime === alert.issuedTime * 1000;
    });
    counts.issued = candidates.length;
    counts.candidates = candidates.length;
    if (!candidates.length) return fail("issue_time_no_match", "event_unmatched");
    if (candidates.length !== 1) return fail("candidate_ambiguous", "event_ambiguous");
    return { source: candidates[0], diagnostic: "matched", counts };
}

/** No API credential required. Rewrites links only after every existing Apple
 * event has one exact region/type/level/publish-time match. Summary semantics
 * remain Apple-owned; only the collection and per-alert details URLs change. */
export async function patchWK3QWeatherAlertsDiagnostic(bytes, { language = "zh-CN", timezone, fetchImpl = globalThis.fetch, rewriteDetails = true } = {}) {
    const raw = input(bytes);
    try {
        const original = decodeWK3Alerts(raw);
        if (!original) return { bytes: raw, status: "no_collection", eventCount: 0 };
        if (!original.alerts.length) return { bytes: raw, status: "no_apple_alerts", eventCount: 0 };
        const identifier = WeatherAlerts.ParseWeatherAlertPageURL(original.detailsUrl);
        if (!identifier || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*-\d{9}$/.test(identifier)) return { bytes: raw, status: "region_unverified", eventCount: original.alerts.length };
        let extracted;
        try {
            // Build the same WeatherKit-shaped records that the details route
            // will serve. This also binds each source event to the requested
            // QWeather region identifier before matching.
            extracted = await WeatherAlerts.DetailsForQWeather(identifier, language, fetchImpl);
        } catch {
            return { bytes: raw, status: "source_unavailable", eventCount: original.alerts.length };
        }
        const sourceDiagnostics = extracted?.pageDiagnostics ?? {};
        if (!Array.isArray(extracted)) return { bytes: raw, status: "source_structure_unverified", eventCount: original.alerts.length, sourceCount: 0, sourceDiagnostics };
        if (!extracted.length) return { bytes: raw, status: "source_no_alerts", eventCount: original.alerts.length, sourceCount: 0, sourceDiagnostics };
        const matches = [], used = new Set(), eventDiagnostics = [];
        let failure;
        for (const alert of original.alerts) {
            const result = exactSourceMatches(alert, { alerts: extracted }, identifier);
            if (!result.source) {
                eventDiagnostics.push({ status: result.diagnostic, counts: result.counts });
                failure ??= result.status;
                continue;
            }
            if (used.has(result.source)) {
                eventDiagnostics.push({ status: "source_reused", counts: result.counts });
                failure ??= "event_ambiguous";
                continue;
            }
            used.add(result.source);
            eventDiagnostics.push({ status: result.diagnostic, counts: result.counts });
            matches.push(result.source);
        }
        if (failure) return { bytes: raw, status: failure, eventCount: original.alerts.length, sourceCount: extracted.length, sourceDiagnostics, eventDiagnostics };
        if (!rewriteDetails) return { bytes: raw, status: "matched_rewrite_disabled", eventCount: original.alerts.length };
        const detailsUrl = buildNativeAlertDetailsURL({ identifier, language, timezone, alerts: original.alerts, matchedSources: matches });
        const rewritten = original.alerts.map(alert => ({ ...alert, detailsUrl }));
        const output = patchWK3Alerts(raw, rewritten, { detailsUrl });
        return { bytes: output, status: "rewritten", eventCount: original.alerts.length, sourceCount: extracted.length, sourceDiagnostics, eventDiagnostics };
    } catch (error) {
        const status = error instanceof RangeError && /payload too long|ids too long/i.test(error.message)
            ? "details_payload_too_large"
            : error instanceof RangeError && /Unverified WK3 summary fields/.test(error.message)
            ? "summary_structure_unverified"
            : error instanceof RangeError && /Invalid WK3/.test(error.message)
                ? "structure_invalid"
                : "patch_failed";
        return { bytes: raw, status, eventCount: 0 };
    }
}

export async function patchWK3QWeatherAlerts(bytes, options = {}) {
    return (await patchWK3QWeatherAlertsDiagnostic(bytes, options)).bytes;
}
