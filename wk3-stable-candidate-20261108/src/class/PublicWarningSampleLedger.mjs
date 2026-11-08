import { normalizeAlertLifecycle, normalizeGovernmentColor, resolveWeatherAlertType } from "./WeatherAlertTypeRegistry.mjs";

const REGION_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]*-\d{9}$/;

/** Keep only public, non-content evidence. This is not an Apple/WK3 pairing. */
export function buildPublicWarningSampleLedger(regionIdentifier, extracted, capturedAt = new Date().toISOString()) {
    if (!REGION_ID.test(String(regionIdentifier ?? ""))) throw new TypeError("Expected a public QWeather region identifier");
    const capturedMs = Date.parse(capturedAt);
    if (!Number.isFinite(capturedMs)) throw new TypeError("Expected an ISO capture timestamp");
    if (!Array.isArray(extracted?.alerts)) throw new TypeError("Expected parsed public QWeather alerts");

    const unique = new Map();
    for (const alert of extracted.alerts) {
        const type = resolveWeatherAlertType({
            code: alert?.eventTypeCode ?? alert?.eventType?.code,
            name: alert?.eventName ?? alert?.eventType?.name ?? alert?.description,
            regionIdentifier,
        });
        const governmentColor = normalizeGovernmentColor(alert?.governmentColor ?? alert?.color?.code ?? alert?.color?.name);
        const issueMs = Date.parse(alert?.issuedTime ?? "");
        if (!Number.isFinite(issueMs)) continue;
        const issuedTime = new Date(issueMs).toISOString();
        const lifecycle = normalizeAlertLifecycle(alert?.messageType);
        if (!type || !governmentColor || lifecycle === "unknown") continue;
        const sampleKey = [regionIdentifier, type.id, governmentColor, lifecycle, issuedTime].join("|");
        if (unique.has(sampleKey)) continue;
        unique.set(sampleKey, Object.freeze({
            sampleKey,
            capturedAt: new Date(capturedMs).toISOString(),
            sourceKind: "qweather-public-page",
            sourceUrl: `https://www.qweather.com/severe-weather/${regionIdentifier}.html?from=AppleWeatherService`,
            regionIdentifier,
            typeId: type.id,
            qweatherEventCode: alert?.eventTypeCode ?? alert?.eventType?.code ?? null,
            governmentColor,
            lifecycle,
            issuedTime,
            qweatherSeverity: alert?.qweatherSeverity ?? "unavailable",
            appleWK3Paired: false,
            evidenceGrade: "public-source-unpaired",
        }));
    }
    return [...unique.values()];
}
