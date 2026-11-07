import assert from "node:assert/strict";
import test from "node:test";
import { buildWK3Raw2SeverityEvidence } from "../src/class/WK3Alerts.mjs";
import { compareAlertSeverity, verifiedAppleWK3Severity } from "../src/class/WeatherAlertTypeRegistry.mjs";

const issue = "2026-11-07T08:09:00.000Z";

test("raw2 diagnostic identifies the candidate pairing without assigning Severe", () => {
    const data = {
        apple: [
            { index: 0, rawDescription: "暴雪橙色预警", normalized: "暴雪", typeId: "cn.snowstorm", rawSeverity: 2, issuedTime: issue },
            { index: 1, normalized: "道路结冰", typeId: "cn.road_icing", rawSeverity: 3, issuedTime: issue },
        ],
        qweather: [
            { index: 0, rawEventName: "暴雪橙色预警信号", rawDescription: "暴雪橙色预警详情", normalizedMatchType: "暴雪", typeId: "cn.snowstorm", qweatherSeverity: "unknown", governmentColor: "orange", issuedTime: issue, lifecycle: "active" },
        ],
        comparisons: [
            { appleIndex: 0, qweatherIndex: 0, region: true, type: true, severity: false, issueTime: true, uniqueCandidate: false, matched: false },
        ],
    };

    const evidence = buildWK3Raw2SeverityEvidence(data);
    assert.equal(evidence.length, 1, "only raw2 is included");
    assert.deepEqual(evidence[0], {
        appleIndex: 0,
        appleRawDescription: "暴雪橙色预警",
        appleType: "暴雪",
        appleTypeId: "cn.snowstorm",
        appleRawSeverity: 2,
        appleIssuedTime: issue,
        appleJsonSeverityEvidence: "not_captured",
        identityCandidateCount: 1,
        identityUnique: true,
        candidates: [{
            qIndex: 0,
            qRawEventName: "暴雪橙色预警信号",
            qRawDescription: "暴雪橙色预警详情",
            qType: "暴雪",
            qTypeId: "cn.snowstorm",
            qWeatherSeverity: "unknown",
            governmentColor: "orange",
            qIssuedTime: issue,
            regionMatch: true,
            typeMatch: true,
            severityMatch: false,
            issueTimeMatch: true,
            uniqueAfterSeverity: false,
            lifecycle: "active",
            matched: false,
        }],
    });
    assert.equal(verifiedAppleWK3Severity(2), null);
    assert.deepEqual(compareAlertSeverity(2, {
        alertTypeId: "cn.snowstorm", governmentColor: "orange", qweatherSeverity: "unknown",
    }), { ok: false, status: "severity_unverified", appleSeverity: null });
});

test("raw2 diagnostic remains bounded and excludes identity, URL, coordinates and location fields", () => {
    const evidence = buildWK3Raw2SeverityEvidence({
        apple: [{ index: 0, rawDescription: `\u0000${"暴雪".repeat(80)}`, normalized: `\u0000${"暴雪".repeat(80)}`, typeId: "cn.snowstorm", rawSeverity: 2, issuedTime: issue }],
        qweather: [{ index: 0, rawEventName: `暴雪${"橙色预警".repeat(20)}`, normalizedMatchType: "暴雪", typeId: "cn.snowstorm", qweatherSeverity: "severe", governmentColor: "orange", issuedTime: issue, lifecycle: "update" }],
        comparisons: [{ appleIndex: 0, qweatherIndex: 0, region: true, type: true, severity: false, issueTime: true, uniqueCandidate: true, matched: false }],
    });
    assert.ok(evidence[0].appleType.length <= 64);
    assert.ok(evidence[0].appleRawDescription.length <= 64);
    assert.ok(evidence[0].candidates[0].qRawEventName.length <= 64);
    const serialized = JSON.stringify(evidence);
    assert.doesNotMatch(serialized, /(?:"(?:eventId|alertId|id|detailsUrl|url|coordinates|latitude|longitude|token|areaId|regionIdentifier)"\s*:)/i);
    assert.doesNotMatch(serialized, /https?:\/\//i);
});

test("malformed diagnostics yield no raw2 evidence and do not widen the crosswalk", () => {
    assert.deepEqual(buildWK3Raw2SeverityEvidence(null), []);
    assert.deepEqual(buildWK3Raw2SeverityEvidence({ apple: [], qweather: [], comparisons: [] }), []);
    assert.equal(verifiedAppleWK3Severity(1), null);
    assert.equal(verifiedAppleWK3Severity(5), null);
});
