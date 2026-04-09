// ─── UI-Systemtexte (Deutsch) ────────────────────────────────────────────────
// Alle spielersichtbaren Systemtexte werden hier zentral gepflegt.
// Kampagnentexte (Headlines, Briefings) stehen in den jeweiligen JSON-Dateien.

export const I18N = {
    // HUD-Meldungen
    OUT_OF_FUEL: 'KEIN TREIBSTOFF!',
    MAX_ALTITUDE: 'MAX. HÖHE',
    CARGO_SECURED: 'FRACHT GESICHERT!',
    PATIENT_SECURED: 'PATIENT GESICHERT!',
    DELIVERED: 'ABGELIEFERT!',
    ONBOARD: (n: number, max: number) => `AN BORD [${n}/${max}]`,
    CABIN_FULL: 'KABINE VOLL!',
    DROP_AT_PAD: 'AM LANDEPLATZ ABLEGEN!',
    SECURED: (rescued: number, total: number) => `GESICHERT: ${rescued}/${total}`,

    // Startmeldungen
    SOARING: 'HOCH HINAUS – ↑↓ PITCH  ←→ BANK',
    SYSTEM_READY: 'SYSTEM BEREIT – TRIEBWERK STARTEN [W]',

    // Easter Eggs
    PARTY_ON: '🎉 PARTY MODE 🎉',
    UNLOCK_ALL: '🔓 ALL CAMPAIGNS UNLOCKED',

    // Splash
    SPLASH_TITLE: 'ZEEWOLF: SAR',
    SPLASH_HINT: 'KLICKEN ZUM SYSTEMSTART',

    // Main menu
    MENU_TITLE: 'ZEEWOLF: SAR',
    MENU_SUBTITLE: 'MAIN SYSTEM',
    MENU_START: 'SPIEL STARTEN',
    MENU_MULTIPLAYER: 'MULTIPLAYER',
    MENU_HELI: 'HELIKOPTER',
    MENU_SETTINGS: 'EINSTELLUNGEN',
    MENU_CREDITS: 'CREDITS',

    // MP Lobby
    MP_SUBTITLE: 'KOOP-EINSATZ',
    MP_CREATE: 'SPIEL ERSTELLEN',
    MP_JOIN: 'BEITRETEN',
    MP_GENERATING: 'GENERIERE...',
    MP_WAIT_ANSWER: 'WARTE AUF ANTWORT...',
    MP_WAIT_CONNECT: 'WARTE AUF VERBINDUNG...',
    MP_CONNECTING: 'VERBINDE...',
    MP_CONNECTED: 'VERBUNDEN',
    MP_ERROR: 'FEHLER – BITTE ERNEUT VERSUCHEN',
    MP_READY_PROMPT: 'BEREIT ZUM EINSATZ?',
    MP_READY_BTN: 'BEREIT',
    MP_WAIT_READY: 'WARTE AUF MITSPIELER...',
    MP_COPY: 'KOPIEREN',
    MP_CONNECT: 'VERBINDEN',
    MP_GEN_ANSWER: 'ANTWORT GENERIEREN',
    MP_STEP1_HOST: 'Schritt 1: Diesen Code an deinen Mitspieler senden:',
    MP_STEP2_HOST: 'Schritt 2: Antwort des Mitspielers einfügen:',
    MP_STEP1_GUEST: 'Code des Gastgebers einfügen:',
    MP_STEP2_GUEST: 'Diesen Code an den Gastgeber senden:',
    MP_PASTE_HINT: 'Code hier einfügen…',

    // MP HUD
    CRASH_REMOTE_HELI: 'KOLLISION MIT MITSPIELER',

    NEXT: 'Weiter',
    BACK: '◀ ZURÜCK',
    RETRY: 'WIEDERHOLEN',
    RETURN_TO_BASE: 'ZURÜCK ZUR BASIS',

    // Campaign select
    CAMPAIGN_SELECT_TITLE: 'KAMPAGNE WÄHLEN',
    CAMPAIGN_SELECT_SUB: 'EINSATZGEBIET',

    // Heli select
    HELI_SELECT_TITLE: 'HANGAR',
    HELI_SELECT_SUB: 'LUFTFAHRZEUG WÄHLEN',

    // Mission result screens
    TERMINATED: 'TERMINATED',
    MISSION_COMPLETE: 'MISSION COMPLETE',
    OBJECTIVES_CLEARED: 'ALL OBJECTIVES CLEARED',
    CAMPAIGN_COMPLETE: 'CAMPAIGN COMPLETE',
    ALL_MISSIONS_CLEARED: 'ALL MISSIONS CLEARED',
    CAMPAIGN_FAILED: 'CAMPAIGN FAILED',
    MISSION_ABORTED: 'MISSION ABORTED',

    CLICK_TO_DEPLOY: 'KLICKEN ZUM EINSATZ',

    PILOT_ADDRESS: (rank: string, callsign: string) => (callsign ? `${rank} ${callsign}` : rank),
    BRIEFING_ADDRESS: (rank: string, callsign: string) =>
        callsign ? `Ihre Mission, ${rank} ${callsign}` : `Ihre Mission`,

    SAVE_CODE_INVALID: 'UNGÜLTIGER CODE',
    SAVE_CODE_LOADED: 'SPIELSTAND GELADEN',
    NO_SAVE_STATE: '  |  KEIN SPEICHERSTAND',
    STATS: (c: number, m: number) => `KAMPAGNEN: ${c}  |  MISSIONEN: ${m}`,
    CAMPAIGN_LOCKED: '[ GESPERRT ]',

    DELETE_SESSION: 'SPIELSTAND LÖSCHEN',
    DELETE_CONFIRM: 'WIRKLICH LÖSCHEN?',
    SESSION_DELETED: 'GELÖSCHT – SEITE WIRD NEU GELADEN…',

    CRASH_WATER: 'WASSERAUFPRALL',
    CRASH_BAD_ZONE: 'FALSCHES LANDEZIEL',
    CRASH_TOO_FAST: 'ZU SCHNELL',
    CRASH_HARD_IMPACT: 'HARTER AUFPRALL',
    CRASH_CARRIER_TOWER: 'TRÄGERTURM-KOLLISION',
    CRASH_PARKED_HELI: 'KOLLISION MIT ABGESTELLTEM HELI',
    CRASH_HANGAR: 'HANGAR-KOLLISION',
    CRASH_FUEL_TRUCK: 'KOLLISION MIT TANKWAGEN',
    CRASH_LIGHTHOUSE: 'LEUCHTTURM-KOLLISION',
    CRASH_BOAT: 'KOLLISION MIT BOOT',
    CRASH_TREE: 'BAUMKONTAKT',

    WHATS_NEW_VERSION: 'v25.0',
    WHATS_NEW_TITLE: 'Multiplayer',
    WHATS_NEW_HINT: 'KLICKEN ZUM FORTFAHREN',
    WHATS_NEW_ITEMS: [
        'Koop-Multiplayer für 2 Piloten — über den Menüpunkt MULTIPLAYER',
        'Verbindungsaufbau per Copy & Paste — kein Server, kein Account nötig',
        'Beide Piloten wählen ihren Heli selbst (Überraschung!)',
        'Absturz? Respawn am Startplatz — der Einsatz läuft weiter',
        'Hinweis: Für den Verbindungsaufbau werden Google STUN-Server genutzt',
    ],

    PILOT_HEADING: 'PROFIL',
    PILOT_CALLSIGN: 'RUFZEICHEN (MAX. 8 ZEICHEN, A–Z)',
    PILOT_SAVECODE: 'SAVE CODE',
    PILOT_IMPORT: 'CODE IMPORTIEREN (ÜBERSCHREIBT SPIELSTAND)',
    PILOT_IMPORTLOAD: 'LADEN',
    CONTROLS_HEADING: 'STEUERUNG',
    CONTROLS_SIMPLIFIED: 'VEREINFACHT',
    CONTROLS_SIMPLIFIED_DETAILS: 'Rechter Stick dreht und beschleunigt relativ zum Heli.',
    CONTROLS_PROFESSIONAL: 'PROFI',
    CONTROLS_PROFESSIONAL_DETAILS: 'Rechter Stick: oben = vorwärts, unabhängig von Ausrichtung.',

    MADE_WITH: 'MADE WITH \u2665 IN JAVASCRIPT',
    COPYRIGHT: '\u00a9 2026 i.thie softworks \u2014 Alle Rechte vorbehalten.',

    CREDITS_ROLE_DEVELOPMENT: 'SPIELDESIGN & ENTWICKLUNG',
    CREDITS_ROLE_CAMPAIGN: 'KAMPAGNEN-DESIGN',
    CREDITS_ROLE_SOUND: 'SOUND & MUSIK',
    CREDITS_ROLE_TEST: 'TESTER',
    CREDITS_ROLE_INSPIREDBY: 'INSPIRIERT VON',
} as const;
