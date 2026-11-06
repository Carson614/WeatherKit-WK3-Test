import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moduleText = readFileSync(new URL("../MinFix-US-AQI-Next-Hour-Test.sgmodule", import.meta.url), "utf8");
const assetCommit = "93d1fa481bbc7dbb0f4c3ded7447727c9b816362";

test("Surge module pins both scripts to the tested immutable asset commit", () => {
    const scriptPaths = [...moduleText.matchAll(/script-path=(https:\/\/[^,\s]+)/g)].map(match => match[1]);
    assert.equal(scriptPaths.length, 2);
    assert.ok(scriptPaths.every(path => path.includes(`/${assetCommit}/wk3-v3-minutely-test/`)));
    assert.ok(scriptPaths.some(path => path.endsWith("/request.dev.bundle.js")));
    assert.ok(scriptPaths.some(path => path.endsWith("/response.dev.bundle.js")));
});

test("binary WK3 response rule and independent feature setting are present", () => {
    const responseRule = moduleText.split("\n").find(line => line.includes("type=http-response"));
    assert.ok(responseRule);
    assert.ok(responseRule.includes("weatherkit\\.apple\\.com\\/api\\/v3\\/weather\\/"));
    assert.match(moduleText, /requires-body=1, binary-body-mode=1/);
    assert.match(moduleText, /NextHour\.Provider:"ColorfulClouds"/);
    assert.match(moduleText, /DataSets:"airQuality,forecastNextHour"/);
    assert.match(moduleText, /AirQuality\.Current\.Pollutants\.Units\.Replace:""/);
    assert.match(moduleText, /Storage:"Argument"/);
    assert.doesNotMatch(moduleText, /weatherAlerts/);
});
