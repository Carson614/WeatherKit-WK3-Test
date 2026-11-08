/*
 * WK2 Watch AQI Companion guard.
 * The pinned NSRingo WeatherKit v3.3.2 response bundle remains the sole AQI
 * codec/provider implementation. This guard limits its invocation to valid,
 * explicit Mainland-China WK2 airQuality responses and restores the original
 * bytes if the newly encoded EPA AQI cannot be validated.
 */
globalThis.__wk2WatchAQI = (() => {
    const state = { original: "unknown", sourceCalled: false, encodeFailed: false, scriptFailed: false };
    const ownDone = $done;
    const response = $response;
    const originalBody = response?.bodyBytes ?? response?.body;
    const originalBytes = asBytes(originalBody);
    const request = $request;
    const requestURL = parseURL(request?.url);
    const requestCoordinates = requestURL ? parseCoordinates(requestURL) : undefined;
    const media = responseMedia(response?.headers);
    const dataSets = requestURL?.searchParams.getAll("dataSets") ?? [];
    const explicitlyRequestsAQ = dataSets.length === 1 && dataSets[0].split(",").some(value => value.trim() === "airQuality");
    let root = originalBytes ? readRoot(originalBytes) : undefined;
    let aqState = root?.state ?? "invalid";

    function asBytes(value) {
        if (value instanceof Uint8Array) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        if (Array.isArray(value) && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) return Uint8Array.from(value);
        return undefined;
    }

    function parseURL(value) {
        try { return new URL(value); } catch { return undefined; }
    }

    function parseCoordinates(url) {
        const match = url.pathname.match(/^\/api\/v2\/weather\/[^/]+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/?$/i);
        if (!match) return undefined;
        const latitude = Number(match[1]);
        const longitude = Number(match[2]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
        return { latitude, longitude };
    }

    function responseMedia(headers) {
        if (!headers || typeof headers !== "object") return undefined;
        const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === "content-type");
        if (!entry) return undefined;
        const parts = String(entry[1]).split(";").map(part => part.trim());
        const type = parts.shift()?.toLowerCase();
        const messageType = parts.find(part => /^messagetype=/i.test(part))?.split("=", 2)[1]?.replace(/^"|"$/g, "");
        return type === "application/vnd.apple.flatbuffer" && messageType === "WK2.Weather" ? "wk2" : "invalid";
    }

    function inBounds(bytes, offset, length) {
        return Number.isInteger(offset) && Number.isInteger(length) && offset >= 0 && length >= 0 && offset + length <= bytes.length;
    }

    function tableAt(bytes, position) {
        if (!inBounds(bytes, position, 4)) return undefined;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const vtablePosition = position - view.getInt32(position, true);
        if (!inBounds(bytes, vtablePosition, 4)) return undefined;
        const vtableLength = view.getUint16(vtablePosition, true);
        const objectLength = view.getUint16(vtablePosition + 2, true);
        if (vtableLength < 4 || (vtableLength & 1) !== 0 || objectLength < 4 || !inBounds(bytes, vtablePosition, vtableLength) || !inBounds(bytes, position, objectLength)) return undefined;
        return {
            position,
            vtablePosition,
            vtableLength,
            objectLength,
            field(index, width = 1) {
                const entry = vtablePosition + 4 + index * 2;
                if (entry + 2 > vtablePosition + vtableLength) return undefined;
                const relative = view.getUint16(entry, true);
                if (relative < 4 || relative + width > objectLength) return undefined;
                return position + relative;
            },
        };
    }

    function childTable(bytes, table, index) {
        const field = table?.field(index, 4);
        if (field === undefined) return { state: "absent" };
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const relative = view.getUint32(field, true);
        if (relative === 0) return { state: "absent" };
        const position = field + relative;
        const child = tableAt(bytes, position);
        return child ? { state: "present", table: child } : { state: "invalid" };
    }

    function readRoot(bytes) {
        if (!(bytes instanceof Uint8Array) || bytes.length < 8) return { state: "invalid" };
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const rootPosition = view.getUint32(0, true);
        const table = tableAt(bytes, rootPosition);
        if (!table) return { state: "invalid" };
        const aq = childTable(bytes, table, 0); // WK2.Weather.airQuality is root slot 0 in the pinned schema.
        return { state: aq.state, table, aq: aq.table };
    }

    function intField(bytes, table, index, fallback = 0) {
        const field = table?.field(index, 4);
        return field === undefined ? fallback : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(field, true);
    }

    function shortField(bytes, table, index, fallback = 0) {
        const field = table?.field(index, 2);
        return field === undefined ? fallback : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt16(field, true);
    }

    function byteField(bytes, table, index, fallback = 0) {
        const field = table?.field(index, 1);
        return field === undefined ? fallback : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt8(field);
    }

    function floatField(bytes, table, index) {
        const field = table?.field(index, 4);
        return field === undefined ? undefined : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat32(field, true);
    }

    function boolField(bytes, table, index) {
        const field = table?.field(index, 1);
        return field === undefined ? false : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt8(field) !== 0;
    }

    function stringField(bytes, table, index) {
        const field = table?.field(index, 4);
        if (field === undefined) return undefined;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const relative = view.getUint32(field, true);
        const start = field + relative;
        if (relative === 0 || !inBounds(bytes, start, 4)) return undefined;
        const length = view.getUint32(start, true);
        if (length > 96 || !inBounds(bytes, start + 4, length)) return undefined;
        let value = "";
        for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[start + 4 + i]);
        return value;
    }

    function expectedEpaCategory(index) {
        if (index <= 50) return 1;
        if (index <= 100) return 2;
        if (index <= 150) return 3;
        if (index <= 200) return 4;
        if (index <= 300) return 5;
        if (index <= 500) return 6;
        return undefined;
    }

    function distanceMeters(a, b) {
        const rad = value => value * Math.PI / 180;
        const dLat = rad(b.latitude - a.latitude);
        const dLon = rad(b.longitude - a.longitude);
        const lat1 = rad(a.latitude);
        const lat2 = rad(b.latitude);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }

    function inspectAqi(bytes) {
        const parsed = readRoot(bytes);
        if (parsed.state !== "present") return { root: parsed.state };
        const aq = parsed.aq;
        const metadataResult = childTable(bytes, aq, 0);
        if (metadataResult.state !== "present") return { root: "invalid", reason: "metadata" };
        const metadata = metadataResult.table;
        const categoryIndex = byteField(bytes, aq, 1, -1);
        const index = shortField(bytes, aq, 2, -1);
        const scale = stringField(bytes, aq, 7);
        const latitude = floatField(bytes, metadata, 3);
        const longitude = floatField(bytes, metadata, 4);
        const readTime = intField(bytes, metadata, 7, 0);
        const reportedTime = intField(bytes, metadata, 8, 0);
        const expireTime = intField(bytes, metadata, 1, 0);
        const unavailable = boolField(bytes, metadata, 9);
        const now = Math.trunc(Date.now() / 1000);
        const coordinatesValid = Number.isFinite(latitude) && Number.isFinite(longitude) && requestCoordinates && distanceMeters(requestCoordinates, { latitude, longitude }) <= 10000;
        const timeValid = readTime > 0 && reportedTime > 0 && expireTime >= now && readTime <= now + 300 && readTime >= now - 600 && reportedTime <= now + 300 && reportedTime >= now - 21600;
        const numberValid = Number.isInteger(index) && index >= 0 && index <= 500 && categoryIndex === expectedEpaCategory(index);
        return {
            root: "present",
            valid: !unavailable && coordinatesValid && timeValid && numberValid && scale === "EPA_NowCast.2604",
            unavailable,
            coordinatesValid,
            timeValid,
            numberValid,
            scaleValid: scale === "EPA_NowCast.2604",
            index,
            categoryIndex,
        };
    }

    function withHeader(base, value, body) {
        const headers = { ...(base?.headers ?? {}) };
        headers["X-WK2-Watch-AQI-Diag"] = value;
        const output = { ...base, headers, body };
        delete output.bodyBytes;
        return output;
    }

    function doneOriginal(result, diagnostic) {
        const body = originalBody;
        return ownDone(withHeader(result ?? response ?? {}, diagnostic, body));
    }

    const method = String(request?.method ?? "GET").toUpperCase();
    const eligible = requestURL?.hostname === "weatherkit.apple.com"
        && requestURL.pathname.startsWith("/api/v2/weather/")
        && method === "GET"
        && requestURL.searchParams.get("country")?.toUpperCase() === "CN"
        && explicitlyRequestsAQ
        && media === "wk2"
        && originalBytes instanceof Uint8Array
        && aqState !== "invalid"
        && Boolean(requestCoordinates);

    if (!eligible) {
        const result = requestURL?.searchParams.get("country")?.toUpperCase() !== "CN" ? "country_skip"
            : !explicitlyRequestsAQ ? "dataset_skip"
                : media !== "wk2" ? "response_type_skip"
                    : aqState === "invalid" || !originalBytes ? "invalid_response"
                        : !requestCoordinates ? "request_invalid" : "scope_skip";
        doneOriginal(response, `WK2AQI/1;original=${aqState};source=not_called;result=${result}`);
        return { stop: true };
    }

    state.original = aqState;
    if (aqState === "present") {
        doneOriginal(response, "WK2AQI/1;original=present;source=not_called;result=original_preserved");
        return { stop: true };
    }
    if (aqState !== "absent") {
        doneOriginal(response, "WK2AQI/1;original=invalid;source=not_called;result=safe_fallback");
        return { stop: true };
    }

    const httpGet = globalThis.$httpClient?.get;
    if (typeof httpGet === "function") {
        globalThis.$httpClient.get = function (requestArgument, callback) {
            const url = parseURL(typeof requestArgument === "string" ? requestArgument : requestArgument?.url);
            if (url?.hostname === "api.caiyunapp.com" && url.pathname.includes("/realtime")) state.sourceCalled = true;
            return httpGet.call(this, requestArgument, callback);
        };
    }

    globalThis.$done = function (result) {
        const candidateBytes = asBytes(result?.bodyBytes ?? result?.body);
        const inspected = candidateBytes ? inspectAqi(candidateBytes) : { root: "invalid" };
        let reason;
        if (state.encodeFailed) reason = "encode_failed";
        else if (inspected.root === "present" && inspected.unavailable) reason = "source_unavailable";
        else if (inspected.root !== "present" && state.sourceCalled) reason = "source_unavailable";
        else if (inspected.root === "present" && inspected.valid) reason = "injected";
        else reason = "safe_fallback";

        if (reason !== "injected") {
            const diagnostic = `WK2AQI/1;original=missing;source=${state.sourceCalled ? "called" : "not_called"};result=${reason}`;
            return ownDone(withHeader(result ?? response, diagnostic, originalBody));
        }

        const diagnostic = "WK2AQI/1;original=missing;source=ok;result=injected";
        return ownDone(withHeader(result ?? response, diagnostic, candidateBytes));
    };

    return state;
})();
