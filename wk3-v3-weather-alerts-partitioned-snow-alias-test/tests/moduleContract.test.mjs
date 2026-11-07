import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const moduleText = readFileSync(new URL("WK3-Weather-Alerts-Snow-Alias-Test.sgmodule", root), "utf8");
const report = JSON.parse(readFileSync(new URL("build-report.json", root), "utf8"));
const request = readFileSync(new URL("request.dev.bundle.js", root), "utf8");
const response = readFileSync(new URL("response.dev.bundle.js", root), "utf8");
const requestHash = createHash("sha256").update(request).digest("hex");
const responseHash = createHash("sha256").update(response).digest("hex");

test("module keeps fixed SHA script links on a single immutable asset commit", () => {
    const paths = [...moduleText.matchAll(/script-path=(https:\/\/raw\.githubusercontent\.com\/Carson614\/WeatherKit-WK3-Test\/([0-9a-f]{40})\/wk3-v3-weather-alerts-partitioned-snow-alias-test\/(request|response)\.dev\.bundle\.js)/g)];
    assert.equal(paths.length, 3);
    assert.ok(paths.every(path => path[2] === report.scriptPathsAssetCommit));
    assert.deepEqual(paths.map(path => path[3]).sort(), ["request", "request", "response"]);
    assert.equal(requestHash, report.requestBundleSha256);
    assert.equal(responseHash, report.responseBundleSha256);
    assert.doesNotMatch(moduleText, /ASSET_COMMIT/);
});

test("module exposes independent alert and minute-rain switches while retaining accepted AQI arguments", () => {
    assert.match(moduleText, /DataSets:"airQuality,forecastNextHour,weatherAlerts"/);
    assert.match(moduleText, /WeatherAlerts\.Provider:"QWeatherWeb"/);
    assert.match(moduleText, /NextHour\.Provider:"ColorfulClouds"/);
    assert.match(moduleText, /AirQuality\.Current\.Index\.Provider:"ColorfulCloudsUS"/);
    assert.match(moduleText, /AirQuality\.Comparison\.Yesterday\.IndexProvider:"ColorfulCloudsUS"/);
    assert.match(moduleText, /AirQuality\.Comparison\.ReplaceWhenCurrentChange:true/);
    assert.match(moduleText, /EPA_NowCast/);
    assert.match(moduleText, /WeatherAlerts\.Provider=WeatherKit to disable alert matching/);
    assert.match(moduleText, /NextHour\.Provider=WeatherKit to disable minute rain/);
});

test("Surge rules match the v3 weather response and the actual v1/v2 WK3 alert details API URL", () => {
    assert.ok(moduleText.includes(String.raw`pattern=^https?:\/\/weatherkit\.apple\.com\/api\/v3\/weather\/, requires-body=1, binary-body-mode=1`));
    const alertRule = moduleText.split("\n").find(line => line.startsWith("WeatherKit WK3 Native Alert Details request ="));
    assert.ok(alertRule?.includes(String.raw`ids=wk3_[A-Za-z0-9_-]+`));
    const pattern = alertRule.match(/pattern=(.*?), engine=webview/)[1];
    const actualDetailURL = "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=wk3_eyJyZWdpb24iOiJqaWFuZ3N1LTEwMTE5MDQwNCJ9&party=qweather";
    assert.match(actualDetailURL, new RegExp(pattern));
    assert.ok(moduleText.includes("www.qweather.com"));
    assert.match(request, /\/api\/v2\/weatherAlerts/);
    assert.match(request, /isNativeAlertDetailsID/);
    assert.match(response, /X-WK3-Alerts-Diag/);
    assert.match(request, /WK3WD\/2;route=/);
    assert.match(response, /WK3WA\/2;gate=/);
    assert.match(response, /type_no_match/);
    assert.match(response, /issue_time_no_match/);
    assert.match(response, /native_api/);
    assert.match(response, /normalized === "分区暴雪" \? "暴雪" : normalized/);
    assert.match(response, /partitioned_snow_to_snow/);
    assert.doesNotMatch(response, /replace\([^\n]*分区/);
});

test("bundles pin the verified true-device baseline, exact snow alias, and never log raw alert locators", () => {
    assert.equal(report.trueDeviceBaselineCommit, "34475524c06ca7d5c6d17da18612548cd8b0b2e6");
    assert.equal(report.validation.iPhoneAlertAcceptance, false);
    assert.equal(report.baseResponseSha256, "3306e2fa3898e302333cb695fd51f21578cef47c29b1af73f220f8c168bbf7a8");
    assert.match(response, /WK3NH\/3/);
    assert.match(response, /Console\.logLevel = "OFF";/);
    assert.match(request, /Console\.logLevel = "OFF";/);
    assert.match(response, /\[WK3WA type\] compare/);
    assert.doesNotMatch(response, /Console\.info\([^\n]*JSON\.stringify\(.*(?:description|weatherAlerts)/);
    assert.match(request, /if \(__wk3NativeAlertRequest\) Console\.debug\("\[WK3\] native alert details route"\)/);
    assert.doesNotMatch(request, /Console\.info\([^\n]*__alertIDs/);
});
