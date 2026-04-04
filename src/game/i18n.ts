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

    // Easter Eggs
    PARTY_ON:           '🎉 PARTY MODE 🎉',
    UNLOCK_ALL:         '🔓 ALL CAMPAIGNS UNLOCKED',

    // Splash
    SPLASH_TITLE:       'ZEEWOLF: SAR',
    SPLASH_HINT:        'KLICKEN ZUM SYSTEMSTART',

    // Main menu
    MENU_TITLE:         'ZEEWOLF: SAR',
    MENU_SUBTITLE:      'MAIN SYSTEM',
    MENU_START:         'SPIEL STARTEN',
    MENU_HELI:          'HELIKOPTER',
    MENU_SETTINGS:      'EINSTELLUNGEN',
    MENU_CREDITS:       'CREDITS',

    // Navigation
    BACK:               '◀ ZURÜCK',
    RETRY:              'WIEDERHOLEN',
    RETURN_TO_BASE:     'ZURÜCK ZUR BASIS',

    // Campaign select
    CAMPAIGN_SELECT_TITLE:  'KAMPAGNE WÄHLEN',
    CAMPAIGN_SELECT_SUB:    'EINSATZGEBIET',

    // Heli select
    HELI_SELECT_TITLE:  'HANGAR',
    HELI_SELECT_SUB:    'LUFTFAHRZEUG WÄHLEN',

    // Mission result screens
    TERMINATED:             'TERMINATED',
    MISSION_COMPLETE:       'MISSION COMPLETE',
    OBJECTIVES_CLEARED:     'ALL OBJECTIVES CLEARED',
    CAMPAIGN_COMPLETE:      'CAMPAIGN COMPLETE',
    ALL_MISSIONS_CLEARED:   'ALL MISSIONS CLEARED',
    CAMPAIGN_FAILED:        'CAMPAIGN FAILED',
    MISSION_ABORTED:        'MISSION ABORTED',

    // Briefing
    CLICK_TO_DEPLOY:    'KLICKEN ZUM EINSATZ',

    // Anrede
    PILOT_ADDRESS:      (rank: string, callsign: string) => callsign ? `${rank} ${callsign}` : rank,
    BRIEFING_ADDRESS:   (rank: string, callsign: string) =>
        callsign ? `Ihre Mission, ${rank} ${callsign}` : `Ihre Mission`,

    // Session / Einstellungen
    SAVE_CODE_INVALID:  'UNGÜLTIGER CODE',
    SAVE_CODE_LOADED:   'SPIELSTAND GELADEN',
    NO_SAVE_STATE:      '  |  KEIN SPEICHERSTAND',
    STATS:              (c: number, m: number) => `KAMPAGNEN: ${c}  |  MISSIONEN: ${m}`,
    CAMPAIGN_LOCKED:    '[ GESPERRT ]',

    // Datenschutz
    DELETE_SESSION:     'SPIELSTAND LÖSCHEN',
    DELETE_CONFIRM:     'WIRKLICH LÖSCHEN?',
    SESSION_DELETED:    'GELÖSCHT – SEITE WIRD NEU GELADEN…',

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

    // What's New
    WHATS_NEW_VERSION:  'v24.0',
    WHATS_NEW_TITLE:    'Physik, Wind & Mobile',
    WHATS_NEW_HINT:     'KLICKEN ZUM FORTFAHREN',
    WHATS_NEW_ITEMS:    [
        'Berge blocken den Wind — im Windschatten eines Gipfels wird der Heli spürbar ruhiger',
        'Wind beeinflusst jetzt aktiv die Flugeigenschaften (Drift)',
        'Windstärke im Kampagnen-Editor visuell als Pfeil dargestellt',
        'Mobile: Kamera klebt direkt am Heli — kein Davonfliegen mehr möglich',
        'Mobile: Steuerungsmodus wählbar — PROFI (relativ zum Heli) oder VEREINFACHT (oben = vorwärts)',
    ],
} as const;
