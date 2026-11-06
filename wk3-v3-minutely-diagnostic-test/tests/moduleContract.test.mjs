import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moduleText = readFileSync(new URL("../MinFix-US-AQI-Next-Hour-Diagnostic-Test.sgmodule", import.meta.url), "utf8");

test("Surge module pins both scripts to one immutable diagnostic asset commit", () => {
    const scriptPaths = [...moduleText.matchAll(/script-path=(https:\/\/[^,\s]+)/g)].map(match => match[1]);
    assert.equal(scriptPaths.length, 2);
    const commitIds = scriptPaths.map(path => path.match(/\/([0-9a-f]{40})\/wk3-v3-minutely-diagnostic-test\//)?.[1]);
    assert.ok(commitIds.every(Boolean));
    assert.equal(new Set(commitIds).size, 1);
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
    assert.match(moduleText, /X-WK3-NextHour-Diag/);
    assert.doesNotMatch(moduleText, /weatherAlerts/);
});

test("diagnostic response exposes only short non-location state codes", () => {
    const response = readFileSync(new URL("../response.dev.bundle.js", import.meta.url), "utf8");
    assert.match(response, /X-WK3-NextHour-Diag/);
    assert.match(response, /root_slot_missing/);
    assert.match(response, /native_child_decode_failed/);
    assert.match(response, /provider_request_failed/);
    assert.match(response, /provider_data_rejected/);
    assert.match(response, /result=\$\{d\.result\}/);
    assert.doesNotMatch(response, /response\.headers\["X-WK3-NextHour-Diag"\].*(latitude|longitude|token)/i);
});
