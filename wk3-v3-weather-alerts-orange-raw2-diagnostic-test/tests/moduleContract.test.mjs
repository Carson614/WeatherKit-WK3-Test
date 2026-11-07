import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const moduleText = readFileSync(new URL("WK3-Weather-Alerts-Orange-Raw2-Diagnostic-Test.sgmodule", root), "utf8");
const report = JSON.parse(readFileSync(new URL("build-report.json", root), "utf8"));
const request = readFileSync(new URL("request.dev.bundle.js", root), "utf8");
const response = readFileSync(new URL("response.dev.bundle.js", root), "utf8");
const registry = readFileSync(new URL("src/class/WeatherAlertTypeRegistry.mjs", root), "utf8");
const requestHash = createHash("sha256").update(request).digest("hex");
const responseHash = createHash("sha256").update(response).digest("hex");
const moduleHash = createHash("sha256").update(moduleText).digest("hex");

test("module pins scripts to the same immutable asset revision and recorded hashes", () => {
    const paths = [...moduleText.matchAll(/script-path=(https:\/\/raw\.githubusercontent\.com\/Carson614\/WeatherKit-WK3-Test\/([A-Za-z0-9_]{10,40})\/wk3-v3-weather-alerts-orange-raw2-diagnostic-test\/(request|response)\.dev\.bundle\.js)/g)];
    assert.equal(paths.length, 3);
    assert.ok(paths.every(path => path[2] === report.scriptPathsAssetCommit));
    assert.match(report.scriptPathsAssetCommit, /^(?:ASSET_COMMIT|[a-f0-9]{40})$/);
    assert.deepEqual(paths.map(path => path[3]).sort(), ["request", "request", "response"]);
    assert.equal(requestHash, report.requestBundleSha256);
    assert.equal(responseHash, report.responseBundleSha256);
    assert.equal(moduleHash, report.moduleSha256);
});

test("module keeps accepted AQI/minute rain settings and independent feature switches", () => {
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

test("Surge rules coordinate binary response and v1/v2 native alert routes", () => {
    assert.match(moduleText, /binary-body-mode=1/);
    const alertRule = moduleText.split("\n").find(line => line.startsWith("WeatherKit WK3 Native Alert Details request ="));
    assert.ok(alertRule?.includes("ids=wk3_"));
    const pattern = alertRule.match(/pattern=(.*?), engine=webview/)[1];
    const actualDetailURL = "https://weatherkit.apple.com/api/v1/weatherAlerts?lang=zh-CN&ids=wk3_eyJyZWdpb24iOiJqaWFuZ3N1LTEwMTE5MDQwNCJ9&party=qweather";
    assert.match(actualDetailURL, new RegExp(pattern));
    assert.match(request, /\/api\/v2\/weatherAlerts/);
    assert.match(request, /isNativeAlertDetailsID/);
    assert.match(response, /X-WK3-Alerts-Diag/);
    assert.match(request, /WK3WD\/2;route=/);
});

test("registry separates hazard type, government color, API severity, and WK3 raw enum", () => {
    assert.match(registry, /NATIONAL_WARNING_TYPES/);
    assert.match(registry, /NATIONAL_WARNING_GOVERNMENT_LEVELS/);
    assert.match(registry, /VERIFIED_ALERT_TYPE_ALIASES/);
    assert.match(registry, /APPLE_WK3_SEVERITY/);
    assert.match(registry, /GOVERNMENT_WARNING_COLORS/);
    assert.match(registry, /WK3_HTML_COLOR_EVIDENCE/);
    assert.match(response, /severityRaw=/);
    assert.match(response, /governmentColor=/);
    assert.match(response, /eventCode=/);
    assert.match(response, /issueTime=/);
    assert.match(response, /severity_evidence_conflict/);
    assert.match(response, /WK3WA raw2-evidence/);
    assert.match(response, /appleJsonSeverityEvidence/);
    assert.match(response, /appleRawDescription/);
    assert.match(response, /qRawEventName/);
    assert.match(response, /identityCandidateCount/);
    assert.match(response, /counts\.issued/);
    assert.doesNotMatch(response, /source_updated/);
    assert.match(response, /source_update_newer_candidate/);
    assert.doesNotMatch(registry, /replace\([^\n]*分区/u);
});

test("diagnostics expose bounded enums and counts, not event values or request locators", () => {
    assert.match(response, /slice\(0, 40\)/);
    assert.match(response, /Console\.logLevel = "OFF"/);
    assert.match(request, /Console\.logLevel = "OFF"/);
    assert.doesNotMatch(request, /Console\.info\([^\n]*__alertIDs/);
    assert.equal(report.validation.iPhoneAlertAcceptance, false);
});

test("accepted AQI, minute-rain and opaque-root replay evidence remains part of this build", () => {
    assert.equal(report.trueDeviceBaselineCommit, "34475524c06ca7d5c6d17da18612548cd8b0b2e6");
    assert.equal(report.validation.aqScaleIndexCategoryYesterdayRegression, true);
    assert.equal(report.validation.minuteRainRegression, true);
    assert.equal(report.validation.wk3UnknownRootFields, true);
    assert.equal(report.validation.fullRollupSourceBuild, false);
    assert.match(report.validation.fullBuildNote, /401/);
    assert.deepEqual(report.severityEvidence.capByGovernmentColor, { blue: "minor", yellow: "moderate", orange: "severe", red: "extreme" });
    assert.deepEqual(report.severityEvidence.observedWK3RawValues, { 3: "moderate", 4: "minor" });
    assert.deepEqual(report.severityEvidence.enabledHTMLColors, ["blue", "yellow"]);
    assert.deepEqual(report.severityEvidence.failClosedColors, ["orange", "red"]);
    assert.equal(report.severityEvidence.raw2, "unverified; no WK3 schema/source mapping and no captured Apple JSON counterpart");
    assert.match(report.severityEvidence.orangeEvidence, /not a semantic raw2=Severe proof/);
    assert.equal(report.validation.updateCurrentExactVersion, true);
    assert.equal(report.validation.updateSupersededStaleRejected, true);
    assert.equal(report.validation.updateLifecycleEvidenceLimit, "HTML omits structured message id and supersedes chain");
    assert.equal(report.sampleCollection.livePublicCrawlCompleted, false);
    assert.equal(report.sampleCollection.publicPageAccess.includes("403"), true);
});
