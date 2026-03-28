// ─── UI-Systemtexte (Deutsch) ────────────────────────────────────────────────
// Alle spielersichtbaren Systemtexte werden hier zentral gepflegt.
// Kampagnentexte (Headlines, Briefings) stehen in den jeweiligen JSON-Dateien.

export const I18N = {
    // HUD-Meldungen
    OUT_OF_FUEL:    'KEIN TREIBSTOFF!',
    MAX_ALTITUDE:   'MAX. HÖHE',
    CARGO_SECURED:  'FRACHT GESICHERT!',
    PATIENT_SECURED:'PATIENT GESICHERT!',
    DELIVERED:      'ABGELIEFERT!',
    ONBOARD:        (n: number, max: number) => `AN BORD [${n}/${max}]`,
    CABIN_FULL:     'KABINE VOLL!',
    DROP_AT_PAD:    'AM LANDEPLATZ ABLEGEN!',
    SECURED:        (rescued: number, total: number) => `GESICHERT: ${rescued}/${total}`,

    // Startmeldungen
    SOARING:        'HOCH HINAUS – ↑↓ PITCH  ←→ BANK',
    SYSTEM_READY:   'SYSTEM BEREIT – TRIEBWERK STARTEN [W]',

    // Crashgründe
    CRASH_WATER:        'WASSERAUFPRALL',
    CRASH_BAD_ZONE:     'FALSCHES LANDEZIEL',
    CRASH_TOO_FAST:     'ZU SCHNELL',
    CRASH_HARD_IMPACT:  'HARTER AUFPRALL',
    CRASH_CARRIER_TOWER:'TRÄGERTURM-KOLLISION',
    CRASH_PARKED_HELI:  'KOLLISION MIT ABGESTELLTEM HELI',
    CRASH_HANGAR:       'HANGAR-KOLLISION',
    CRASH_FUEL_TRUCK:   'KOLLISION MIT TANKWAGEN',
    CRASH_LIGHTHOUSE:   'LEUCHTTURM-KOLLISION',
    CRASH_BOAT:         'KOLLISION MIT BOOT',
    CRASH_TREE:         'BAUMKONTAKT',
} as const;
