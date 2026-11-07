import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildPublicWarningSampleLedger } from "../src/class/PublicWarningSampleLedger.mjs";

test("public sample ledger deduplicates without storing full alert content or claiming Apple evidence", async () => {
    const documented = JSON.parse(await readFile(new URL("./fixtures/qweather-alert-update-doc-example.json", import.meta.url), "utf8"));
    assert.equal(documented.evidenceGrade, "official-documentation-example; not a live capture and not Apple-WK3 paired");
    const alerts = [
        { eventName: "大风", eventTypeCode: "1006", governmentColor: "blue", issuedTime: "2026-11-07T10:00:00+08:00", messageType: "update", qweatherSeverity: "minor", message: "must not be copied" },
        { eventName: "大风", eventTypeCode: "1006", governmentColor: "blue", issuedTime: "2026-11-07T10:00:00+08:00", messageType: "update", qweatherSeverity: "minor", message: "duplicate" },
        { eventName: "恶劣天气", governmentColor: "orange", issuedTime: "2026-11-07T10:01:00+08:00", messageType: "active", message: "unknown type is omitted" },
    ];
    const samples = buildPublicWarningSampleLedger("tulufan-101290501", { alerts }, "2026-11-07T02:00:00Z");
    assert.equal(samples.length, 1);
    assert.equal(samples[0].typeId, "cn.gale");
    assert.equal(samples[0].lifecycle, "update");
    assert.equal(samples[0].appleWK3Paired, false);
    assert.equal(samples[0].evidenceGrade, "public-source-unpaired");
    assert.equal(JSON.stringify(samples).includes("must not be copied"), false);
    assert.equal(JSON.stringify(samples).includes("202510241119105837988676"), false);
});
