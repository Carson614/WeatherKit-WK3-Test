import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const moduleUrl = new URL("WK3-Next-Hour-Root-Rebuild-Test.sgmodule", root);
const moduleExists = existsSync(moduleUrl);
const moduleText = moduleExists ? readFileSync(moduleUrl, "utf8") : "";
const source = readFileSync(new URL("src/function/wk3NextHourFlatBuffer.mjs", root), "utf8");
const request = readFileSync(new URL("request.dev.bundle.js", root), "utf8");
const response = readFileSync(new URL("response.dev.bundle.js", root), "utf8");

const fixedRequestPattern = String.raw`pattern=^https?:\/\/weatherkit\.apple\.com\/api\/v1\/airQualityScale\/`;
const fixedResponsePattern = String.raw`pattern=^https?:\/\/weatherkit\.apple\.com\/api\/v3\/weather\/, requires-body=1, binary-body-mode=1`;

const modulePathTest = () => {
    const scriptPaths = [...moduleText.matchAll(/script-path=(https:\/\/raw\.githubusercontent\.com\/Carson614\/WeatherKit-WK3-Test\/([0-9a-f]{40})\/wk3-v3-next-hour-root-rebuild-test\/(request|response)\.dev\.bundle\.js)/g)];
    assert.equal(scriptPaths.length, 2);
    assert.equal(scriptPaths[0][2], scriptPaths[1][2]);
    assert.deepEqual(scriptPaths.map(match => match[3]).sort(), ["request", "response"]);
    assert.equal(createHash("sha256").update(request).digest("hex"), "be8032a6764793e8daf1af5c2e3bef8581c0f017b879cf926f7f941495f3b83d");
    assert.ok(moduleText.includes(fixedResponsePattern));
    assert.ok(moduleText.includes(fixedRequestPattern));
};

const moduleArgumentsTest = () => {
    assert.match(moduleText, /NextHour\.Provider:"ColorfulClouds"/);
    assert.match(moduleText, /AirQuality\.Current\.Index\.Provider:"ColorfulCloudsUS"/);
    assert.match(moduleText, /AirQuality\.Comparison\.Yesterday\.IndexProvider:"ColorfulCloudsUS"/);
    assert.match(moduleText, /AirQuality\.Comparison\.ReplaceWhenCurrentChange:true/);
    assert.match(moduleText, /AirQuality\.Current\.Index\.Replace:"HJ6332012,EU\.EAQI,CN_AQHI,EPA_NowCast"/);
    assert.match(moduleText, /API\.ColorfulClouds\.Token:""/);
    assert.match(moduleText, /LogLevel:"OFF"/);
    assert.doesNotMatch(moduleText, /weatherAlerts|QWeatherWeb/i);
    assert.match(moduleText, /Set NextHour\.Provider to WeatherKit to disable minute-forecast injection/);
};

if (moduleExists) {
    test("installable module pins both local scripts to one immutable GitHub commit", modulePathTest);
    test("module keeps the accepted AQI baseline and exposes a separate minute-rain switch", moduleArgumentsTest);
} else {
    test.skip("installable module pins both local scripts to one immutable GitHub commit", () => {});
    test.skip("module keeps the accepted AQI baseline and exposes a separate minute-rain switch", () => {});
}

test("diagnostics identify root slot and result without sensitive payload logs", () => {
    for (const status of ["vtable_entry_absent", "slot_offset_zero", "native_child_present", "source_called", "injected", "root_rebuild_"]) {
        assert.ok(response.includes(status), `bundle includes diagnostic state ${status}`);
    }
    assert.match(response, /X-WK3-NextHour-Diag/);
    assert.match(response, /WK3NH\/2/);
    assert.doesNotMatch(response, /url: \$\{url\.toJSON\(\)\}/);
    assert.doesNotMatch(response, /Settings: \$\{JSON\.stringify\(Settings/);
    assert.doesNotMatch(response, /latitude: \$\{result\.latitude\}|longitude: \$\{result\.longitude\}/);
    assert.doesNotMatch(response, /body\.forecastNextHour: \$\{JSON\.stringify/);
    assert.doesNotMatch(response, /Console\.error\(e\)/);
    assert.match(source, /inspectRootForRebuild/);
    assert.match(source, /return unchanged\(`root_rebuild_\$\{source\.status\}`\)/);
    assert.ok(request.length > 0);
});

test("root reconstruction validates existing targets and tests rollback plus repeated processing", () => {
    assert.match(source, /root_target_not_table/);
    assert.match(source, /rebuildRootWithNextHour/);
    assert.match(source, /return unchanged\("merge_rejected", true\)/);
    const replay = readFileSync(new URL("tests/nextHourBundleReplay.test.mjs", root), "utf8");
    assert.match(replay, /illegal unknown root pointer fails open/);
    assert.match(replay, /reprocessing an injected response/);
    assert.match(replay, /unknown nextHour child makes the complete response fail open/);
});
