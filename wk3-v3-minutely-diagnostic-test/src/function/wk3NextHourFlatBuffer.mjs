import { Builder } from "flatbuffers";
import { decodeWK3NextHour, encodeNextHour, providerToWK3NextHour } from "../class/WK3NextHour.mjs";

const SLOT = 5;
const TABLE_FIELDS = [0, 1, 2, 3, 4, 5];
const VECTOR_FIELDS = [0, 1, 2, 5];

function view(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
function readUint32(bytes, offset) { return view(bytes).getUint32(offset, true); }
function readInt32(bytes, offset) { return view(bytes).getInt32(offset, true); }
function writeUint32(bytes, offset, value) { view(bytes).setUint32(offset, value, true); }

function fieldOffset(bytes, table, index) {
    const vtable = table - readInt32(bytes, table);
    if (vtable < 0 || vtable + 4 > bytes.length) return 0;
    const vtableLength = view(bytes).getUint16(vtable, true);
    const objectLength = view(bytes).getUint16(vtable + 2, true);
    if (vtableLength < 4 || vtableLength % 2 || vtable + vtableLength > bytes.length || table + objectLength > bytes.length) return 0;
    const entry = vtable + 4 + index * 2;
    if (entry + 2 > vtable + vtableLength) return 0;
    const offset = view(bytes).getUint16(entry, true);
    return offset && offset < objectLength ? offset : 0;
}

function rootSlotAddress(bytes) {
    if (bytes.length < 8) return 0;
    const root = readUint32(bytes, 0);
    if (root < 4 || root + 4 > bytes.length) return 0;
    const vtable = root - readInt32(bytes, root);
    if (vtable < 0 || vtable + 4 > bytes.length) return 0;
    const vtableLength = view(bytes).getUint16(vtable, true);
    const objectLength = view(bytes).getUint16(vtable + 2, true);
    const entry = vtable + 4 + SLOT * 2;
    if (vtableLength < 4 + (SLOT + 1) * 2 || entry + 2 > vtable + vtableLength) return 0;
    if (objectLength < 4 || root + objectLength > bytes.length) return 0;
    const offset = view(bytes).getUint16(entry, true);
    if (!offset || offset + 4 > objectLength) return 0;
    return root + offset;
}

/** Classify the root slot without broadening the write validator. */
export function inspectWK3NextHourRootSlot(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 8) return { status: "invalid_body" };
    try {
        const root = readUint32(bytes, 0);
        if (root < 4 || root + 4 > bytes.length) return { status: "root_invalid" };
        const vtable = root - readInt32(bytes, root);
        if (vtable < 0 || vtable + 4 > bytes.length) return { status: "root_invalid" };
        const vtableLength = view(bytes).getUint16(vtable, true);
        const objectLength = view(bytes).getUint16(vtable + 2, true);
        if (vtableLength < 4 || vtableLength % 2 || vtable + vtableLength > bytes.length
            || objectLength < 4 || root + objectLength > bytes.length) return { status: "root_invalid" };
        const entry = vtable + 4 + SLOT * 2;
        if (entry + 2 > vtable + vtableLength) return { status: "root_slot_missing" };
        const offset = view(bytes).getUint16(entry, true);
        if (!offset) return { status: "root_slot_missing" };
        if (offset + 4 > objectLength) return { status: "root_slot_invalid" };
        const address = root + offset;
        const relative = readUint32(bytes, address);
        if (!relative) return { status: "root_slot_empty", address };
        const target = address + relative;
        if (target < 4 || target + 4 > bytes.length) return { status: "native_child_pointer_invalid" };
        return { status: "native_child_present", address };
    } catch {
        return { status: "root_invalid" };
    }
}

function appendAtRootSlot(bytes, encoded) {
    const rootFieldAddress = rootSlotAddress(bytes);
    if (!rootFieldAddress || readUint32(bytes, rootFieldAddress) !== 0) return bytes;
    const appendAt = Math.ceil(bytes.length / 4) * 4;
    const output = new Uint8Array(appendAt + encoded.length);
    output.set(bytes);
    output.set(encoded, appendAt);
    const tableRoot = readUint32(encoded, 0);
    const target = appendAt + tableRoot;
    if (target <= rootFieldAddress || target - rootFieldAddress > 0xffffffff) return bytes;
    writeUint32(output, rootFieldAddress, target - rootFieldAddress);
    return output;
}

function patchVectors(bytes, encoded) {
    const root = readUint32(bytes, 0), rootField = fieldOffset(bytes, root, SLOT);
    if (!rootField) return bytes;
    const table = root + rootField + readUint32(bytes, root + rootField);
    const oldFields = TABLE_FIELDS.map(index => fieldOffset(bytes, table, index));
    if (oldFields.some(offset => !offset)) return bytes;

    const encodedRoot = readUint32(encoded, 0);
    const newFields = TABLE_FIELDS.map(index => fieldOffset(encoded, encodedRoot, index));
    if (newFields.some(offset => !offset)) return bytes;

    const appendAt = Math.ceil(bytes.length / 4) * 4;
    const output = new Uint8Array(appendAt + encoded.length);
    output.set(bytes);
    output.set(encoded, appendAt);
    for (const index of VECTOR_FIELDS) {
        const oldAddress = table + oldFields[index];
        const newAddress = encodedRoot + newFields[index];
        const target = appendAt + newAddress + readUint32(encoded, newAddress);
        if (target <= oldAddress || target - oldAddress > 0xffffffff) return bytes;
        writeUint32(output, oldAddress, target - oldAddress);
    }
    for (const index of [3, 4]) {
        const oldAddress = table + oldFields[index];
        const newAddress = encodedRoot + newFields[index];
        view(output).setUint32(oldAddress, readUint32(encoded, newAddress), true);
    }
    return output;
}

/** Update only a validated WK3 next-hour child and expose a safe stage code. */
export async function patchWK3NextHourDiagnostic(bytes, getProviderForecast, getProviderStatus = () => "unknown") {
    const slot = inspectWK3NextHourRootSlot(bytes);
    const unchanged = (status, sourceCalled = false) => ({ bytes, status, slotStatus: slot.status, sourceCalled });
    if (slot.status === "invalid_body" || slot.status === "root_invalid" || slot.status === "root_slot_invalid") return unchanged(slot.status);
    if (slot.status === "root_slot_missing") return unchanged("root_slot_missing");
    if (slot.status === "native_child_pointer_invalid") return unchanged("native_child_pointer_invalid");

    const missingNativeChild = slot.status === "root_slot_empty";
    if (!missingNativeChild) {
        try {
            if (!decodeWK3NextHour(bytes)) return unchanged("native_child_decode_failed");
        } catch {
            return unchanged("native_child_decode_failed");
        }
    }

    let providerForecast;
    try {
        providerForecast = await getProviderForecast();
    } catch {
        return unchanged("provider_request_failed", true);
    }
    let providerStatus = "unknown";
    try { providerStatus = getProviderStatus(); } catch { providerStatus = "status_unavailable"; }
    if (providerStatus === "region_unavailable") return unchanged("provider_region_unavailable", true);
    if (providerStatus === "request_failed") return unchanged("provider_request_failed", true);
    if (providerStatus === "response_invalid") return unchanged("provider_response_invalid", true);
    if (!providerForecast) return unchanged("provider_no_data", true);

    let data;
    try {
        data = providerToWK3NextHour(providerForecast, { intensityUnit: "mm/h", chanceUnit: "percent" });
    } catch {
        return unchanged("provider_data_rejected", true);
    }
    let encoded;
    try {
        const builder = new Builder();
        builder.finish(encodeNextHour(builder, data));
        encoded = builder.asUint8Array();
    } catch {
        return unchanged("encode_rejected", true);
    }

    try {
        const output = missingNativeChild ? appendAtRootSlot(bytes, encoded) : patchVectors(bytes, encoded);
        if (output === bytes) return unchanged("merge_rejected", true);
        return { bytes: output, status: "injected", slotStatus: slot.status, sourceCalled: true };
    } catch {
        return unchanged("merge_rejected", true);
    }
}

/** Backward-compatible byte-only API for the non-diagnostic test harness. */
export async function patchWK3NextHour(bytes, getProviderForecast) {
    return (await patchWK3NextHourDiagnostic(bytes, getProviderForecast)).bytes;
}
