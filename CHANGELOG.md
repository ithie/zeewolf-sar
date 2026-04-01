# Changelog

## v23.2 — Data Deletion

### New

- **Delete save state**: Settings screen now includes a "SPIELSTAND LÖSCHEN" button with a two-step confirmation; deletes all localStorage data and reloads the page
- **Revoke & delete in cookie banner**: Cookie banner now includes a "WIDERRUFEN & LÖSCHEN" button for explicit, direct withdrawal of consent and deletion of stored data — no longer requires navigating browser settings
- Cookie banner withdrawal text updated to reference the in-app button instead of browser storage

### Technical

- New i18n strings: `DELETE_SESSION`, `DELETE_CONFIRM`, `SESSION_DELETED`
- `deleteSessionData()` / `confirmDeleteSession()` exposed on `window`
- Full TypeScript compliance: all ~210 previously unreported type errors resolved (implicit `any` parameters, DOM null assertions, CSS string types, missing `Mission` interface fields)

---

## v23.1 — Privacy Fixes

### Fixes

- **Cookie consent**: declining now clears localStorage immediately
- **Consent expiry**: banner re-appears after 2 weeks (TTL stored as timestamp)
- **Cookie banner**: no longer click-through; responsive on small screens
- **Tutorial unlock**: completing the tutorial now correctly unlocks the next campaign
- Party mode now resets correctly on all mission-end paths (was missing failure/abort)

---

## v23 — Party & Progression

### New

#### Session System

- **Cookie consent banner** (GDPR-compliant) on first visit
- Persistent save state via `localStorage` (rank, callsign, progress)
- **Military ranks** (German Air Force): Leutnant → Oberleutnant → Hauptmann → Major
- Promotion overlay when rank increases
- Campaigns unlock sequentially; Tutorial is always available
- **Settings** screen in the main menu: callsign (max. 8 chars, A–Z) + rank display

#### Save Code

- 9-character code (`XXXXX-XXXX`) for cross-device save transfer
- Base32 encoding (RFC 4648), case-insensitive, no backend required
- Contains: rank, highest unlocked campaign, callsign
- Importing via the Settings screen overwrites the existing save state

#### Easter Eggs

- **PARTY**: Type in-game → Party mode (disco tiles, confetti, disco ball, John Travolta rescuer, BeeGees-inspired song)
- **UNLOCK**: Type anywhere → all campaigns unlocked immediately

#### Party Mode (details)

- Tiles flash in random colours, each tile independently
- Confetti particles from rotors and trees (wind-affected)
- Rotating disco ball
- Rescuer wears a white suit (John Travolta / Night Fever)
- Trees and bushes flash in random greens, colour waves upward per height layer
- Helipad stays grey
- Custom music: _Stayin' Alive_-inspired ZSynth track
- Resets on mission end (success or failure)

#### Bo-105 Model

- New model available as a preset in the Model Editor
- All models from the `models/` directory added as Model Editor presets

### Fixes

- **Ground sliding**: helicopter no longer drifts after landing
- **Cargo physics**: excessive pendulum drag at low framerates (dt scaling) corrected
- Party mode now correctly resets on mission failure / abort as well

### Technical

- All player-facing UI strings centralised in `src/game/i18n.ts`
- New module `src/game/session.ts` for session logic and save code encoding
- Global window type declarations in `src/game/window.d.ts`
- App version injected from `package.json` via Vite `define`; splash screen reads version dynamically
- Documentation: [`docs/SESSION_SYSTEM.md`](./docs/SESSION_SYSTEM.md)
