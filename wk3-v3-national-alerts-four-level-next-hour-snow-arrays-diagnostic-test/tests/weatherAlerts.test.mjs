import assert from "node:assert/strict";
import test from "node:test";
import { ByteBuffer } from "flatbuffers";
import { buildNativeAlertDetailsURL, resolveNativeAlertDetails } from "../src/class/NativeAlertDetails.mjs";
import { decodeWK3Alerts, patchWK3QWeatherAlertsDiagnostic } from "../src/class/WK3Alerts.mjs";
import WeatherAlerts from "../src/class/WeatherAlerts.mjs";
import { alertSpec, baseFixture, issueSeconds, qweatherFetch, qweatherHTML, region, regionCode, sourceIssueTime, tableFingerprint, withWeatherAlerts } from "./helpers/weatherAlertsFixture.mjs";
import { NATIONAL_WARNING_GOVERNMENT_LEVELS, NATIONAL_WARNING_TYPES, WK3_HTML_COLOR_EVIDENCE } from "../src/class/WeatherAlertTypeRegistry.mjs";

const exactEvent = { description: "寒潮黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "请注意防范寒潮。" };

async function patch(bytes, fetchOptions = {}) {
    const { experimentalRaw1Enabled = false, ...sourceOptions } = fetchOptions;
    const source = qweatherFetch(sourceOptions);
    const result = await patchWK3QWeatherAlertsDiagnostic(bytes, { fetchImpl: source.fetchImpl, language: "zh-CN", timezone: "Asia/Shanghai", experimentalRaw1Enabled });
    return { ...result, source };
}

function readQueryID(detailsUrl) {
    const url = new URL(detailsUrl);
    assert.equal(url.hostname, "weatherkit.apple.com");
    assert.equal(url.pathname, "/alertDetails/index.html");
    assert.equal(url.searchParams.get("party"), "qweather");
    return url.searchParams.get("ids");
}

test("no alerts collection and an empty Apple alert vector pass through without provider requests", async () => {
    const absent = withWeatherAlerts([], { absentCollection: true });
    const noCollection = await patch(absent);
    assert.equal(noCollection.status, "no_collection");
    assert.deepEqual(noCollection.bytes, absent);
    assert.equal(noCollection.source.calls, 0);

    const empty = withWeatherAlerts([]);
    const noAlerts = await patch(empty);
    assert.equal(noAlerts.status, "no_apple_alerts");
    assert.deepEqual(noAlerts.bytes, empty);
    assert.equal(noAlerts.source.calls, 0);
});

test("one uniquely matched Apple alert rewrites only detail links and carries original ID into detail payload", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const before = decodeWK3Alerts(original), opaque = [14, 17].map(slot => tableFingerprint(original, slot));
    const result = await patch(original, { html: qweatherHTML([exactEvent]) });
    assert.equal(result.status, "rewritten");
    assert.equal(result.source.calls, 1);
    const after = decodeWK3Alerts(result.bytes);
    assert.match(after.detailsUrl, /ids=wk3_/);
    assert.equal(after.alerts.length, 1);
    assert.deepEqual(after.alerts[0].id, before.alerts[0].id);
    for (const key of ["description", "severity", "issuedTime", "countryCode", "areaId", "expireTime"]) assert.deepEqual(after.alerts[0][key], before.alerts[0][key]);
    assert.equal(after.alerts[0].detailsUrl, after.detailsUrl);
    assert.deepEqual([14, 17].map(slot => tableFingerprint(result.bytes, slot)), opaque);
    const details = await resolveNativeAlertDetails(readQueryID(after.detailsUrl), "zh-CN", async () => { throw new Error("must be local after a successful match"); });
    assert.equal(details.length, 1);
    assert.equal(details[0].id, "00000000-0000-4000-8000-000000000001");
    assert.equal(details[0].detailsUrl, `#${details[0].id}`);
    assert.equal(details[0].countryCode, "CN");
    assert.equal(details[0].areaId, regionCode);
    assert.equal(Date.parse(details[0].issuedTime) / 1000, issueSeconds);
});

test("multiple alerts match one-to-one independent of source order and preserve Apple event order", async () => {
    const apple = [
        alertSpec({ index: 1, description: "暴雪黄色预警", severity: 3 }),
        alertSpec({ index: 2, description: "道路结冰黄色预警", severity: 3 }),
    ];
    const original = withWeatherAlerts(apple);
    const html = qweatherHTML([
        { description: "道路结冰黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "注意道路结冰。" },
        { description: "分区暴雪黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "关注降雪。" },
    ]);
    const result = await patch(original, { html });
    assert.equal(result.status, "rewritten");
    const after = decodeWK3Alerts(result.bytes);
    assert.deepEqual(after.alerts.map(alert => alert.id), decodeWK3Alerts(original).alerts.map(alert => alert.id));
    const details = await resolveNativeAlertDetails(readQueryID(after.detailsUrl));
    assert.deepEqual(details.map(alert => alert.id), apple.map(alert => alert.id));
    assert.deepEqual(details.map(alert => alert.severity), ["moderate", "moderate"]);
});

test("Fangshan dual alerts match when Apple areaId is omitted but CN, original page region, and QWeather page region agree", async () => {
    const fangshanRegion = "fangshan-101011200";
    const fangshanDetailsUrl = `https://www.qweather.com/severe-weather/${fangshanRegion}.html?from=AppleWeatherService`;
    const apple = [
        alertSpec({ index: 1, description: "暴雪", severity: 3, areaId: null, detailsUrl: fangshanDetailsUrl }),
        alertSpec({ index: 2, description: "道路结冰", severity: 3, areaId: null, detailsUrl: fangshanDetailsUrl }),
    ];
    const original = withWeatherAlerts(apple, { detailsUrl: fangshanDetailsUrl });
    const events = [
        { description: "道路结冰黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "房山道路结冰风险。" },
        { description: "分区暴雪黄色预警信号", issueText: "2026-11-07 10:00", color: "yellow", message: "房山区暴雪风险。" },
    ];
    const result = await patch(original, { html: qweatherHTML(events, { regionTitle: "房山区" }) });
    assert.equal(result.status, "rewritten");
    assert.deepEqual(result.eventDiagnostics.map(({ status, counts }) => [status, counts]), [
        ["matched", { region: 2, type: 1, severity: 1, issued: 1, candidates: 1 }],
        ["matched", { region: 2, type: 1, severity: 1, issued: 1, candidates: 1 }],
    ]);
    assert.equal(result.typeDiagnostics.comparisons.find(pair => pair.appleIndex === 0 && pair.qweatherIndex === 1).alias, "partitioned_snow_to_snow");
    const before = decodeWK3Alerts(original), after = decodeWK3Alerts(result.bytes);
    assert.deepEqual(before.alerts.map(alert => alert.areaId), [null, null], "the fixture has no serialized Apple areaId fields");
    assert.deepEqual(after.alerts.map(alert => alert.areaId), [null, null], "the patch only rewrites detail links");
    assert.deepEqual(after.alerts.map(alert => alert.id), before.alerts.map(alert => alert.id));
    assert.match(after.detailsUrl, /ids=wk3_/);
    const details = await resolveNativeAlertDetails(readQueryID(after.detailsUrl));
    assert.deepEqual(details.map(alert => alert.areaId), ["101011200", "101011200"]);
});

test("missing Apple areaId still requires country CN and explicit conflicting areaId remains rejected", async () => {
    const fangshanRegion = "fangshan-101011200";
    const detailsUrl = `https://www.qweather.com/severe-weather/${fangshanRegion}.html?from=AppleWeatherService`;
    const html = qweatherHTML([exactEvent], { regionTitle: "房山区" });
    const unknownCountry = alertSpec({ areaId: null, detailsUrl, countryCode: "" });
    const countryResult = await patch(withWeatherAlerts([unknownCountry], { detailsUrl }), { html });
    assert.equal(countryResult.eventDiagnostics[0].status, "region_unverified");
    assert.deepEqual(countryResult.bytes, withWeatherAlerts([unknownCountry], { detailsUrl }));

    const conflictingArea = alertSpec({ areaId: "101010100", detailsUrl });
    const areaResult = await patch(withWeatherAlerts([conflictingArea], { detailsUrl }), { html });
    assert.equal(areaResult.eventDiagnostics[0].status, "region_mismatch");
    assert.deepEqual(areaResult.bytes, withWeatherAlerts([conflictingArea], { detailsUrl }));
});

test("region, event type, severity, and issue-time mismatches keep the complete original bytes", async () => {
    const cases = [
        { name: "Apple area differs from QWeather region", apple: alertSpec({ areaId: "101190405" }), events: [exactEvent], expected: "region_mismatch" },
        { name: "type differs", apple: alertSpec(), events: [{ ...exactEvent, description: "暴雨黄色预警" }], expected: "event_unmatched" },
        { name: "unverified red-color crosswalk", apple: alertSpec(), events: [{ ...exactEvent, color: "red" }], expected: "event_unmatched" },
        { name: "publish time differs", apple: alertSpec(), events: [{ ...exactEvent, issueText: "2026-11-07 10:01" }], expected: "event_unmatched" },
    ];
    for (const item of cases) {
        const original = withWeatherAlerts([item.apple]);
        const result = await patch(original, { html: qweatherHTML(item.events) });
        assert.equal(result.status, item.expected, item.name);
        assert.deepEqual(result.bytes, original, item.name);
    }
});

test("national alert types use verified blue/yellow and separately gated experimental orange/raw2 and red/raw1", async () => {
    const chineseColors = { blue: "蓝色", yellow: "黄色", orange: "橙色", red: "红色" };
    for (const item of NATIONAL_WARNING_TYPES) {
        for (const color of NATIONAL_WARNING_GOVERNMENT_LEVELS[item.id]) {
            const rawSeverity = color === "blue" ? 4 : color === "yellow" ? 3 : color === "orange" ? 2 : 1;
            const original = withWeatherAlerts([alertSpec({ description: item.name, severity: rawSeverity })]);
            const event = {
                description: `${item.name}${chineseColors[color]}预警`,
                issueText: "2026-11-07 10:00",
                color,
                message: "匿名回归样本。",
            };
            const result = await patch(original, { html: qweatherHTML([event]), experimentalRaw1Enabled: true });
            const evidenced = true;
            if (evidenced) {
                assert.equal(result.status, "rewritten", `${item.name}/${color}`);
                assert.equal(result.eventDiagnostics[0].status, color === "orange" ? "matched_experimental_inferred" : color === "red" ? "matched_experimental_raw1_inferred" : "matched", `${item.name}/${color}`);
            }
            assert.equal(result.eventDiagnostics[0].counts.issued, 1, `${item.name}/${color} reports exact issue-time agreement`);
        }
    }
});

test("raw1 red is isolated behind its switch and the native details endpoint honors the same switch", async () => {
    const original = withWeatherAlerts([alertSpec({ description: "暴雪", severity: 1 })]);
    const html = qweatherHTML([{ description: "暴雪红色预警", issueText: "2026-11-07 10:00", color: "red", message: "红色预警正文。" }]);
    const disabled = await patch(original, { html });
    assert.equal(disabled.eventDiagnostics[0].status, "raw1_experiment_disabled");
    assert.notEqual(disabled.status, "rewritten");
    assert.deepEqual(disabled.bytes, original);

    const enabled = await patch(original, { html, experimentalRaw1Enabled: true });
    assert.equal(enabled.status, "rewritten");
    assert.equal(enabled.eventDiagnostics[0].status, "matched_experimental_raw1_inferred");
    const after = decodeWK3Alerts(enabled.bytes);
    assert.deepEqual(after.alerts[0].id, decodeWK3Alerts(original).alerts[0].id);
    assert.equal(after.alerts[0].severity, 1, "the original WK3 raw severity is retained");
    assert.equal(after.alerts[0].description, "暴雪");
    const ids = readQueryID(after.detailsUrl);
    await assert.rejects(resolveNativeAlertDetails(ids), /severity|WK3/i, "the raw1 details route fails closed when the switch is absent");
    const details = await resolveNativeAlertDetails(ids, "zh-CN", undefined, { experimentalRaw1Enabled: true });
    assert.equal(details[0].severity, "extreme");
    assert.equal(details[0].id, "00000000-0000-4000-8000-000000000001");
    assert.match(details[0].description, /暴雪红色预警/);
});

test("Turpan blue gale real-evidence tuple matches only with exact type, region, raw severity and issue time", async () => {
    const original = withWeatherAlerts([alertSpec({ description: "大风", severity: 4 })]);
    const event = { description: "大风蓝色预警", issueText: "2026-11-07 10:00", color: "blue", message: "匿名大风预警详情。" };
    const result = await patch(original, { html: qweatherHTML([event], { regionTitle: "吐鲁番市高昌区", publisher: "吐鲁番市高昌区气象台" }) });
    assert.equal(result.status, "rewritten");
    assert.equal(result.eventDiagnostics[0].status, "matched");
    assert.deepEqual(result.eventDiagnostics[0].counts, { region: 1, type: 1, severity: 1, issued: 1, candidates: 1 });
    assert.equal(result.eventDiagnostics[0].rawSeverity, 4);
    assert.equal(result.eventDiagnostics[0].qweatherSeverity, "unknown");
    assert.equal(result.eventDiagnostics[0].governmentColor, "blue");
    const before = decodeWK3Alerts(original), after = decodeWK3Alerts(result.bytes);
    assert.deepEqual(after.alerts[0].id, before.alerts[0].id, "the Apple event identity is retained");
    assert.equal(after.alerts[0].description, before.alerts[0].description);
    assert.equal(after.alerts[0].severity, 4);
    assert.equal(after.alerts[0].issuedTime, before.alerts[0].issuedTime);
    const details = await resolveNativeAlertDetails(readQueryID(after.detailsUrl));
    assert.equal(details.length, 1);
    assert.equal(details[0].id, "00000000-0000-4000-8000-000000000001");
    assert.equal(details[0].severity, "minor", "WK3 raw4 is converted using the observed b66 enum, not inferred from color");
    assert.match(details[0].description, /大风蓝色预警/);
});

test("the gale blue exception rejects wrong region, type, color, time, unknown raw enum, and ambiguity", async () => {
    const event = { description: "大风蓝色预警", issueText: "2026-11-07 10:00", color: "blue", message: "匿名大风预警详情。" };
    const cases = [
        { name: "explicit region conflict", apple: alertSpec({ description: "大风", severity: 4, areaId: "101010100" }), events: [event], status: "region_mismatch" },
        { name: "wrong event type", apple: alertSpec({ description: "大风", severity: 4 }), events: [{ ...event, description: "暴雨蓝色预警" }], status: "event_unmatched", eventStatus: "type_no_match" },
        { name: "wrong government color", apple: alertSpec({ description: "大风", severity: 4 }), events: [{ ...event, description: "大风黄色预警", color: "yellow" }], status: "event_unmatched", eventStatus: "severity_no_match" },
        { name: "wrong issue time", apple: alertSpec({ description: "大风", severity: 4 }), events: [{ ...event, issueText: "2026-11-07 10:01" }], status: "event_unmatched", eventStatus: "issue_time_no_match" },
        { name: "unknown WK3 raw enum", apple: alertSpec({ description: "大风", severity: 5 }), events: [event], status: "apple_fields_unverified", eventStatus: "severity_unverified" },
        { name: "two indistinguishable candidates", apple: alertSpec({ description: "大风", severity: 4 }), events: [event, event], status: "event_ambiguous", eventStatus: "candidate_ambiguous" },
    ];
    for (const item of cases) {
        const original = withWeatherAlerts([item.apple]);
        const result = await patch(original, { html: qweatherHTML(item.events) });
        assert.equal(result.status, item.status, item.name);
        if (item.eventStatus) assert.equal(result.eventDiagnostics[0].status, item.eventStatus, item.name);
        assert.deepEqual(result.bytes, original, `${item.name} preserves every Apple byte`);
    }
    assert.equal(WK3_HTML_COLOR_EVIDENCE.blue.capSeverity, "minor", "blue uses the general standard crosswalk");
});

test("event diagnostics identify the first failed strict predicate without exposing alert values", async () => {
    const cases = [
        { apple: alertSpec({ areaId: "101010100" }), events: [exactEvent], status: "region_mismatch", counts: { region: 0, type: 0, severity: 0, issued: 0, candidates: 0 } },
        { apple: alertSpec(), events: [{ ...exactEvent, description: "暴雨黄色预警" }], status: "type_no_match", counts: { region: 1, type: 0, severity: 0, issued: 0, candidates: 0 } },
        { apple: alertSpec(), events: [{ ...exactEvent, color: "red" }], status: "severity_no_match", counts: { region: 1, type: 1, severity: 0, issued: 1, candidates: 0 } },
        { apple: alertSpec(), events: [{ ...exactEvent, issueText: "2026-11-07 10:01" }], status: "issue_time_no_match", counts: { region: 1, type: 1, severity: 1, issued: 0, candidates: 0 } },
        { apple: alertSpec(), events: [exactEvent, exactEvent], status: "candidate_ambiguous", counts: { region: 2, type: 2, severity: 2, issued: 2, candidates: 2 } },
    ];
    for (const item of cases) {
        const result = await patch(withWeatherAlerts([item.apple]), { html: qweatherHTML(item.events) });
        assert.equal(result.eventDiagnostics[0].status, item.status);
        assert.deepEqual(result.eventDiagnostics[0].counts, item.counts);
        assert.deepEqual(result.bytes, withWeatherAlerts([item.apple]));
    }
});

test("both Apple events are diagnosed even when the first one is unmatched", async () => {
    const apple = [
        alertSpec({ index: 1, description: "高温黄色预警", severity: 3 }),
        alertSpec({ index: 2, description: "寒潮黄色预警", severity: 3, issuedTime: issueSeconds + 60 }),
    ];
    const events = [
        exactEvent,
        { description: "寒潮黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "关注寒潮。" },
    ];
    const result = await patch(withWeatherAlerts(apple), { html: qweatherHTML(events) });
    assert.equal(result.status, "event_unmatched");
    assert.deepEqual(result.eventDiagnostics.map(event => event.status), ["type_no_match", "issue_time_no_match"]);
    assert.equal(result.sourceCount, 2);
    assert.deepEqual(result.bytes, withWeatherAlerts(apple));
});

test("type diagnostics retain raw Apple and QWeather titles, report exact normalized deltas, and keep all-or-nothing fallback", async () => {
    const apple = [
        alertSpec({ index: 1, description: "暴雪" }),
        alertSpec({ index: 2, description: "道路结冰黄色预警" }),
    ];
    const events = [
        { description: "道路结冰黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
        { description: "高温黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
    ];
    const original = withWeatherAlerts(apple);
    const result = await patch(original, { html: qweatherHTML(events) });
    assert.equal(result.status, "event_unmatched");
    assert.deepEqual(result.eventDiagnostics.map(event => event.status), ["type_no_match", "matched"]);
    assert.deepEqual(result.bytes, original, "one unmatched event keeps the entire Apple response unchanged");
    assert.deepEqual(result.typeDiagnostics.apple.map(({ rawDescription, normalized }) => [rawDescription, normalized]), [
        ["暴雪", "暴雪"],
        ["道路结冰黄色预警", "道路结冰"],
    ]);
    assert.deepEqual(result.typeDiagnostics.qweather.map(({ rawEventName, normalizedEventName, normalizedMatchType }) => [rawEventName, normalizedEventName, normalizedMatchType]), [
        ["道路结冰黄色预警", "道路结冰", "道路结冰"],
        ["高温黄色预警", "高温", "高温"],
    ]);
    assert.deepEqual(result.typeDiagnostics.comparisons.map(({ appleIndex, qweatherIndex, equal }) => [appleIndex, qweatherIndex, equal]), [
        [0, 0, false], [0, 1, false], [1, 0, true], [1, 1, false],
    ]);
    assert.deepEqual(result.typeDiagnostics.comparisons[0], {
        appleIndex: 0, qweatherIndex: 0, equal: false, region: true, type: false, severity: true,
        issueTime: true, uniqueCandidate: false, candidateCount: 0, lifecycle: "active", matched: false,
        alias: "none", appleOnly: "暴雪", qweatherOnly: "道路结冰", commonPrefix: "", commonSuffix: "",
    });
});

test("one unmatched Apple event preserves the shared collection and every per-event URL", async () => {
    const apple = [
        alertSpec({ index: 1, description: "恶劣天气", severity: 3 }),
        alertSpec({ index: 2, description: "寒潮", severity: 3 }),
    ];
    const original = withWeatherAlerts(apple);
    const before = decodeWK3Alerts(original);
    const events = [
        { description: "寒潮黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "寒潮风险提示。" },
        { description: "海区大风黄色预警", issueText: "2026-11-07 10:00", color: "yellow", message: "海区大风风险提示。" },
    ];
    const source = qweatherFetch({ html: qweatherHTML(events) });
    const result = await patchWK3QWeatherAlertsDiagnostic(original, {
        fetchImpl: source.fetchImpl, language: "zh-CN", timezone: "Asia/Shanghai",
    });

    assert.equal(result.status, "apple_fields_unverified");
    assert.deepEqual(result.eventDiagnostics.map(event => event.status), ["type_unverified", "matched"]);
    assert.equal(source.calls, 1);
    const after = decodeWK3Alerts(result.bytes);
    assert.equal(after.detailsUrl, before.detailsUrl, "the collection-level shared Apple link is unchanged");
    assert.deepEqual(after.alerts[0], before.alerts[0], "the unmatched broad Apple event is byte-semantically unchanged");
    assert.equal(after.alerts[1].id.bytes.join(","), before.alerts[1].id.bytes.join(","), "Apple event identity remains fixed");
    assert.equal(after.alerts[1].description, before.alerts[1].description);
    assert.equal(after.alerts[1].detailsUrl, before.alerts[1].detailsUrl, "partial results never rewrite an individual route");
});

test("partial matching never creates a per-alert route when a summary has no own link", async () => {
    const apple = [
        alertSpec({ index: 1, description: "恶劣天气" }),
        alertSpec({ index: 2, description: "寒潮", detailsUrl: "" }),
    ];
    const original = withWeatherAlerts(apple);
    const result = await patchWK3QWeatherAlertsDiagnostic(original, {
        fetchImpl: qweatherFetch({ html: qweatherHTML([
            { description: "寒潮黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
            { description: "海区大风黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
        ]) }).fetchImpl,
    });
    assert.equal(result.status, "apple_fields_unverified");
    assert.deepEqual(result.bytes, original, "shared-only responses remain untouched on any partial match");
});

test("selective detail experiment rejects one QWeather event reused by two Apple summaries", async () => {
    const apple = [
        alertSpec({ index: 1, description: "寒潮黄色预警" }),
        alertSpec({ index: 2, description: "寒潮黄色预警" }),
    ];
    const original = withWeatherAlerts(apple);
    const result = await patchWK3QWeatherAlertsDiagnostic(original, {
        fetchImpl: qweatherFetch({ html: qweatherHTML([exactEvent]) }).fetchImpl,
    });
    assert.equal(result.status, "event_ambiguous");
    assert.deepEqual(result.eventDiagnostics.map(event => event.status), ["source_reused", "source_reused"]);
    assert.deepEqual(result.bytes, original, "source identity reuse cannot partially rewrite either Apple event");
});

test("the confirmed 分区暴雪 alias matches exact type only and passes severity plus exact publish-time checks", async () => {
    const apple = [
        alertSpec({ index: 1, description: "暴雪", severity: 3 }),
        alertSpec({ index: 2, description: "道路结冰", severity: 3 }),
    ];
    const events = [
        { description: "道路结冰黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
        { description: "分区暴雪黄色预警信号", issueText: "2026-11-07 10:00", color: "yellow" },
    ];
    const result = await patch(withWeatherAlerts(apple), { html: qweatherHTML(events) });
    assert.equal(result.status, "rewritten");
    assert.deepEqual(result.eventDiagnostics.map(event => [event.status, event.counts]), [
        ["matched", { region: 2, type: 1, severity: 1, issued: 1, candidates: 1 }],
        ["matched", { region: 2, type: 1, severity: 1, issued: 1, candidates: 1 }],
    ]);
    assert.equal(result.typeDiagnostics.apple[0].normalized, "暴雪");
    assert.equal(result.typeDiagnostics.qweather[1].normalizedMatchType, "分区暴雪");
    assert.equal(result.typeDiagnostics.qweather[1].matchedType, "cn.snowstorm");
    assert.equal(result.typeDiagnostics.comparisons.find(pair => pair.appleIndex === 0 && pair.qweatherIndex === 1).alias, "partitioned_snow_to_snow");
    const after = decodeWK3Alerts(result.bytes);
    assert.match(after.detailsUrl, /ids=wk3_/);
    assert.deepEqual(after.alerts.map(alert => alert.id), decodeWK3Alerts(withWeatherAlerts(apple)).alerts.map(alert => alert.id));
});

test("the snow alias does not remove 分区 from unrelated warning types", async () => {
    const original = withWeatherAlerts([alertSpec({ description: "暴雨" })]);
    const result = await patch(original, { html: qweatherHTML([
        { description: "分区暴雨黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
    ]) });
    assert.equal(result.status, "event_unmatched");
    assert.equal(result.eventDiagnostics[0].status, "type_no_match");
    assert.deepEqual(result.bytes, original);
});

test("alias candidates still require matching severity, exact publish time, and unique type candidates", async () => {
    const original = withWeatherAlerts([alertSpec({ description: "暴雪", severity: 3 })]);
    const severity = await patch(original, { html: qweatherHTML([
        { description: "分区暴雪黄色预警", issueText: "2026-11-07 10:00", color: "red" },
    ]) });
    assert.equal(severity.eventDiagnostics[0].status, "severity_no_match");
    assert.deepEqual(severity.bytes, original);

    const issueTime = await patch(original, { html: qweatherHTML([
        { description: "分区暴雪黄色预警", issueText: "2026-11-07 10:01", color: "yellow" },
    ]) });
    assert.equal(issueTime.eventDiagnostics[0].status, "issue_time_no_match");
    assert.deepEqual(issueTime.bytes, original);

    const ambiguous = await patch(original, { html: qweatherHTML([
        { description: "暴雪黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
        { description: "分区暴雪黄色预警信号", issueText: "2026-11-07 10:00", color: "yellow" },
    ]) });
    assert.equal(ambiguous.eventDiagnostics[0].status, "candidate_ambiguous");
    assert.equal(ambiguous.eventDiagnostics[0].counts.candidates, 2);
    assert.deepEqual(ambiguous.bytes, original);
});

test("if a second Apple event has no exact match, the alias cannot partially rewrite the alert batch", async () => {
    const apple = [
        alertSpec({ index: 1, description: "暴雪", severity: 3 }),
        alertSpec({ index: 2, description: "道路结冰", severity: 3 }),
    ];
    const original = withWeatherAlerts(apple);
    const result = await patch(original, { html: qweatherHTML([
        { description: "分区暴雪黄色预警信号", issueText: "2026-11-07 10:00", color: "yellow" },
    ]) });
    assert.equal(result.status, "event_unmatched");
    assert.deepEqual(result.eventDiagnostics.map(event => event.status), ["matched", "type_no_match"]);
    assert.deepEqual(result.bytes, original);
});

test("generic Apple warning suffix matches a colored QWeather title only when other exact fields agree", async () => {
    const original = withWeatherAlerts([alertSpec({ description: "寒潮预警信号" })]);
    const result = await patch(original, { html: qweatherHTML([exactEvent]) });
    assert.equal(result.status, "rewritten");
    assert.equal(result.eventDiagnostics[0].status, "matched");
});

test("QWeather parser diagnostics distinguish unusable publication-time blocks from a true empty page", async () => {
    const result = await patch(withWeatherAlerts([alertSpec()]), { html: qweatherHTML([{ ...exactEvent, issueText: "not a date" }]) });
    assert.equal(result.status, "source_no_alerts");
    assert.deepEqual(result.sourceDiagnostics, { blocks: 1, skippedTitle: 0, skippedIssueTime: 1, unknownGovernmentColor: 0 });
});

test("HTML parser keeps government color separate and never invents QWeather severity or event code", () => {
    const parsed = WeatherAlerts.ExtractWeatherAlertPage(qweatherHTML([
        { description: "暴雨蓝色预警", color: "blue" },
        { description: "大风黄色预警", color: "yellow" },
        { description: "冰雹橙色预警", color: "orange" },
        { description: "暴雪红色预警", color: "red" },
    ]));
    assert.deepEqual(parsed.alerts.map(alert => alert.governmentColor), ["blue", "yellow", "orange", "red"]);
    assert.ok(parsed.alerts.every(alert => alert.severity === "unknown" && alert.qweatherSeverity === null && alert.eventTypeCode === null));
});

test("current QWeather update binds only through exact Apple identity fields and keeps Apple ID", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const currentUpdate = await patch(original, { html: qweatherHTML([
        { action: "更新", description: "寒潮黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
    ]) });
    assert.equal(currentUpdate.status, "rewritten");
    assert.equal(currentUpdate.eventDiagnostics[0].status, "matched_update_current");
    assert.deepEqual(decodeWK3Alerts(currentUpdate.bytes).alerts[0].id, decodeWK3Alerts(original).alerts[0].id);

    const staleApple = await patch(original, { html: qweatherHTML([
        { action: "更新", description: "寒潮黄色预警", issueText: "2026-11-07 11:00", color: "yellow" },
    ]) });
    assert.equal(staleApple.status, "event_unmatched");
    assert.equal(staleApple.eventDiagnostics[0].status, "source_update_newer_candidate");
    assert.deepEqual(staleApple.bytes, original);

    const unrelatedVersion = await patch(original, { html: qweatherHTML([
        { action: "变更", description: "寒潮黄色预警", issueText: "2026-11-07 09:00", color: "yellow" },
    ]) });
    assert.equal(unrelatedVersion.eventDiagnostics[0].status, "source_update_version_mismatch");
    assert.deepEqual(unrelatedVersion.bytes, original);
});

test("QWeather cancellation headline remains non-matchable and passes through", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const result = await patch(original, { html: qweatherHTML([
        { action: "解除", description: "寒潮黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
    ]) });
    assert.equal(result.status, "event_unmatched");
    assert.equal(result.eventDiagnostics[0].status, "source_cancelled");
    assert.deepEqual(result.bytes, original);
});

test("anonymous Wanshan failure-shape replay logs an unknown raw enum and unmatched second type, then preserves Apple bytes", async () => {
    const apple = [
        alertSpec({ index: 1, description: "暴雨黄色预警", severity: 255 }),
        alertSpec({ index: 2, description: "道路结冰", severity: 3 }),
    ];
    const original = withWeatherAlerts(apple);
    const result = await patch(original, { html: qweatherHTML([
        { description: "暴雨黄色预警", issueText: "2026-11-07 10:00", color: "yellow" },
    ]) });
    assert.deepEqual(result.eventDiagnostics.map(event => event.status), ["severity_unverified", "type_no_match"]);
    assert.equal(result.typeDiagnostics.apple[0].rawSeverity, 255);
    assert.equal(result.typeDiagnostics.apple[0].verifiedSeverity, null);
    assert.equal(result.typeDiagnostics.qweather[0].qweatherSeverity, "unknown");
    assert.equal(result.typeDiagnostics.qweather[0].governmentColor, "yellow");
    assert.equal(result.typeDiagnostics.qweather[0].issuedTime, sourceIssueTime);
    assert.deepEqual(result.bytes, original);
});

test("ambiguous source events and provider outage leave Apple detail URLs untouched", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const ambiguous = await patch(original, { html: qweatherHTML([exactEvent, exactEvent]) });
    assert.equal(ambiguous.status, "event_ambiguous");
    assert.deepEqual(ambiguous.bytes, original);

    const unavailable = await patch(original, { fail: true });
    assert.equal(unavailable.status, "source_unavailable");
    assert.deepEqual(unavailable.bytes, original);
});

test("invalid provider page and unknown WK3 alert structure fail open byte-for-byte", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const badStatus = await patch(original, { status: 503 });
    assert.equal(badStatus.status, "source_unavailable");
    assert.deepEqual(badStatus.bytes, original);
    const badType = await patch(original, { contentType: "application/json" });
    assert.equal(badType.status, "source_unavailable");
    assert.deepEqual(badType.bytes, original);

    const futureSummary = withWeatherAlerts([alertSpec({ areaName: "张家港市" })]);
    const unknown = await patch(futureSummary, { html: qweatherHTML([exactEvent]) });
    assert.equal(unknown.status, "summary_structure_unverified");
    assert.deepEqual(unknown.bytes, futureSummary);

    const corrupt = original.slice();
    const bb = new ByteBuffer(corrupt), root = bb.readUint32(0), offset = bb.__offset(root, 4 + 9 * 2);
    new DataView(corrupt.buffer).setUint32(root + offset, 0xffffffff, true);
    const malformed = await patch(corrupt);
    assert.equal(malformed.status, "structure_invalid");
    assert.deepEqual(malformed.bytes, corrupt);
});

test("provider empty data is not treated as a match; no details URL is rewritten", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const result = await patch(original, { html: qweatherHTML([]) });
    assert.equal(result.status, "source_no_alerts");
    assert.deepEqual(result.bytes, original);
});

test("oversized details payload keeps Apple links instead of producing an unbounded native request URL", async () => {
    const original = withWeatherAlerts([alertSpec()]);
    const longEvent = { ...exactEvent, message: "预警详情。".repeat(1800) };
    const result = await patch(original, { html: qweatherHTML([longEvent]) });
    assert.equal(result.status, "details_payload_too_large");
    assert.deepEqual(result.bytes, original);
});

test("QWeather fetch uses the public region page and does not forward Apple credentials", async () => {
    const alertPage = WeatherAlerts.BuildWeatherAlertPageURL(region, "zh-CN");
    let calls = 0;
    const parsed = await WeatherAlerts.FetchWeatherAlertPage(region, "zh-CN", async (url, options) => {
        calls++;
        assert.equal(url, alertPage.toString());
        assert.deepEqual(options.headers, { Accept: "text/html" });
        assert.equal(options.headers.Authorization, undefined);
        assert.equal(options.headers.Cookie, undefined);
        return { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" }, body: qweatherHTML([exactEvent]) };
    });
    assert.equal(calls, 1);
    assert.equal(parsed.alerts.length, 1);
    assert.equal(parsed.alerts[0].severity, "unknown");
    assert.equal(parsed.alerts[0].qweatherSeverity, null);
    assert.equal(parsed.alerts[0].governmentColor, "yellow");
    assert.equal(parsed.alerts[0].eventTypeCode, null);
    assert.equal(parsed.alerts[0].issuedTime, sourceIssueTime);
});
