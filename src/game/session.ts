export const STORAGE_KEY = 'zeewolf_session';

export const CONSENT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

/** Bump this whenever the privacy notice changes — forces the banner to re-appear. */
export const CONSENT_VERSION = 'v25.0';

export interface PlayerSession {
    cookieConsent: boolean | null;
    consentTimestamp: number | null;  // Date.now() at time of consent
    consentVersion: string;           // version of the notice the user last accepted
    playerName: string;
    campaignsDone: number;
    missionsDone: number;
    unlockedCampaignIndices: number[];
    allUnlocked: boolean;
    lastSeenVersion: string;
}

export interface Rank {
    name: string;
    pips: string;
    minCampaigns: number;
    minMissions: number;
}

export const RANKS: Rank[] = [
    { name: 'Leutnant',     pips: '★',     minCampaigns: 0, minMissions: 0  },
    { name: 'Oberleutnant', pips: '★  ★',  minCampaigns: 1, minMissions: 3  },
    { name: 'Hauptmann',    pips: '★ ★ ★', minCampaigns: 2, minMissions: 8  },
    { name: 'Major',        pips: '◆',     minCampaigns: 3, minMissions: 15 },
];

export const isConsentExpired = (s: PlayerSession): boolean =>
    s.cookieConsent !== null &&
    (s.consentTimestamp === null || Date.now() - s.consentTimestamp > CONSENT_TTL_MS);

/** True when the stored consent was for an older privacy notice version. */
export const isConsentOutdated = (s: PlayerSession): boolean =>
    s.cookieConsent !== null && s.consentVersion !== CONSENT_VERSION;

const _default = (): PlayerSession => ({
    cookieConsent: null,
    consentTimestamp: null,
    consentVersion: '',
    playerName: '',
    campaignsDone: 0,
    missionsDone: 0,
    unlockedCampaignIndices: [0],
    allUnlocked: false,
    lastSeenVersion: '',
});

export const loadSession = (): PlayerSession => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return _default();
        return { ..._default(), ...JSON.parse(raw) };
    } catch {
        return _default();
    }
};

export const saveSession = (s: PlayerSession): void => {
    if (!s.cookieConsent) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
};

export const getRank = (s: PlayerSession): Rank => {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (s.campaignsDone >= RANKS[i].minCampaigns && s.missionsDone >= RANKS[i].minMissions) {
            return RANKS[i];
        }
    }
    return RANKS[0];
};

export const isCampaignUnlocked = (s: PlayerSession, index: number): boolean =>
    s.allUnlocked || s.unlockedCampaignIndices.includes(index);

// ─── Save Code (9-char Base32) ────────────────────────────────────────────────
// Bit layout (45 bits → 9 × 5-bit Base32 chars):
//   [0-1]  rankIndex            (2 bits, 0-3)
//   [2-4]  highestUnlocked      (3 bits, 0-7 = highest non-tutorial campaign index)
//   [5-44] callsign             (8 × 5 bits: A-Z = 0-25, null = 26, pad = 0)
//
// Alphabet: standard Base32 (RFC 4648) A-Z 2-7, case-insensitive.
// Display format: XXXXX-XXXX

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const encodeSession = (s: PlayerSession): string => {
    const rankIdx = RANKS.indexOf(getRank(s));
    const highest = s.allUnlocked ? 7 : Math.max(...s.unlockedCampaignIndices, 0);
    const callsign = (s.playerName || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);

    const bits: number[] = [];
    const push = (val: number, n: number) => {
        for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };

    push(rankIdx, 2);
    push(Math.min(highest, 7), 3);
    for (let i = 0; i < 8; i++) {
        push(i < callsign.length ? callsign.charCodeAt(i) - 65 : 26, 5);
    }

    let code = '';
    for (let i = 0; i < 9; i++) {
        const val = bits.slice(i * 5, i * 5 + 5).reduce((a, b) => (a << 1) | b, 0);
        code += B32[val];
    }
    return code.slice(0, 5) + '-' + code.slice(5);
};

export const decodeSession = (input: string): Partial<PlayerSession> | null => {
    const clean = input.toUpperCase().replace(/[^A-Z234567]/g, '');
    if (clean.length !== 9) return null;

    const bits: number[] = [];
    for (const ch of clean) {
        const v = B32.indexOf(ch);
        if (v < 0) return null;
        for (let i = 4; i >= 0; i--) bits.push((v >> i) & 1);
    }
    const read = (start: number, n: number) =>
        bits.slice(start, start + n).reduce((a, b) => (a << 1) | b, 0);

    const rankIdx    = Math.min(read(0, 2), RANKS.length - 1);
    const highest    = read(2, 3);

    let callsign = '';
    for (let i = 0; i < 8; i++) {
        const v = read(5 + i * 5, 5);
        if (v === 26) break;
        if (v < 26) callsign += String.fromCharCode(65 + v);
    }

    const rank = RANKS[rankIdx];
    const unlocked: number[] = [];
    for (let i = 0; i <= highest; i++) unlocked.push(i);

    return {
        playerName: callsign,
        rankIdx,
        campaignsDone: rank.minCampaigns,
        missionsDone:  rank.minMissions,
        unlockedCampaignIndices: unlocked,
        allUnlocked: false,
    } as Partial<PlayerSession> & { rankIdx: number };
};
