import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";
import { decodeWK3Alerts } from "../src/class/WK3Alerts.mjs";
import { decodeWK3NextHour } from "../src/class/WK3NextHour.mjs";
import { alertSpec, issueSeconds, qweatherHTML, tableFingerprint, withWeatherAlerts } from "./helpers/weatherAlertsFixture.mjs";

const responseUrl = new URL("../response.dev.bundle.js", import.meta.url);
const requestUrl = new URL("../request.dev.bundle.js", import.meta.url);
const qweatherPage = qweatherHTML([{ description: "雷电黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "请注意防范雷电。" }]);

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

async function invokeResponse(body, { alertProvider = "QWeatherWeb", qweatherStatus = 200 } = {}) {
    globalThis.$environment = { "surge-version": "test" };
    globalThis.$script = { startTime: Date.now() / 1000 };
    globalThis.$request = { method: "GET", headers: {}, url: "https://weatherkit.apple.com/api/v3/weather/zh-Hans-US/31.25/121.5?timezone=Asia%2FShanghai&country=CN&dataSets=airQuality%2CforecastNextHour%2CweatherAlerts" };
    globalThis.$response = { status: 200, headers: {
        "Content-Type": "application/vnd.apple.flatbuffer;messageType=WK3.Weather", "Content-Length": String(body.length),
    }, bodyBytes: body };
    globalThis.$argument = {
        Storage: "Argument", LogLevel: "OFF", DataSets: ["airQuality", "forecastNextHour", "weatherAlerts"],
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
        if (url.includes("www.qweather.com")) return callback(null, { status: qweatherStatus, headers: { "content-type": "text/html; charset=utf-8" } }, qweatherPage);
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
    const result = await new Promise((resolve, reject) => {
        const log = console.log; console.log = () => {};
        globalThis.$done = value => { console.log = log; resolve(value); };
        import(`${responseUrl.href}?replay=${Math.random()}`).catch(error => { console.log = log; reject(error); });
    });
    assert.ok(result.body instanceof Uint8Array, "binary-body-mode response remains a Uint8Array");
    return { ...result, requests };
}

async function invokeDetailsRequest(url) {
    globalThis.$environment = { "surge-version": "test" };
    globalThis.$script = { startTime: Date.now() / 1000 };
    globalThis.$request = { method: "GET", headers: {}, url };
    globalThis.$argument = { Storage: "Argument", LogLevel: "OFF", DataSets: ["airQuality", "forecastNextHour", "weatherAlerts"], WeatherAlerts: { Provider: "QWeatherWeb" } };
    globalThis.$persistentStore = { read: () => null, write: () => true };
    let externalCalls = 0;
    globalThis.$httpClient = { get(_request, callback) { externalCalls++; callback(new Error("unexpected network call")); } };
    const result = await new Promise((resolve, reject) => {
        const log = console.log; console.log = () => {};
        globalThis.$done = value => { console.log = log; resolve(value); };
        import(`${requestUrl.href}?replay=${Math.random()}`).catch(error => { console.log = log; reject(error); });
    });
    return { result, externalCalls };
}

test("combined response replay preserves accepted AQI/minute rain while adding matching QWeather details", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const opaqueBefore = new Map([14, 17].map(slot => [slot, tableFingerprint(original, slot)]));
    const result = await invokeResponse(original);
    const alertsDiag = result.headers["X-WK3-Alerts-Diag"];
    assert.match(alertsDiag, /WK3WA\/1;gate=1\/1;provider=qweatherweb;region=mainland;events=1;result=rewritten/);
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

test("actual WK3 v1/v2 detail API routes return the pre-matched Apple event ID without a second provider request", async () => {
    const response = await invokeResponse(withWeatherAlerts([alertSpec()]));
    const link = decodeWK3Alerts(response.body).detailsUrl;
    const query = new URL(link).searchParams;
    for (const version of ["v1", "v2"]) {
        const route = `https://weatherkit.apple.com/api/${version}/weatherAlerts?lang=${encodeURIComponent(query.get("lang"))}&ids=${encodeURIComponent(query.get("ids"))}`;
        const { result, externalCalls } = await invokeDetailsRequest(route);
        assert.deepEqual(Object.keys(result), ["response"], "Surge request script uses its established {response} return shape");
        assert.equal(result.response.status, 200);
        assert.equal(result.response.headers["X-WK3-Alerts-Diag"], "WK3WD/1;result=details_served");
        const details = JSON.parse(result.response.body);
        assert.equal(details.length, 1);
        assert.equal(details[0].id, alertSpec().id);
        assert.equal(details[0].detailsUrl, `#${alertSpec().id}`);
        assert.equal(Date.parse(details[0].issuedTime) / 1000, issueSeconds);
        assert.equal(externalCalls, 0, "QWeather data was captured only after the source match and is served locally");
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
    assert.match(result.headers["X-WK3-Alerts-Diag"], /provider=other;region=mainland;events=0;result=provider_off/);
    assert.deepEqual(decodeWK3Alerts(result.body).alerts[0].id, before.alerts[0].id);
    assert.equal(decodeWK3Alerts(result.body).alerts[0].detailsUrl, before.alerts[0].detailsUrl);
    assert.deepEqual(aqSnapshot(result.body), { scale: "EPA_NowCast.2604", index: 67, categoryIndex: 2, comparison: 2 });
    assert.equal(decodeWK3NextHour(result.body).minutes.length, 85);
    assert.equal(result.requests.some(url => url.includes("www.qweather.com")), false);
});
