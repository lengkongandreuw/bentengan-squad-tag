# Bentengan Squad Tag — Review Plan

**Date:** 2026-09-29 · **Language:** English · **Scope:** findings only, no Codex task table.
**Guide:** `BENTENG-REFACTOR-PLAN.md` (§§1–19, read in full). **Doc only — this plan changed no code.**
**Pinned commit:** `673ef2a4` ("Add character carousel positioning and responsive styles"). All `file:line` refs below hold at this commit. Symbols anchor each site because lines shift (the file grew 7,667 → 7,741 lines during review).

## Method

- Navigation starts from the graphify knowledge graph (`graphify-out/graph.json`: 1,172 nodes, 1,728 edges, plus `GRAPH_REPORT.md`). Use `graphify query "<question>"` for per-finding deep dives.
- Corroborate every graph claim with grep before acting on it. The graph misses references built from dynamic paths (see Appendix A). Graph first, grep to corroborate.
- Each finding cites a verified `file:line` plus the anchoring symbol. I measured the counts below. I did not estimate them.
- Severity: **High** (gameplay-correctness or architecture-blocking) / **Medium** (boundary hardening, decoupled safely later) / **Low** (hygiene, batch later).
- Effort basis: **S** = at most 3 files, one domain, no behavior risk. **M** = multi-site, one domain, needs in-match verify. **L** = cross-phase or over 1,000 lines moved. Each finding states its exit criterion.

## Plan-vs-reality corrections

The refactor plan is directionally right, but these claims must be fixed before work starts:

| # | Refactor plan says (§) | Verified reality | Consequence |
|---|---|---|---|
| C1 | Set up ESLint + Prettier (§§10.8, 12 Phase 0, 15) | Repo uses **oxlint** (`npm run lint`) and **oxfmt** (`npm run format`, single-quote, width 80). Typecheck uses `npx tsc --noEmit`. The repo has no `tsc` script | Do NOT add ESLint/Prettier. Configure oxlint/oxfmt only |
| C2 | "Character logic hardcoded, e.g. `if (character === "raja")` everywhere" (§2.2) | `lib/characters.ts` (436 lines) already holds a `CharacterDefinition` data table (speed, boost, tagRange, rescueRange, cooldowns…) for all 14 characters. The 33 hardcoded `characterId === 'kaka'/'raja'/'jago'` branches are **all in `app/prototype.tsx`**. About 20 are ultimate *presentation* (icons/labels/CSS/aria, L6446–7589, plus banner preload at L3102–3111). The rest cluster at L4561–4599, L5353–5408, L5636–5639, L5945–5949. Only 1 such branch exists in `lib/` (`character-animation.js:85`) | Module 05 work is narrower than planned: split stats from presentation and add an optional `ultimate` descriptor, don't build data-driven characters from zero |
| C3 | Tests run in CI per commit (§§11.4, 15, 16) | No test framework, no CI test job. Quality gates are `node:test` scripts (`test:character-admin`, `audit-game.mjs`, `test-series-sprites.mjs`, `test-kampung3d.mjs`) and `npm run audit`. Pages CI only runs `npm run build:pages` | Each finding's validation below uses the AGENTS.md verification budget, not a hypothetical CI suite. S1 adds the missing gates |
| C4 | Storage "localStorage only, everywhere" (§2.2) | Exactly **2 runtime touchpoints**: `app/prototype.tsx:2993–3004` (music-mute flag) and `lib/audio-settings.ts:12–20` | Storage work is a Small local wrapper, not a backend-swap project. No second backend exists, so the plan must not justify the work with hypothetical ones |
| C5 | `tsc --noEmit` as a quality gate (implied §15) | `tsconfig.json` sets `allowJs: true` with **no `checkJs`**. The checker silently skips every `.js` file under refactor (`tag-contact`, `team-combo`, `click-navigation`, `collision-navigation`) | Enable `checkJs` (S1) or the flagship gate does not cover the files the refactor moves |
| C6 | CI described as running tests (§§11.4, 16) | `.github/workflows/pages.yml` runs only `npm ci` → `npm run build:pages`. No lint, no typecheck, no audit | S1 adds the three commands to the build job |

---

## S1 — Safety net (precondition for F1–F7) [High]

No extraction starts until these three land. Effort: S. Risk: Low.

1. **Characterization tests before extraction.** Pure logic modules get pinned `node:test` suites first: `tag-contact.js` (12-line pure function `sweptContactDistance`), `team-combo.js` (33-line pure state machine: `ignored`/`started`/`duo`/`surge`), then `collision-navigation.js` and `click-navigation.js`. Rule: no seam moves without a pinned test for its current behavior.
2. **Enable `checkJs`.** One-line `tsconfig.json` change plus a fix-or-suppress pass over the newly covered `.js` files. Without it, F3/F7 move unchecked code.
3. **CI gates.** Append `npm run lint`, `npx tsc --noEmit`, `npm run audit` to the `build` job in `.github/workflows/pages.yml`, before `npm run build:pages`.

**Exit criterion:** green CI on `main` with the three gates passing. **Validation:** the CI run itself.

---

## F0 — Folder condition: before [Medium]

**Status: pre-Phase-0.** The §6.1 target layout does not exist: no `modules/`, no `tools/`, no `dev/`. Demoted from High: misplaced folders slow separation but block nothing by themselves.

```text
bentengan-squad-tag/
├── app/                  # entry + 7,741-line god file (game, UI, workshop mounting)
├── components/           # game UI MIXED with workshop UI + 60 shadcn files in ui/
│   ├── character-workshop.tsx   # tool code shipped in the game bundle
│   └── ui/               # 60 shadcn primitives (leave alone)
├── hooks/                # single use-mobile.ts
├── lib/                  # generic helpers MIXED with game systems
│                         # (gameplay-audio, kampung-3d, tag-contact, team-combo,
│                         #  field-cycle, characters-data all live here)
├── scripts/              # 12 builders + audit/test scripts + character-admin/ server
├── config/               # game-rules + baselines, no per-map/per-character split
├── asset-inbox/ Assets/ field-sources/ sprite-sources/ vfx-sources/
│                         # 5 parallel asset-source trees, no README saying what goes where
├── public/               # runtime assets (OK as-is)
└── (missing) modules/ tools/ dev/
```

Three placement violations:

1. **Workshop UI ships in the game bundle** — `app/prototype.tsx:31` imports `CharacterWorkshop` from `../components/character-workshop` and renders it at `:6269`. Breaks plan rule 5 (tools must be removable from the production build).
2. **Game systems live in `lib/`** — breaks the plan's own lib-purity rule (`lib/` = generic helpers, never game rules).
3. **The local admin server lives under `scripts/`** (`scripts/character-admin/`: `server.mjs`, `editor.js`, `editor.css`, `test.mjs`) instead of a tools tree.

### Option A (recommended) — minimal moves, rules first, folders follow

Apply only after the team answers Q1. If the workshop stays reachable in-game, it becomes `modules/ui/` (a screen), not `tools/`:

```text
├── app/                  # entry only; prototype.tsx shrinks via F1 extractions
├── components/           # game UI only (workshop file moved out)
├── lib/                  # generic helpers only (game systems move to modules/)
├── modules/              # created incrementally: storage/ → audio/ → characters/ → world/ …
├── tools/
│   ├── character-workshop/   # from components/character-workshop.tsx (only if dev-only per Q1)
│   └── character-admin/      # from scripts/character-admin/
├── config/               # + maps/*.json, characters/*.json as phase work lands
├── dev/                  # debug widgets / sandboxes (excluded from prod build)
└── scripts/ public/ asset-source trees…  # untouched for now
```

### Option B — full §6.1 restructure up front

Create all 11 `modules/` + 6 `tools/` skeletons and move files in one pass.

**Reason for A:** matches the plan's own Phase-4-last principle (§§11–12) and the no-big-bang rule (§11.1). Folders created empty invite speculative code, and moving 7,741 lines at once maximizes merge pain. Asset-source trees (`Assets/`, `sprite-sources/`, …) stay put until the team modularizes their builders. Moving sources without moving the `scripts/build-*.mjs` consumers breaks every pipeline path at once.

**Open question Q1 (blocks this finding):** `CharacterWorkshop` is user-facing inside the game today. If it stays reachable in-game, it is `modules/ui/` (a screen), not a tool — but its data path must still be decoupled. If it becomes dev-only, it moves to `tools/` and leaves the bundle. Recommendation: keep reachable, treat as UI screen. **Effort:** S (moves only). **Risk:** Low, mechanical. **Exit criterion:** the chosen home exists and the other home does not. **Validation:** `npx tsc --noEmit` + `npm run build:pages`.

---

## F1 — God file `app/prototype.tsx` (7,741 lines) [High]

**Location:** `app/prototype.tsx:1–7741` (symbol `BentenganPrototype`). Graphify gives the symbol 29 edges. Graphify reaches 304 nodes within 2 hops (game loop, rendering, audio, UI, assets, config).

**Effect enclosure (measured at `673ef2a`):** one `useEffect` opens at `:3247` and closes at `:6027`. It wraps 2,780 lines of match runtime. Its deps are `mode`, `run`, `selected`, `selectedFaction`, `selectedFieldId`, `selectedId`. React state sits outside it at `:2765–2798`.

**Function inventory (measured):** 25 top-level function definitions. 115 function-shaped `const x = (` lines sit at indent 2 or 4.

| Lines | Region | Size |
|---|---|---|
| 1–403 | Header and imports | 403 |
| 404–2578 | Map data and constants | 2,175 |
| 2579–3403 | Helpers, preview, and loading | 825 |
| 3404–4460 | Component head, state, and effect setup | 1,057 |
| 4461–4875 | `update` tick | 415 |
| 4876–5719 | Draw layers | 844 |
| 5720–6027 | `draw`, `loop`, and effect close | 308 |
| 6028–6445 | Handlers, effects, and keys | 418 |
| 6446–7741 | JSX and ultimate UI | 1,296 |

**State inventory (measured: 24 `useState` + 8 `useRef` = 32 hooks):**

- Selection: `selectedFaction`, `selectedId`, `selectedFieldId`, `readyFaction`, `hoveredFaction`.
- Flow: `mode`, `menuStep`, `view`, `run`.
- Match snapshot: `snapshot`, `setSnapshot`.
- HUD overlays: `rulesOpen`, `creditsOpen`, `missionOpen`, `leaderboardOpen`, `ultimateBannerVisible`.
- Audio, loading, camera: `audioUnlocked`, `musicMuted`, `gameLoading`, `loadAttempt`, `loadProgress`, `loadError`, `rendererError`, `landingArena`, `cameraMode`.
- Refs: `canvasRef`, `keys`, `characterVoiceRef`, `characterVoiceIdRef`, `cameraModeRef`, `completedMatchesRef`, `leaderboardOpenRef`, `postRoundActionRef`.

**Shared-state read/write matrix (match core, measured).** Two state worlds exist. React state lives outside the effect. Closure `let` state lives inside it. One bridge joins them.

*Block A — React state outside the effect:*

| State | Writers | Readers | Seam |
|---|---|---|---|
| `snapshot` | `:5889` at 10 Hz plus resets `:6043`, `:6054`, `:6080`, `:6089`, `:6102` | 101 refs. 95 in JSX `:6500–7741` and 6 at `:6030–6036` | P3 |
| `mode` | `:2894`, `:6045`, `:6055`, `:6090` | Deps `:6027`, `:6197` | Shell |
| `run` | `:2895`, `:6063`, `:6082`, `:6095`, `:6107`, `:7562` | Remount dep `:6027` | Shell |
| `view` | `:6269`, `:6644` | `:6132` and dep `:6197`. Camera `view` at `:3317` shadows it | Shell |

*Block B — closure `let` inside the effect `:3247–6027`:*

| State | Writers | Refs | Note |
|---|---|---|---|
| `players` | `:3496`, `:3702` | 59 | Rebuilt per match |
| `score` | `:3736` (`score[team]++`) | 12 | |
| `timer` | `:3260`, `:3709`, `:4526` | 9 | |
| `phase` | `:3728`, `:3739`, `:4471` | 22 | Match state machine |
| `round` | `:4486` (`round++`) | 67 | |
| `mission` | 7 in-place writes `:4186`, `:4238`, `:4343`, `:4370`, `:4681`, `:4716`, `:4838`. No reassign | 25 | Hardest seam |
| `teamCombos` | `:3284`, `:3722`, `:4146` | 9 | |
| `ultimateMeter` | `:3309`, `:3638`, `:4546`, `:4564` | 28 | |
| `paused` | `:3264`, `:3342`, `:4464`, `:5759` | 14 | |
| `logs` | `:3269`, `:3633` | 6 | |
| `matchEvents` | `:3524`, `:3527`, `:3704`, `:3741` | 14 | |
| `refills` | `:3695`, `:4359`, `:4532` | 11 | |

**Snapshot cadence (measured).** `setSnapshot` has 7 sites. One declares state at `:2777`. One writes at `:5889` inside `loop`. Five reset to `initialSnapshot`. The guard `if (now - lastHud > 100)` at `:5865` limits the write to about 10 per second in a match. Each call rebuilds a 90 line object. P3 keeps that contract. The guard stays with P5.

The remainder after the easy seams is match-state management, the game-loop tick, canvas rendering, and input handling. The Phase 4 table below plans each part.

**Current state (sketch):** one file holds match state, game loop, canvas rendering, input (keyboard/mouse/touch), audio triggering, HUD/selection JSX, workshop mounting, and persistence calls.

```tsx
// app/prototype.tsx — today (illustrative compression of verified sites)
import { GameplayAudio } from '../lib/gameplay-audio';          // :38
import { CharacterWorkshop } from '../components/character-workshop'; // :31
const gameplayAudio = new GameplayAudio();                       // :3401
gameplayAudio.play('rescue', 0.38);                              // :3572 (inside rescue logic)
window.localStorage.setItem(MUSIC_MUTED_STORAGE_KEY, …);         // :2993 (inside UI handler)
```

### Option A (recommended) — seam-by-seam extraction, core runtime last

Each seam carries its own phase and exit gate. S1 gates everything.

- Phase 1: F4 storage → F5 audio port. Exit: no `localStorage` and no `gameplayAudio.play` in `prototype.tsx`.
- Phase 2: F2 ultimate presentation + F3 data flags. Exit: zero `characterId ===` branches in `prototype.tsx`.
- Phase 4: the seven parts below, in order. Exit: `prototype.tsx` holds composition and wiring only (target: under 500 lines).

#### Phase 4 per-part plan (measured anchors at `673ef2a`)

P0 sits outside the effect. P1 through P5 live inside it. P6 straddles the boundary at `:3247`. The exit target for P1 to P5 is a `startMatch()` and `stopMatch()` pair, not a scatter of relocated functions.

| Part | Site (symbol-anchored) | Size | Move target | Order | Exit criterion |
|---|---|---|---|---|---|
| P0 map data | Region `:404–2578`. `BASES` `:407`, `KAMPUNG_OPEN_ARENA` `:1658`, obstacle and collider arrays `:1962–2468`, `FIELD_BY_ID` `:2516` | ~2,175 lines | `modules/world/map-data/` as JSON and typed loaders | Zero, before P1. Pure data needs no characterization test | No map literal remains in `prototype.tsx` |
| P1 tick systems | `update(dt, now)` `:4461`. Inline tag, prison, rescue, base, and river logic | ~415 lines | `modules/gameplay/` systems, one per change | First. Each needs an S1 `node:test` | `update()` only sequences named systems. It holds no rules |
| P2 render layers | `drawStaticMap` `:4978`, `drawSceneryLayer` `:5040`, `drawMap` `:5147`, `drawPlayer` `:5339`, `drawPrisonOverlays` `:5267`, `drawBase` `:5283`, `drawRefill` `:5308`, composed by `draw(now)` `:5720` | ~850 lines | `modules/world/render/` per layer. Each takes `(ctx, snapshot, …)` explicitly, no closure reads | Second (functions already take explicit args — lowest coupling) | No `draw*` definitions in `prototype.tsx` |
| P3 match snapshot + state | `snapshot`/`setSnapshot` plus match setup around `:3400–3780` (symbol `BentenganPrototype`) | ~400 lines | `modules/game-core/match-state.ts` (init, transitions, snapshot builder) | Third. P1/P2 consumers are already out, so the team knows the served shape. | Snapshot has one constructor. No ad-hoc mutation sites remain in `prototype.tsx` |
| P4 input | Handlers at `:3186–3247`, `:6003`, `:6195` | ~150 lines | Input abstraction emitting intents. Gameplay and AI both consume them (plan rule 9) | Fourth. P1 systems must receive intents first | No raw `keydown`/`pointerdown` gameplay logic remains in `prototype.tsx` |
| P5 loop driver | `loop(now)` `:5860`, rAF setup `:5979–6008`, teardown `:6010–6130` | ~270 lines | Stays last. Becomes `startLoop`/`stopLoop` in `modules/game-core/` | Last (owns rAF plus teardown of everything above) | `prototype.tsx` renders screens and mounts the loop, nothing else |
| P6 loading preamble | Preload + loading UI at `:2648–3400` | ~750 lines | `modules/ui/loading/` plus the `lib/asset-ready.ts` contract | With P2. Asset-driven, feeds render | Loading is a screen with progress events. No inline preamble |

The file shrinks over time. No rewrite.

### Option B — split by screen/function in one pass

Carve `prototype.tsx` into `match/`, `hud/`, `screens/` files immediately.

**Reason for A:** shared mutable match state couples the file's sections. A one-pass split preserves that coupling under new filenames. It also breaks every line reference the team relies on (audit script, CHECKPOINT, memori). Seam extraction (A) converts coupling to contracts first. Each move stays verifiable. **Module:** 01/02/11. **Phase:** 1 → 2 → 4 per seam above. **Effort:** L. **Risk:** High if rushed — one seam at a time. **Exit criterion:** the Phase 4 target above. **Validation per seam:** `npx tsc --noEmit` + `npm run audit` + `npm run build:pages`.

---

## F2 — Ultimate presentation branches (~20 sites) [Medium]

Demoted from High: presentation-only, zero gameplay risk.

**Locations:** `app/prototype.tsx:6446–7589` (symbol-adjacent: ultimate HUD/selection JSX) plus banner preload effect at `:3102–3111` (guard `ULTIMATE_CHARACTER_IDS.has`, `:3103`). Sample verified:

```tsx
{selectedId === 'kaka' ? <Shield size={12} /> : <Zap size={12} />}            // :7294
{selectedId === 'kaka' ? 'PERISAI' : 'TITAH'}                                 // :7295
{selectedId === 'kaka' ? 'Perisai Hijau' : 'Titah Halilintar'}                 // :7442
```

`CharacterDefinition` (`lib/characters.ts:26–45`) has stats but **no `ultimate` descriptor**. Every new ultimate character would add about 20 more branches. Latent trap (not a live bug): `ULTIMATE_CHARACTER_IDS.has(...)` guards every site (set is exactly `{'raja','kaka'}`, `:359`, 16 guard sites), so nothing misrenders today. But each `kaka ? A : B` else-branch silently means "raja". A third ultimate character inherits raja's UI with no error.

### Option A (recommended) — split stats from presentation, optional ultimate

```ts
// config/characters/kaka.json — JSON-safe stats only (Phase 2)
{ "id": "kaka", "boostPower": 1050, "mirrorSide": "none",
  "ultimate": { "name": "Perisai Hijau", "buffText": "KEBAL TAG · ",
                "icon": "shield", "hudClass": "kaka-shield", "banner": "kaka-ultimate-banner" } }
// lib/character-presentation.ts — code-side registry, NOT JSON (icons, image loaders)
presentation[kaka] = { iconComponent: Shield, imageLoader: getKakaUltimateImage, … };
// UI renders selected.ultimate.* — zero branches; characters without ultimates omit the key
```

### Option B — `UltimatePresenter` component with a per-character switch

Centralizes but preserves code-per-character. A third ultimate reopens the file.

**Reason for A:** function references (`getKakaUltimateImage`) and icon components cannot live in `config/*.json`, while tunables should not live in code. The split honors both constraints. Only 2 of 14 characters have ultimates, so the descriptor stays small and optional. Covers F3-adjacent UI sites (L7290–7590) in one move. **Module:** 05. **Phase:** 2. **Effort:** M. **Risk:** Low. Presentation only. Meter and trigger logic stay untouched. **Exit criterion:** zero `characterId ===` branches in `prototype.tsx`. **Validation:** `npx tsc --noEmit` + `npm run build:pages` + manual ultimate cast per character.

---

## F3 — Gameplay character branches (mirror, shield colors, ranges) [High]

Promoted from Medium: gameplay reads character identity directly — this is the coupling Module 05 exists to remove.

**Locations:** `app/prototype.tsx:4561–4599` (kaka boost `1050 : 820` at :4576), `:5353–5408` (`mirror = … 'raja' || … 'jago'` at :5408), `:5636–5639` (kaka shield fill colors), `:5945–5949`. Also affected: `lib/character-animation.js:85` (`id === 'jago'`).

### Option A (recommended) — data flags on the stats side (see F2 split)

```ts
mirrorSide: 'left' | 'right' | 'none';   // replaces :5408
shieldFill / shieldEdge: string;         // replaces :5636-5639
boostPower: number;                      // replaces 1050 : 820 at :4576
```

### Option B — strategy map (`ULTIMATE_BEHAVIOR[kaka] = {...}`) in a new module file

Works, but it adds a second source of character truth next to the table. The copies drift apart.

**Reason for A:** one table is already the source of truth (C2). A second registry guarantees drift. **Module:** 05 (data) feeding 02 (gameplay reads `character.boostPower`). **Phase:** 2. **Effort:** M. **Risk:** Medium — these sites affect hit and mirror feel. S1 characterization tests pin behavior first. **Exit criterion:** same as F2 (zero branches). **Validation:** run `npm run audit` and verify in-match per map.

---

## F4 — Storage behind a minimal local wrapper (2 touchpoints) [Medium]

**Locations:** `app/prototype.tsx:2993–3004` (`window.localStorage` music-mute get/set) and `lib/audio-settings.ts:12–20` (audio-levels JSON with try/catch).

```ts
// lib/audio-settings.ts:12,20 — today
const saved = JSON.parse(localStorage.getItem('benteng-audio-levels-v1') || '{}');
try { localStorage.setItem('benteng-audio-levels-v1', JSON.stringify(cached)); } catch { /* Optional storage. */ }
```

Framing correction: no second backend exists. The work is a tidy local wrapper with parsing that rejects bad shapes — not a backend-swap adapter. A sync `load`/`save` cannot fit async Supabase/Firebase later without caller changes, so the plan must not promise that. If a real second backend appears, that task re-does this interface as `Promise`-based.

### Option A (recommended) — small sync wrapper, strict parsing, honest scope

```ts
// modules/storage/local-storage.ts — local-only, no backend claims
loadLevelSnapshot(): AudioLevels | null;  // validates shape, never throws, never returns unchecked JSON
saveLevelSnapshot(levels: AudioLevels): void;
// both call sites use it;JSON.parse cast to T disappears
```

### Option B — wrap in ad-hoc `storage.ts` helpers (`loadJSON`/`saveJSON`)

Faster today. But the unchecked generic cast survives, and every future backend still rewrites callers.

**Reason for A:** 2 call sites make the wrapper nearly free, and parsing that rejects bad shapes kills a real (if small) crash vector. No speculative machinery. **Module:** 10. **Phase:** 1. **Effort:** S. **Risk:** Low. **Exit criterion:** no raw `localStorage` in `app/`. No unchecked `JSON.parse` cast. **Validation:** `npx tsc --noEmit` + toggle mute/volume → reload → settings persist + `npm run build:pages`.

---

## F5/F9 — Audio decoupling: port now, bus later [Medium]

Merged: F5 and F9 contradicted each other (two `emit` signatures, `SmallContract` untyped, CustomEvent cited and rejected at once). One decision replaces both.

**Locations:** `new GameplayAudio()` at `app/prototype.tsx:3401` (unlock wiring :3402–3404, teardown :6017–6019, symbol `gameplayAudio`). `gameplayAudio.play(…)` inside rescue (:3572, :4337–4339), fort-capture (:3735), tag/caught (:4230–4232), steps/dash/prison/fort-enter (:4818–4825). The engine is already isolated (`lib/gameplay-audio.ts`, 107 lines). Zero `EventBus`/emitter exists in `app/`+`lib/`.

Measured costs (bounds the design): `play()` enforces internal cooldowns (step .13s, prison 3.5s, default .18s at `gameplay-audio.ts:53–54`) plus the call-site footstep throttle (170/270ms at `:4817`). Per-frame-adjacent dispatch costs a function call plus a `Map` lookup — small but **not zero**, so no design below claims zero gameplay cost.

### Option A (recommended) — inject an `AudioPort`, no bus

```ts
// modules/audio/audio-port.ts — the only contract gameplay sees
interface AudioPort { play(name: GameplaySound, volume?: number): void; close(): void; }
// production: thin adapter over GameplayAudio. tests: mock asserting calls.
// instance per match (created in the match effect, closed at :6017–6019 teardown). No singleton.
```

Attenuation stays at the call site: gameplay computes the final scalar from distance (`< 300` → `.22/.25/.55`) and passes it in. Audio never reads game state, so the coupling F5 complained about does not re-enter through the back door. Testing is a mock asserting `(name, volume)` pairs via existing `node:test`.

### Option B — typed event bus with one pilot event

```ts
// modules/events/ — ONLY if a second subscriber (achievements, stats) is confirmed
type GameEvent = 'PLAYER_TAGGED' | 'PLAYER_RESCUED' | 'MATCH_ENDED';
```

Synchronous dispatch, per-match instance owned by the match lifecycle, explicit unsubscribe at teardown. Same attenuation rule: payloads carry final scalars, never positions for audio to interpret.

**Reason for A:** it decouples gameplay from audio with one interface, zero subscribers to manage, and direct testability. A bus with one listener is machinery without a second customer (YAGNI). If achievements arrive, Option B remains valid and its open questions are already answered above. Precedent note: the in-repo `window CustomEvent` for audio settings stays as-is — local-setting notification, not a gameplay pattern. **Module:** 07 (+06 if B later). **Phase:** 1. **Effort:** M. **Risk:** Medium. Volume/distance logic moves with the port calls, never dropped. **Exit criterion:** no `gameplayAudio.play` in `prototype.tsx`. Mock-based `node:test` pins all 12 call sites. **Validation:** `npm run audit` + full match with sound on/off per map.

---

## F6 — Raw literals outside the data table (sampled, not exhaustive) [Medium]

**Sampled sites:** boost power `me.characterId === 'kaka' ? 1050 : 820` (`app/prototype.tsx:4576`, moves with F3). Distance-gated volumes `< 300`, `.22/.25/.55` (:4232, :4337–4339, move with F5). Counter-example of done-right: `rescueShieldMs: 1500`, `tagRange: 28` already live in `CharacterDefinition`.

### Option A (recommended) — extend config/table per domain when the team extracts each module

Use `TAG_RANGE_PX`-style named constants for true constants. Use `config/game-rules.json` or the character table for tunables. No standalone "magic-number sprint". Literals move when their owning module moves (§11.3).

### Option B — dedicated cleanup pass replacing every literal with constants now

Creates named constants for values whose owning module doesn't exist yet. Constants end up in the wrong files and get moved twice.

**Reason for A:** avoids double-moving. Each literal lands directly in its final home. Catalog all raw literals in `prototype.tsx` as the backlog for this (move values verbatim — see Q4, no balance tuning during moves). **Module:** 02/04/05. **Phase:** 2. **Effort:** M (spread across phases). **Risk:** Low. **Exit criterion:** backlog empty. **Validation:** `npm run audit`. It asserts several tuned values. Update assertions only for intentional balance changes.

---

## F7 — `lib/` purity: game systems masquerading as helpers [Medium]

**Locations:** `lib/tag-contact.js` (tag resolution), `lib/team-combo.js` (combo multiplier), `lib/field-cycle.js` (arena rotation decisions), `lib/click-navigation.js` + `lib/collision-navigation.js` (routing/steering), `lib/gameplay-audio.ts`, `lib/kampung-3d.ts` (Three.js renderer), `lib/characters.ts` (data table — legitimate resident until the Phase 2 split). Graphify verifies the split. These files form their own communities (Team Combo Engine, Collision Engine, Click Navigation Engine, Game Audio System). Generic helpers (`asset-ready.ts`, `utils.ts`, `selection-preview-model.js` contract) form separate communities.

### Option A (recommended) — re-home by rule, don't rename in place

Game-rule files move to `modules/gameplay|ai|audio/` as their phase lands, each behind its S1 characterization test. The stats table moves to the `config/characters/` split (Phase 2). The presentation registry from F2 lives beside it in code, never in JSON. `field-assets.generated.ts` stays generated (never hand-edit — AGENTS.md). `lib/` keeps only generic code.

### Option B — rename `lib/` → `modules/` wholesale

One rename, zero decoupling. Dependency direction stays unchanged. Plan rules stay violated.

**Reason for A:** the plan's goal is dependency clarity (§5), not tidy folders. **Module:** 02/03/07. **Phase:** per owning module (F1 seam table). **Effort:** M. **Risk:** Low. **Exit criterion:** no game rules in `lib/` (grep-able: no `CharacterId`, no match-state reads). **Validation:** `npx tsc --noEmit` (with `checkJs` on per S1) + `npm run audit`.

---

## F10 — `components/` and `hooks/` mapping [Low]

**State:** `components/` holds game screens/HUD (`arena-backdrop`, `selection-portrait`, `audio-settings`, `developer-credits`), the workshop (F0/Q1), and 60 untouched shadcn primitives in `ui/`. `hooks/` holds one hook (`use-mobile.ts`). Sequencing note: ~1,100 lines of F2's JSX live inside the god file, so this finding rides along with F1/F2. It is not an independent late phase.

### Option A (recommended) — split by screen when UI phase lands, leave shadcn alone

Game components move to `modules/ui/<screen>/` per §8 Module 11 (Sprint G), after F2 removes the branches they render. `components/ui/` stays as the vendored primitive set. `use-mobile.ts` moves to `modules/ui/` shared.

### Option B — move everything UI-shaped into `modules/ui/` now

Moves the workshop and HUD before their data contracts exist. Imports churn twice.

**Reason for A:** the UI holds no rules to extract against yet. It satisfies §4.1 rule 4 by accident. Moving early buys nothing. **Module:** 11. **Phase:** 4 (after F2). **Effort:** M. **Risk:** Low. **Exit criterion:** one screen builds and renders against mock data. **Validation:** `npm run build:pages` + verify each screen visually.

---

## Open questions (need human answers before implementation)

1. **Q1/F0:** Does `CharacterWorkshop` stay reachable in-game (→ `modules/ui/` screen) or become dev-only (→ `tools/`)? Recommendation: stay reachable.
2. **F2/F3:** Are kaka/raja ultimate stats (perf, not presentation) frozen during refactor? Any number change needs balance sign-off per Tool 04 rule.
3. **F6/Q4:** Verify no balance tuning during literal extraction (move values verbatim, tune separately).
4. **Enforcement (to verify after `npm ci`):** run `npx oxlint --rules` and list import-restriction rules (plus what `oxlint-tsgolint` adds). If absent, adopt dependency-cruiser with `modules/*` boundary rules so layers do not rot.

## Done criteria traceability (§17)

| §17 criterion | Covered by |
|---|---|
| Audio change doesn't touch gameplay | F5 port (bus only if a second subscriber appears) |
| Progression change doesn't touch maps | Unverified — no progression module exists yet. Claim it only after the Phase 2 review |
| Map change doesn't touch character logic | F3 (data flags) + F7 (world/characters separation) |
| Profile change doesn't touch match logic | F4 (local wrapper, backend claim removed) |
| Tools produce config the game uses | Pending Q1. `config/game-rules.json` precedent exists |
| Storage swappable via adapter | Removed as a criterion until a real second backend exists |
| UI developable with mock data | F10 exit criterion (screen renders against mock data) |
| Per-module Codex tasks with narrow scope | Deferred — findings only, per scoping answer |
| Prod build needs no tools | Pending Q1 (workshop in bundle until decided) |
| No single file holds all game logic | F1 exit criterion (composition + wiring only, under 500 lines) |
| New-dev readability gate | F0–F10 collectively. F7 lib purity is the sharpest test |

## G4 re-score (2026-10-06, formal — measured against G0 `e0c5921`)

G0 deltas: tsc 0→0 · lint 122→110 (−12) · audit fails 8→21 (7 persist + roster-sync fixed; +14 pre-existing sprite metadata surfaced by G2, disclosed not regressed) · build PASS→PASS · tests 4 suites→90 files/88 pass (2 known pre-existing) · prototype 8570→2567 (−70%) · rules in lib/ 7→0 (R10) · components/+hooks/ orphans→0 (R11) · `characterId ===` 12→0 (R6). Post-G3 safeguards: 0 localStorage in app/ · 0 gameplayAudio in prototype · ui→gameplay imports 0 · all 21 gameplay modules ≥1 direct test.

| §17 criterion | G4 verdict |
|---|---|
| Audio change doesn't touch gameplay | PASS — `gameplayAudio.play` count in app/ is 0; audio-port contract; gameplay emits callbacks only |
| Progression change doesn't touch maps | DEFERRED — no progression module (per active constraints) |
| Map change doesn't touch character logic | PASS — `modules/world/map-data` vs `config/characters/*.json`; R10 kanal-footprints in world/ |
| Profile change doesn't touch match logic | PASS — profile isolated; single boundary call `recordCompletedMatch` at match end |
| Tools produce config the game uses | PASS — `config/game-rules.json` consumed via JSON import attribute; audit roster-sync green |
| Storage swappable via adapter | REMOVED — per this table + deferred second backend (constraints) |
| UI developable with mock data | PASS — ui→gameplay import edges 0; screens take injected props; Playwright sweeps render from snapshot |
| Per-module Codex tasks narrow scope | DEFERRED — findings only, per scoping answer |
| Prod build needs no tools | PENDING Q1 — workshop in bundle until product decision |
| No single file holds all game logic | VARIANCE — composition ownership proved (variance owners in CHECKPOINT G4-precursor); 2567 vs 500 target; R5 stays target-not-gate per amendment 1; reaching 500 needs Design ruling on phase-gate + draw() remainder + navigate |
| New-dev readability gate | PASS — R10 sharpest test 0 files; R11 0 orphans; plain-domain ownership names |

G4 sign-off status: measurements recorded; merge to `main` deferred by user (work stays on `Refactor-Clio`); remaining user decisions: Design ruling for 500 target (optional), Q1 product call, merge/publish timing.

---

## Appendix A — Orphan-asset triage (cleanup, not modularity)

Downgraded from finding: asset cleanup does not separate modules. Process matters more than the list, because the graph solution alone produced **proven false negatives**:

- **Smoking gun 1:** `public/ui-v2/panels/stat-bar-mask.png` exists. `app/globals.css:475,479` references it via `url('/ui-v2/panels/stat-bar-mask.png')`. Yet the graph lists it as an isolated singleton. CSS `url()` references escaped the reference scan.
- **Smoking gun 2:** all 14 `Assets/pictures/*` icons are **build inputs**, consumed by `scripts/build-ui-assets.mjs:92,99,105` through the dynamic path `` `${id} icon.png` ``. No literal grep can match a template-built path. Dropping them per a graph-only drop list would break `npm run ui:build`.

Corroborated triage rule (all three required before DROP). Require all three: zero graph edges, zero grep hits for basename and path fragments, and no builder in `scripts/build-*.mjs` that reads the directory. Anything consumed through a template path (like the icons) is KEEP with a comment at the consuming site naming the pattern. Owner sign-off still required. Never touch baselines to hide a drop.

**Validation:** `npm run fields:build`/`sprites:build`/`ui:build` unaffected + `npm run build:pages`. **Phase:** anytime after S1 (needs no module).
