import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";
import { decodeWK3Alerts } from "../src/class/WK3Alerts.mjs";
import { decodeWK3NextHour } from "../src/class/WK3NextHour.mjs";
import { alertSpec, issueSeconds, qweatherHTML, tableFingerprint, withWeatherAlerts } from "./helpers/weatherAlertsFixture.mjs";

const responseUrl = new URL("../response.dev.bundle.js", import.meta.url);
const requestUrl = new URL("../request.dev.bundle.js", import.meta.url);

function aqSnapshot(bytes) {
    const bb = new ByteBuffer(bytes), root = bb.readUint32(0), field = bb.__offset(root, 4);
    const table = bb.__indirect(root + field), scalar = (slot, method) => { const p = bb.__offset(table, slot); return p ? bb[method](table + p) : 0; };
    const scale = bb.__offset(table, 18);
    return { scale: scale ? bb.__string(table + scale) : null, index: scalar(8, "readInt16"), categoryIndex: scalar(6, "readInt8"), comparison: scalar(14, "readInt8") };
}

function minutePayload() {
    const precipitation = Array(120).fill(0);
    precipitation.fill(0.8, 4, 20);
    return JSON.stringify({ status: "ok", server_time: issueSeconds, location: [0, 0], result: { minutely: {
        status: "ok", probability: [0.82, 0.61, 0.33, 0.12], precipitation_2h: precipitation, description: "未来两小时有降雨",
    } } });
}

async function invokeResponse(body, { alertProvider = "QWeatherWeb", qweatherStatus = 200, qweatherEvents = [{ description: "雷电黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "请注意防范雷电。" }], logLevel = "OFF" } = {}) {
    globalThis.$environment = { "surge-version": "test" };
    globalThis.$script = { startTime: Date.now() / 1000 };
    globalThis.$request = { method: "GET", headers: {}, url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans-US/31.25/121.5?timezone=Asia%2FShanghai&country=CN&dataSets=airQuality%2CforecastNextHour%2CweatherAlerts" };
    globalThis.$response = { status: 200, headers: {
        "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather", "Content-Length": String(body.length),
    }, bodyBytes: body };
    globalThis.$argument = {
        Storage: "Argument", LogLevel: logLevel, DataSets: ["airQuality", "forecastNextHour", "weatherAlerts"],
        Weather: { Replace: ["CN"] }, NextHour: { Provider: "ColorfulClouds" }, WeatherAlerts: { Provider: alertProvider },
        AirQuality: {
            Current: { Index: { Provider: "ColorfulCloudsUS", Replace: ["HJ6332012", "EU.EAQI", "CN_AQHI", "EPA_NowCast"] },
                Pollutants: { Provider: "ColorfulClouds", Units: { Replace: [], Mode: "Scale" } } },
            Comparison: { ReplaceWhenCurrentChange: true, Yesterday: { IndexProvider: "ColorfulCloudsUS" } },
        },
    };
    globalThis.$persistentStore = { read: () => null, write: () => true };
    const requests = [];
    globalThis.$httpClient = { get(request, callback) {
        const url = typeof request === "string" ? request : request.url;
        requests.push(url);
        if (url.includes("www.qweather.com")) return callback(null, { status: qweatherStatus, headers: { "content-type": "text/html; charset=utf-8" } }, qweatherHTML(qweatherEvents));
        if (url.includes("/realtime")) return callback(null, { status: 200, headers: {} }, JSON.stringify({
            status: "ok", result: { realtime: { status: "ok", air_quality: {
                obs_time: "2026-11-07T10:00:00+08:00", description: { usa: "Moderate", chn: "良" },
                aqi: { usa: 67, chn: 60 }, pm25: 30, pm10: 40, o3: 50, no2: 20, so2: 5, co: 0.5,
            } } }, location: [31.25, 121.5],
        }));
        if (url.includes("/hourly")) return callback(null, { status: 200, headers: {} }, JSON.stringify({
            status: "ok", result: { hourly: { status: "ok", air_quality: { aqi: [{ value: { usa: 25, chn: 20 } }] } } }, location: [31.25, 121.5],
        }));
        if (url.includes("/minutely")) return callback(null, { status: 200, headers: {} }, minutePayload());
        callback(null, { status: 404, headers: {} }, "{}");
    } };
    const logs = [];
    const result = await new Promise((resolve, reject) => {
        const log = console.log; console.log = (...values) => logs.push(values.map(String).join(" "));
        globalThis.$done = value => { console.log = log; resolve(value); };
        import(`${responseUrl.href}?replay=${Math.random()}`).catch(error => { console.log = log; reject(error); });
    });
    assert.ok(result.body instanceof Uint8Array, "binary-body-mode response remains a Uint8Array; " + JSON.stringify({ keys: Object.keys(result ?? {}), bodyKind: result?.body?.constructor?.name ?? typeof result?.body, status: result?.status ?? result?.statusCode, alertDiag: result?.headers?.["X-WK3-Alerts-Diag"] }));
    return { ...result, requests, logs };
}

async function invokeDetailsRequest(url, logLevel = "DEBUG") {
    globalThis.$environment = { "surge-version": "test" };
    globalThis.$script = { startTime: Date.now() / 1000 };
    globalThis.$request = { method: "GET", headers: {}, url };
    globalThis.$argument = { Storage: "Argument", LogLevel: logLevel, DataSets: ["airQuality", "forecastNextHour", "weatherAlerts"], WeatherAlerts: { Provider: "QWeatherWeb" } };
    globalThis.$persistentStore = { read: () => null, write: () => true };
    let externalCalls = 0;
    globalThis.$httpClient = { get(_request, callback) { externalCalls++; callback(new Error("unexpected network call")); } };
    const logs = [];
    const result = await new Promise((resolve, reject) => {
        const log = console.log; console.log = (...values) => logs.push(values.map(String).join(" "));
        globalThis.$done = value => { console.log = log; resolve(value); };
        import(`${requestUrl.href}?replay=${Math.random()}`).catch(error => { console.log = log; reject(error); });
    });
    return { result, externalCalls, logs };
}

test("combined response replay preserves accepted AQI/minute rain while adding matching QWeather details", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const opaqueBefore = new Map([14, 17].map(slot => [slot, tableFingerprint(original, slot)]));
    const result = await invokeResponse(original);
    const alertsDiag = result.headers["X-WK3-Alerts-Diag"];
    assert.match(alertsDiag, /WK3WA\/2;gate=1\/1;provider=qweatherweb;region=mainland;events=1;src=1;parse=1,0,0,0;link=native_api;e0=matched:r1t1s1p1c1;result=rewritten/);
    assert.match(result.headers["X-WK3-NextHour-Diag"], /result=injected/);
    assert.equal(result.headers["Content-Type"], "application/vnd.apple.flatbuffer;messageType=WK3.Weather");
    assert.equal(result.headers["Content-Length"], undefined, "length is removed when binary content grows");
    assert.deepEqual(aqSnapshot(result.body), { scale: "EPA_NowCast.2604", index: 67, categoryIndex: 2, comparison: 2 });
    const rain = decodeWK3NextHour(result.body);
    assert.equal(rain.minutes.length, 85);
    assert.ok(Math.abs(rain.minutes[4].precipitationIntensity - 0.8) < 0.00001);
    assert.equal(decodeWK3Alerts(result.body).alerts[0].id.bytes.length, 16);
    assert.match(decodeWK3Alerts(result.body).detailsUrl, /ids=wk3_/);
    for (const slot of [14, 17]) assert.deepEqual(tableFingerprint(result.body, slot), opaqueBefore.get(slot));
    assert.ok(result.requests.some(url => url.includes("/realtime")));
    assert.ok(result.requests.some(url => url.includes("/hourly")));
    assert.ok(result.requests.some(url => url.includes("/minutely")));
    assert.ok(result.requests.some(url => url.includes("www.qweather.com/severe-weather/")));
    assert.doesNotMatch(alertsDiag, /31\.25|121\.5|token|雷电/);
});

test("real response script logs only bounded alert type text and exact comparison deltas", async () => {
    const events = [
        { description: "道路结冰黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
        { description: "高温黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
    ];
    const result = await invokeResponse(withWeatherAlerts([
        alertSpec({ index: 1, description: "暴雪" }),
        alertSpec({ index: 2, description: "道路结冰黄色预警" }),
    ]), { qweatherEvents: events, logLevel: "DEBUG" });
    const text = result.logs.join("\n");
    assert.match(text, /Apple e0 raw="暴雪" normalized="暴雪"/);
    assert.match(text, /Apple e1 raw="道路结冰黄色预警" normalized="道路结冰"/);
    assert.match(text, /QWeather q0 eventName="道路结冰黄色预警" eventNameNormalized="道路结冰"/);
    assert.match(text, /compare e0\/q0 equal=false alias=none appleOnly="暴雪" qweatherOnly="道路结冰"/);
    assert.match(text, /compare e1\/q0 equal=true alias=none appleOnly="" qweatherOnly=""/);
    assert.doesNotMatch(text, /https?:\/\/|31\.25|121\.5|token|wk3_[A-Za-z0-9_-]+/i);
    assert.equal(result.headers["X-WK3-Alerts-Diag"].includes("e0=type_no_match"), true);
    assert.equal(result.headers["X-WK3-Alerts-Diag"].includes("e1=matched"), true);
    assert.equal(decodeWK3Alerts(result.body).detailsUrl, alertSpec().detailsUrl, "all-or-nothing fallback leaves the original link unchanged");
});

test("the exact snow alias rewrites only after both events pass all strict checks and the local v1/v2 route serves details", async () => {
    const apple = [
        alertSpec({ index: 1, description: "暴雪", severity: 3 }),
        alertSpec({ index: 2, description: "道路结冰", severity: 3 }),
    ];
    const events = [
        { description: "道路结冰黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
        { description: "分区暴雪黄色预警信号", issueText: "2026-11-07 10:00", color: "yellow" },
    ];
    const original = withWeatherAlerts(apple);
    const opaqueBefore = new Map([14, 17].map(slot => [slot, tableFingerprint(original, slot)]));
    const response = await invokeResponse(original, { qweatherEvents: events, logLevel: "DEBUG" });
    const diag = response.headers["X-WK3-Alerts-Diag"];
    assert.match(diag, /link=native_api;e0=matched:r2t1s1p1c1;e1=matched:r2t1s1p1c1;result=rewritten/);
    const alertLog = response.logs.join("\n");
    assert.match(alertLog, /QWeather q1 eventName="分区暴雪黄色预警信号" eventNameNormalized="分区暴雪"/);
    assert.match(alertLog, /matchNormalized="分区暴雪" matchedType="暴雪" alias=partitioned_snow_to_snow/);
    assert.match(alertLog, /compare e0\/q1 equal=true alias=partitioned_snow_to_snow/);
    assert.doesNotMatch(alertLog, /https?:\/\/|31\.25|121\.5|token|wk3_[A-Za-z0-9_-]+/i);

    const bytes = response.body;
    assert.deepEqual(aqSnapshot(bytes), { scale: "EPA_NowCast.2604", index: 67, categoryIndex: 2, comparison: 2 });
    assert.equal(decodeWK3NextHour(bytes).minutes.length, 85);
    const patchedAlerts = decodeWK3Alerts(bytes);
    assert.deepEqual(patchedAlerts.alerts.map(alert => alert.id), apple.map(alert => ({ bytes: Array.from(alert.id.replaceAll("-", "").match(/../g), byte => Number.parseInt(byte, 16)) })));
    for (const slot of [14, 17]) assert.deepEqual(tableFingerprint(bytes, slot), opaqueBefore.get(slot));

    const ids = new URL(patchedAlerts.detailsUrl).searchParams.get("ids");
    for (const version of ["v1", "v2"]) {
        const route = `https://weatherkit.apple.com/api/${version}/weatherAlerts?lang=zh-CN&ids=${encodeURIComponent(ids)}`;
        const { result, externalCalls } = await invokeDetailsRequest(route);
        assert.equal(result.response.headers["X-WK3-Alerts-Diag"], `WK3WD/2;route=${version};result=details_served`);
        assert.deepEqual(JSON.parse(result.response.body).map(alert => alert.id), apple.map(alert => alert.id));
        assert.equal(externalCalls, 0);
    }
});

test("actual WK3 v1/v2 detail API routes return the pre-matched Apple event ID without a second provider request", async () => {
    const response = await invokeResponse(withWeatherAlerts([alertSpec()]));
    const link = decodeWK3Alerts(response.body).detailsUrl;
    const query = new URL(link).searchParams;
    for (const version of ["v1", "v2"]) {
        const route = `https://weatherkit.apple.com/api/${version}/weatherAlerts?lang=${encodeURIComponent(query.get("lang"))}&ids=${encodeURIComponent(query.get("ids"))}`;
        const { result, externalCalls, logs } = await invokeDetailsRequest(route);
        assert.deepEqual(Object.keys(result), ["response"], "Surge request script uses its established {response} return shape");
        assert.equal(result.response.status, 200);
        assert.equal(result.response.headers["X-WK3-Alerts-Diag"], `WK3WD/2;route=${version};result=details_served`);
        const details = JSON.parse(result.response.body);
        assert.equal(details.length, 1);
        assert.equal(details[0].id, alertSpec().id);
        assert.equal(details[0].detailsUrl, `#${alertSpec().id}`);
        assert.equal(Date.parse(details[0].issuedTime) / 1000, issueSeconds);
        assert.equal(externalCalls, 0, "QWeather data was captured only after the source match and is served locally");
        assert.deepEqual(logs, [], "request handling must not log URLs or detail IDs even if LogLevel is DEBUG");
    }
});

test("provider outage keeps Apple alert links while AQI and minute rain still complete", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const before = decodeWK3Alerts(original);
    const result = await invokeResponse(original, { qweatherStatus: 503 });
    assert.match(result.headers["X-WK3-Alerts-Diag"], /result=source_unavailable/);
    assert.deepEqual(decodeWK3Alerts(result.body).alerts[0].id, before.alerts[0].id);
    assert.equal(decodeWK3Alerts(result.body).alerts[0].detailsUrl, before.alerts[0].detailsUrl);
    assert.deepEqual(aqSnapshot(result.body), { scale: "EPA_NowCast.2604", index: 67, categoryIndex: 2, comparison: 2 });
    assert.equal(decodeWK3NextHour(result.body).minutes.length, 85);
    assert.ok(result.requests.some(url => url.includes("/minutely")));
});

test("the independent WeatherAlerts.Provider switch leaves AQI/minute rain enabled and makes no QWeather request", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const before = decodeWK3Alerts(original);
    const result = await invokeResponse(original, { alertProvider: "WeatherKit" });
    assert.match(result.headers["X-WK3-Alerts-Diag"], /provider=other;region=mainland;events=0;src=0;parse=na;link=original;result=provider_off/);
    assert.deepEqual(decodeWK3Alerts(result.body).alerts[0].id, before.alerts[0].id);
    assert.equal(decodeWK3Alerts(result.body).alerts[0].detailsUrl, before.alerts[0].detailsUrl);
    assert.deepEqual(aqSnapshot(result.body), { scale: "EPA_NowCast.2604", index: 67, categoryIndex: 2, comparison: 2 });
    assert.equal(decodeWK3NextHour(result.body).minutes.length, 85);
    assert.equal(result.requests.some(url => url.includes("www.qweather.com")), false);
});
