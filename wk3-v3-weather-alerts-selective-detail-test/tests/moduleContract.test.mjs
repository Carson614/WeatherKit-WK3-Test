import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const moduleText = readFileSync(new URL("WK3-Weather-Alerts-Selective-Detail-Test.sgmodule", root), "utf8");
const report = JSON.parse(readFileSync(new URL("build-report.json", root), "utf8"));
const request = readFileSync(new URL("request.dev.bundle.js", root), "utf8");
const response = readFileSync(new URL("response.dev.bundle.js", root), "utf8");
const registry = readFileSync(new URL("src/class/WeatherAlertTypeRegistry.mjs", root), "utf8");
const requestHash = createHash("sha256").update(request).digest("hex");
const responseHash = createHash("sha256").update(response).digest("hex");

test("module pins all script paths to one immutable asset revision and local bundle hashes", () => {
    const paths = [...moduleText.matchAll(/script-path=(https:\/\/raw\.githubusercontent\.com\/Carson614\/WeatherKit-WK3-Test\/([A-Za-z0-9_]{10,40})\/wk3-v3-weather-alerts-selective-detail-test\/(request|response)\.dev\.bundle\.js)/g)];
    assert.equal(paths.length, 3);
    assert.ok(paths.every(path => path[2] === report.scriptPathsAssetCommit));
    assert.match(report.scriptPathsAssetCommit, /^(?:ASSET_COMMIT|[a-f0-9]{40})$/);
    assert.deepEqual(paths.map(path => path[3]).sort(), ["request", "request", "response"]);
    assert.equal(requestHash, report.requestBundleSha256);
    assert.equal(responseHash, report.responseBundleSha256);
    assert.doesNotMatch(moduleText, /7408646ebfdb889a448c0bbf8c9ddf0ee4b6dae1/);
});

test("module retains accepted AQI/minute-rain configuration and independent switches", () => {
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

test("Surge request/response routes and details API remain coordinated", () => {
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
    assert.match(response, /WK3WA\/3;gate=/);
    assert.match(response, /severity_crosswalk_unverified/);
    assert.match(response, /source_cancelled/);
    assert.match(response, /source_updated/);
});

test("registry and diagnostics keep event type, government color, QWeather severity and WK3 enum separate", () => {
    assert.match(registry, /NATIONAL_WARNING_TYPES/);
    assert.match(registry, /LOCAL_WARNING_TYPES/);
    assert.match(registry, /VERIFIED_ALERT_TYPE_ALIASES/);
    assert.match(registry, /APPLE_WK3_SEVERITY/);
    assert.match(registry, /GOVERNMENT_WARNING_COLORS/);
    assert.match(response, /severityRaw=/);
    assert.match(response, /governmentColor=/);
    assert.match(response, /eventCode=/);
    assert.match(response, /issueTime=/);
    assert.match(response, /matched=/);
    assert.doesNotMatch(registry, /replace\([^\n]*分区/u);
});

test("bundles inherit the true-device AQI/minute baseline and never log request locator data", () => {
    assert.equal(report.trueDeviceBaselineCommit, "34475524c06ca7d5c6d17da18612548cd8b0b2e6");
    assert.equal(report.snowAliasBaseCommit, "b9ccf4dec00d215d6e8e208c93c725ba571defb5");
    assert.equal(report.validation.iPhoneAlertAcceptance, false);
    assert.equal(report.validation.wanshanRawEnumProvided, false);
    assert.match(response, /WK3NH\/3/);
    assert.match(response, /Console\.logLevel = "OFF";/);
    assert.match(request, /Console\.logLevel = "OFF";/);
    assert.doesNotMatch(response, /Console\.info\([^\n]*JSON\.stringify\(.*(?:description|weatherAlerts)/);
    assert.match(request, /if \(__wk3NativeAlertRequest\) Console\.debug\("\[WK3\] native alert details route"\)/);
    assert.doesNotMatch(request, /Console\.info\([^\n]*__alertIDs/);
});

test("the selective experiment changes only partial per-alert URLs and keeps the shared-link contract explicit", () => {
    assert.match(moduleText, /Selective Detail Test/);
    assert.match(moduleText, /per-alert|per event/i);
    assert.match(response, /allowPartialDetails: true/);
    assert.match(response, /per_event_native/);
    assert.match(response, /partial_rewritten/);
    assert.match(report.feature.detailsLinkModel, /collection slot 1.*summary slot 12/i);
    assert.equal(report.validation.selectiveDetailsReplay, true);
    assert.equal(report.validation.iPhoneSelectiveDetailsAcceptance, false);
});
