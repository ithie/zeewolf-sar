# Session System

ZEEWOLF: SAR optionally saves player progress locally in the browser (localStorage). This document describes the architecture, data model, save code format, and privacy aspects.

---

## Overview

The session system consists of three parts:

| Component             | File                  | Responsibility                               |
| --------------------- | --------------------- | -------------------------------------------- |
| Data model & encoding | `src/game/session.ts` | Load, save, rank, save code                  |
| UI integration        | `src/game/game.ts`    | Settings screen, cookie banner, rank overlay |
| Strings               | `src/game/i18n.ts`    | All player-facing text                       |

---

## Data Model (`PlayerSession`)

```typescript
interface PlayerSession {
    cookieConsent: boolean | null; // null = not yet decided
    playerName: string; // callsign, max. 8 chars, A–Z
    campaignsDone: number; // campaigns completed (excl. Tutorial)
    missionsDone: number; // missions completed (excl. Tutorial)
    unlockedCampaignIndices: number[]; // indices of unlocked campaigns
    allUnlocked: boolean; // UNLOCK easter egg activated
}
```

Stored under the key `zeewolf_session` in `localStorage`. Only written when `cookieConsent === true`.

---

## Ranks

| Rank         | Insignia | Condition                 |
| ------------ | -------- | ------------------------- |
| Leutnant     | ★        | Start                     |
| Oberleutnant | ★ ★      | 1 campaign + 3 missions   |
| Hauptmann    | ★ ★ ★    | 2 campaigns + 8 missions  |
| Major        | ◆        | 3 campaigns + 15 missions |

- The Tutorial does **not** count toward rank progression.
- Replaying a campaign or mission counts each time.
- A promotion overlay is shown when the rank increases.

---

## Campaign Unlocking

- The Tutorial is always unlocked.
- Completing a campaign unlocks the next one (sequential).
- Locked campaigns are greyed out in the campaign menu.
- Easter egg `UNLOCK`: type anywhere in the game → all campaigns unlocked immediately.

---

## Save Code

Player progress can be exported as a compact 9-character code and imported on another device.

### Format

```bash
XXXXX-XXXX
```

5 characters – hyphen – 4 characters. Displayed in uppercase, input is case-insensitive.

### Encoding (45 bits → 9 × Base32 characters)

| Bits | Content                   | Range                            |
| ---- | ------------------------- | -------------------------------- |
| 0–1  | Rank index                | 0–3                              |
| 2–4  | Highest unlocked campaign | 0–7                              |
| 5–44 | Callsign (8 × 5 bits)     | A–Z = 0–25, null terminator = 26 |

**Alphabet:** Standard Base32 (RFC 4648): `ABCDEFGHIJKLMNOPQRSTUVWXYZ234567`

Each character encodes 5 bits. 45 bits ÷ 5 = exactly 9 characters, no padding required.

The callsign is stored character by character as a 5-bit value (A=0 … Z=25). Callsigns shorter than 8 characters are terminated with the null value (26); remaining slots are zero-padded.

### On Import

- Invalid codes (wrong length, invalid characters) are rejected with an error message.
- Valid codes **overwrite** the entire existing save state.
- `campaignsDone` and `missionsDone` are set to the minimum values for the decoded rank.
- Cookie consent is preserved; if consent is active, the imported state is saved immediately.

---

## Cookie Banner & Privacy

A consent banner is shown on first visit, in accordance with Art. 6(1)(a) GDPR.

| Choice  | Effect                                            |
| ------- | ------------------------------------------------- |
| Accept  | Save state is persisted in `localStorage`         |
| Decline | Game fully playable, but no persistent save state |

Consent can be revoked at any time by clearing browser storage (`localStorage.clear()`). **No data is transmitted to any server or shared with third parties.**

> **Note:** This documentation describes the technical implementation and does not constitute legal advice. For a production deployment with real user data, review by a data protection officer is recommended.

---

## API (`session.ts`)

```typescript
loadSession(): PlayerSession
// Loads session from localStorage; returns defaults if nothing is stored.

saveSession(s: PlayerSession): void
// Persists session — only if cookieConsent === true.

getRank(s: PlayerSession): Rank
// Returns the current rank.

isCampaignUnlocked(s: PlayerSession, index: number): boolean
// Returns whether a campaign at the given index is unlocked.

encodeSession(s: PlayerSession): string
// Generates the 9-character save code (format: XXXXX-XXXX).

decodeSession(input: string): Partial<PlayerSession> | null
// Decodes a save code. Returns null for invalid input.
```
