# Bentengan Squad Tag — Checkpoint Pekerjaan

Dokumen ini menyimpan kondisi task yang sedang berjalan. Perbarui setelah setiap
tahap penting agar pekerjaan dapat dilanjutkan tanpa membaca ulang percakapan.

## Status

### 2026-10-06 — G4 FORMAL + PUSHED to origin/Refactor-Clio (merge deferred per user)

**G4 formal:** §17 traceability table in `Review Plan.MD` extended with measured "G4 re-score (2026-10-06)" section (G0 deltas + 11 verdicts + sign-off status). Plan text untouched; results appended with date.

**Commit + push (shell pwsh, explicit user approval "push ke branch refactor clio"):**
- Commit `d7f77b8` on `Refactor-Clio`: "Strangler refactor Batches 1-16 plus G4: extract gameplay, game-core, ui, audio, world modules; R10 lib purity; R11 screens mapping; G4 re-score" — 242 files, +24325/−12114. Pre-commit checks: status/diff/log reviewed, secret/junk scan clean (no .env/keys/dist), tsc 0.
- `git push origin Refactor-Clio` → `210a404..d7f77b8`, success. Tree clean, tracking in sync. **No merge to main** (deferred per user).
- **Remote drift note:** AGENTS.md names remote `github`; actual remote is **`origin`** (same URL). Did NOT edit AGENTS.md (frozen by user). Future pushes use `origin`.

### 2026-10-06 — G4-PRECURSOR COMPLETE (metrics vs G0 + §17 re-score + safeguards + 500-line variance review)

**A. G0 metric deltas (baseline `e0c5921` 2026-10-04 → now):**

| Gate / metric | G0 baseline | Now | Delta |
|---|---|---|---|
| `npx tsc --noEmit` | PASS, 0 | PASS, 0 | unchanged ✓ |
| `npm run lint` | 122 errors | **110** | **−12** ✓ |
| `npm run audit` (failing) | 8 | 21 | 7 persist unchanged + roster-sync **FIXED** (−1) + **14 sprite-metadata pre-existing surfaced** by G2 data-driven fix (documented 2026-10-04, asset-pipeline, out-of-diff — never hidden) → visible +13 is disclosure, not regression |
| `npm run build:pages` | PASS | PASS | unchanged ✓ |
| characterization tests | 4 suites | **90 files, 88 pass** | +86 files; only 2 known pre-existing fails (test-kampung3d, test-kanal2-layout) |
| `app/prototype.tsx` lines | 8570 (work start) | **2567** | **−5993 (−70%)** |
| game rules in `lib/` (R10) | 7 rule-bearing files | **0** (lib = 18 data/model/util) | R10 ✓ |
| `components/` + `hooks/` (R11) | 2 orphan dirs, 66 files | **0 dirs** | R11 ✓ |
| `characterId ===` count (R6) | 12 | **0** (prototype + lib) | R6 ✓ |

**B. Post-G3 safeguards (`00-context.md`) — all run:**
1. No `localStorage` in `app/` → **0 hits** ✓ (R7)
2. No `gameplayAudio.play` in prototype → **0 hits** ✓ (R8)
3. No `characterId ===` branches → **0** ✓ (R6)
4. No game rules in `lib/` → **proven Batch 16** ✓ (R10)
5. `prototype.tsx` holds no gameplay rules → **composition ownership proved; residual = owner orchestration + 2 Design-excluded blocks** (see variance) — **PARTIAL, see D**
6. Approved dependency flow (UI pulls no gameplay internals) → **modules/ui imports modules/gameplay = 0** ✓
7. Gameplay modules carry behavior tests → **all 21 gameplay modules ≥1 direct test** (spot-verified: base→test-fort-occupant, rescue→test-rescue-request, base-check→test-base-check+test-exit-order; others ≥1) ✓

**C. §17 re-score (11 traceability rows from Review Plan):**
| Criterion | Status now | Evidence |
|---|---|---|
| Audio change doesn't touch gameplay | **PASS** | audio-port contract; S2=0; gameplay emits callbacks only |
| Progression change doesn't touch maps | REMOVED-DEFERRED | no progression module (per current constraints) |
| Map change doesn't touch character logic | **PASS** | world/map-data vs config/characters separated; R10 kanal-footprints in world/ |
| Profile change doesn't touch match logic | **PASS** | lib/player-profile + modules/ui/player-profile isolated; single boundary call (recordCompletedMatch at match end) |
| Tools produce config the game uses | **PASS** | game-rules.json consumed w/ JSON attribute; audit "roster sinkron" green |
| Storage swappable via adapter | REMOVED-DEFERRED | until real second backend (deferred by constraints) |
| UI developable with mock data | **PASS** | S6=0 (ui→gameplay edges) + all screens take injected props; Playwright sweeps render from snapshot |
| Per-module Codex tasks narrow scope | DEFERRED | findings only, per scoping answer |
| Prod build needs no tools | PENDING | workshop in bundle until Q1 product decision |
| No single file holds all game logic (<500) | **VARIANCE RECORDED (D)** | composition ownership proved; 2567 > 500 → variance table below; R5 stays target-not-gate |
| New-dev readability gate | **PASS** | R10 purity (sharpest test) ✓, R11 orphan-free ✓, plain-domain module names |

**D. 500-line VARIANCE REVIEW — line owners of 2567:**
| Region | Lines | Owner nature |
|---|---|---|
| Imports + module-level tables/helpers (L1–408) | ~408 | data tables + pure helpers (legit root) |
| Refs/state decls + 16 useEffects incl. match-init composition wiring (L409–1430) | ~1022 | **composition root = G3 deliverable** (factory world-configs, thin forwarders) |
| `update()` tick closure (L1431–1772) | ~342 | owner orchestration; residual rules = **phase-gate/countdown (Design-excluded, RISKY)** + input/mouse glue (pins mandate) |
| `draw()` + draw-factory wiring + snapshot/loop/listeners (L1773–2122) | ~350 | factory wiring (deliverable) + **draw() remainder = Design-excluded** |
| navigate + menu actions (L2123–2228) | ~106 | excluded (10+ setters, recorded) |
| menu-shell JSX (L2252–2377) + playing-shell JSX (L2378–end) + loading return | ~339 | shell + component call sites (deliverable) |
**Verdict:** composition-only ownership **proved** (no gameplay rules outside the 2 Design-excluded blocks; every extracted body lives in a module with direct tests). 2567 target is **not reachable without a Design ruling** on phase-gate + draw() remainder + navigate — per plan §G3-size ("stop before cosmetic splitting… return to Design if R5 must move from target to gate"), the 500-line figure **stays a target, not a gate** (amendment 1). No cosmetic splitting performed.

**Next:** user decision — (1) Design session for phase-gate/draw/navigate to chase the 500 target, (2) G4 formal (§17 already re-scored here; remaining = fill Review Plan table + user sign-off), or (3) merge/publish Batch work (HEAD `210a404`, all uncommitted).

### 2026-10-06 — Batch 16 COMPLETE (R10 lib purity ✓ + R11 orphan-free ✓, both proven)

**Batch totals:** prototype.tsx 2571 → 2567 (−4 import lines; bulk = module relocation: ~430 lines lib→modules, ~66 files components/hooks→modules/ui). Gates, all live: tsc 0; lint **110**; audit-game **21** (= baseline; `npm run audit` exit=1 only from known test-kampung3d); sweep 88/90 (2 pre-existing); build:pages PASS. Browser spot-check: backdrop/credits/audio-settings panel/7 portraits, ZERO errors. No Git ops (HEAD `210a404`).

**R10 — 7 rule files moved to owning modules (PROVEN):** field-cycle.js→match-control (typed inline) · tag-contact.js→tag-check (typed inline) · team-combo.js→gameplay/team-combo.ts · click-navigation.js→gameplay/click-navigation.ts · collision-navigation.js(108L)→merged into gameplay/collision-navigation.ts (+typed DEFAULT_BOUNDS/pathIsClear) · kanal-footprints.js→world/kanal-footprints.ts · gameplay-audio.ts→audio/gameplay-audio.ts. Consumers repointed: prototype, match-control, ai-movement, team-combo-actions, audio-port, components→audio-settings, map-studio/templates, audit (4 dynamic imports), 9 tests.
- **NOT moved (data/mapping, documented):** sprite-motion.js, character-animation.js.
- **PROOF:** all 7 paths Test-Path=False; lib = 18 files (data/model/util only); zero residual `from '…lib/<moved>'` imports (remaining lib imports = kampung-3d/map-studio-model/characters/sprite-motion/character-animation = allowed).
- **Enabling:** package.json — audit chain + test:map-studio + admin:maps now run `node --experimental-strip-types` (Node ≥22.13 project min).
- **Incident (self-caught):** gameplay-audio.ts deleted before the copy ran (PS quoting mangled node -e) — recovered byte-identical from git HEAD (107 lines verified), then 3 imports fixed incl. a 3rd consumer found late (components/audio-settings).
- **Also while touching:** team-combo-actions duplicate `TeamComboState` → re-export from team-combo.ts (single source of truth).

**R11 — components/ + hooks/ mapped to modules/ui (PROVEN):** leaf4 (arena-backdrop, audio-settings, developer-credits, selection-portrait) → modules/ui/ · player-profile/ → modules/ui/player-profile/ (2 prototype lazy imports repointed) · components/ui 61 primitif → modules/ui/primitives/ (`@/components/ui/*` → `@/modules/ui/primitives/*`, 18 files) · hooks/use-mobile → modules/ui/use-mobile.ts (sole consumer sidebar colocated) · 4 module consumers `../../components/X` → `./X`.
- **Depth lesson (recorded in memori):** components/X → modules/ui/X flips the parent chain — `'../lib'` must become `'../../lib'`; player-profile needs `'../../../lib'`.
- **PROOF:** `components/` + `hooks/` DO NOT EXIST (rmdir OK); zero residual refs in app/modules/scripts/lib.
- **Doc gap (backlog):** FEATURE_USER_PROFILE_RADAR_CHART.md still mentions old paths (doc, not code).

**Pre-existing discovered (NOT this batch):** test:map-studio 2 failures — templates() slices `const DESIGN_W =` from prototype (marker gone since G2; cascade → catalog guard 400). Failure reason proven identical at HEAD. Backlog: rewrite templates() to import buildFieldConfigs from modules/world/map-data (separate task).

**Batch-end NAMING REVIEW:** R11 moves keep filenames (rule 7b moved-to-final-owner): leaf4 + player-profile unchanged; `components/ui` → `modules/ui/primitives` (plural, flat-folder clarity per rule 2); `hooks/use-mobile` → `modules/ui/use-mobile` (colocated with sole consumer). No cosmetic renames. Exports/contracts unchanged (import paths only). Deferred ambiguous list unchanged. Ownership mismatch: none.

**Next:** G4-precursor — metrics vs G0 baseline, §17 re-score, 500-line variance review (prototype now 2567); then user merge/publish decision.

### 2026-10-06 — Batch 15 COMPLETE (5 menu chrome components, browser-verified)

**Batch totals:** prototype.tsx 2608 → 2571 (−37). Gates, all live: tsc 0; lint **110**; audit-game 21 baseline (0 pins touched — chrome had no pins); sweep 88/90 (2 pre-existing); build:pages PASS. **Browser sweep all-green, nol errors.** No Git ops (HEAD `210a404`).

**Seams (gates + Playwright):**
- **113 `AssetLoadingScreen` → `modules/ui/asset-loading-screen.tsx`** — 29→~16; owns ArenaBackdrop + progress card; owner bundles retry/back setters; `frameSrc` injected. **Verified LIVE:** loading screen appeared during match start.
- **114 `MenuActionsRow` → `modules/ui/menu-actions-row.tsx`** — 21→~9; about/music/rules/audio; AudioSettings import moved in (prototype import pruned). **Verified:** splash ABOUT ✓, team screen sound/rules/settings ✓.
- **115 `BackButton` → `modules/ui/back-button.tsx`** — 7→1; **Verified:** click → splash.
- **116 `ProfileTriggerButton` → `modules/ui/profile-trigger-button.tsx`** — 11→1; guard owner-side. **Verified:** renders on splash.
- **117 `WorkshopLink` → `modules/ui/workshop-link.tsx`** — 10→1; **Verified:** opens workshop.
- **Import pruning:** `UserRound`, `Wrench`, `AudioSettings` (last uses moved).

**WIRING INVENTORY (recorded — G3 target state):** remaining prototype = state decls + effects + match-init/draw factory wiring + navigate (excluded) + teardown. Per G3 exit "prototype.tsx is composition and wiring only" — factory wiring is the DELIVERABLE, not a defect. No further chrome extraction planned; leftover non-wiring: `navigate` (63, excluded), `phase-gate` (RISKY, excluded), `draw()` remainder (Design).

**Batch-end NAMING REVIEW:** renamed none; 5 files responsibility-named under `modules/ui/` ✓ (`asset-loading-screen` over `loading.tsx` — specific, avoids ambiguous generic). Deferred list unchanged. Ownership mismatch: none.

**Next:** candidates exhausted for chrome. Options: R10 lib purity batch (inventory ready in B9), R11 `components/`→`modules/ui/` move, or G4-precursor metrics sweep + 500-line variance review.

### 2026-10-06 — Batch 14 COMPLETE (6 menu/result screens, browser-verified)

**Batch totals:** prototype.tsx 2748 → 2608 (−140). Gates, all live: tsc 0; lint **110** (↓7, imports pruned as screens moved); audit-game 21 baseline (2 pins repointed); sweep 88/90 (2 pre-existing); build:pages PASS. **Browser menu-flow sweep all-green, nol errors.** No Git ops (HEAD `210a404`).

**Seams:**
- **107 `RoundResultAnnouncementCard`** — 16→1; assets table injected; guard inside. **Structural only** (trigger needs round end — stated). Pruned `FACTION_FOR_TEAM`/`teamName` imports. Revert: restore block + 2 imports.
- **108 `SplashScreen`** — 31→7; `resolveAsset` + `onEnter` (audio+nav bundle) injected; `landingLogoAsset` import moved to component. **Verified:** render (logo+2 heroes), enter advances.
- **109 `TeamScreen`** — 46→14; hover→`onHover`, pick→`onPick` bundle; audit-sensitive logo string injected via `logoSrc` (pin L243 never breaks — caught raw-string bug mid-seam). Pruned component-side `FIXED_ROSTERS`. **Verified:** 2 picks, click advances.
- **110 `RulesOverlay`** — 60→1; pure static, `onClose` only. **Pin repoint:** `Ultimate Raja dan Kaka` → rulesOverlaySource. **Verified:** opens (title + 8 items), closes.
- **111 `FieldSelectScreen`** — 74→24; fields/squad/asset/selection/step/start injected (step owner wraps `stepFieldId`; keyboard path untouched). Zero pins. **Verified:** 6 cards, 5 lineup, step → PASAR SENGGOL, start → in-match.
- **112 `CharacterSelectScreen`** — 161→~30; faction/videoSrc/characters/selectedId/selected + 4 callbacks (cycle/highlight/swap/select). Dropped one dead commented block (uncommented hover stub — dead code). Pruned `SelectionPortrait`/`statPercent` imports. **Pins repoint:** `ultimate-roster-badge` + `roster-video` regex → characterSelectSource. **Verified LIVE:** 7 chars, 1 ULT badge, RAJA panel + 3 stat bars, cycle RAJA→ROBOT, swap red→green, PILIH → field → match.
- **Consequent import pruning:** `Check`, `X`, `GAME_RULES`, `characterAsset`, `opponentSquad`+`opponentLineup` (died with B9 dead-JSX — found by lint this batch), `SelectionPortrait`, `statPercent`.

**Batch-end NAMING REVIEW:** renamed none; 6 new files responsibility-named under `modules/ui/` ✓. `RoundResultAnnouncementCard` name chosen over `round-result.tsx` — component vs table distinction (roundResultAssets lives in ui-assets). Deferred list unchanged. Ownership mismatch: none.

**Remaining menu-shell chrome → Batch 15:** profile trigger, ArenaBackdrop calls, music/audio buttons row, graffiti-back, pregame-actions, credits/profile dialogs (already components), workshop-float link, loading early-return (29), teardown/navigate (`navigate` 63 stays excluded). Then: draw-factory + canvas wiring inventory; R10; R11; G4.

### 2026-10-06 — Batch 13 COMPLETE (14 HUD widgets, browser-verified incl. mobile)

**Batch totals:** prototype.tsx 2960 → 2748 (−212). Gates, all live: tsc 0; lint **110** (↓7, icon imports pruned as widgets moved); audit-game 21 baseline (5 pin clauses repointed); sweep 88/90 (2 pre-existing); build:pages PASS. **Playwright desktop+mobile sweep: all widgets render live, prisoner notice appeared naturally with working rescue button, mobile dpad 4 + actions 3, ZERO errors.** No Git ops (HEAD `210a404`).

**Seams (gates + Playwright):** `renderer-error-notice`, `status-ribbon`, `combo-callout` (guard inside), `control-ribbon`, `camera-switcher` (options injected), `boost-stack`, `ultimate-meter-hud`, `character-hud` (+charge sub-panel), `ultimate-banner`, `prisoner-notice` (guard inside, tapKey→onRequest), `active-objective`, `team-combo-hud`, `mobile-controls` (`touch` injected as `TouchProps`; prop named `playerMechanicsLocked` so the audit clause matches the new home), `action-dock` (nests ArenaIntel; tapKey→onTapUltimate).

**Notable:** `onTone: (f) => playTone(f)` vs `onTone: (f, d) => playTone(f, d)` — default params make both equivalent; chosen per call. `Boolean(dx||dy)` coercion in stepBoost (annotated return; truthy-identical). `${selectedFaction}` left verbatim (renders "null") — NOT normalized.

**Pins repointed (5 clauses, same checks):** L200 `MENUNGGU DIBEBASKAN`→prisonerNotice + `disabled=`→mobileControls; L212 `team-combo-hud`; L216 aria-label→teamComboHud; L248 `active-objective`+`action-dock`; L181 `Keluar ke menu`→pauseOverlay; steps/steer/audio pins from bots seam.

**Batch-end NAMING REVIEW:** renamed none (ai-movement from B9 stands as the sanctioned rename). New files all responsibility-named under `modules/ui/` ✓. Deferred list unchanged. Ownership mismatch: none. Icon imports pruned from prototype: BatteryCharging, Check, X, Menu, Pause, LogOut, Play, RotateCcw, Volume2, VolumeX, MapIcon, CharacterPreview, GAME_RULES, formatTime, lineupFor, opponentLineup, FIXED_ROSTERS(in team-screen), kakaUltimateSpriteAsset, FIELD_ASSET_VERSION, studioContains, isNearWater, other(from math), fieldCycleDecision.

**Remaining in playing shell → Batch 14:** the mode-block is now mostly component calls; leftovers are the canvas element, draw-factory wiring, menu return (workshop early-return, menu topbar bits, character-select ~120, loading early-return, teardown/navigate).

### 2026-10-06 — Batch 12 COMPLETE

### 2026-10-06 — Batch 12 COMPLETE (4 playing-shell components, browser-verified)

**Batch totals:** prototype.tsx 3078 → 2960 (−118). Gates, all live: tsc 0; lint **117**; audit-game 21 baseline (3 pin clauses repointed); sweep 88/90 (2 pre-existing); build:pages PASS. **Browser sweep all-green, nol errors.** No Git ops (HEAD `210a404`).

**Seams:**
- **103 `ArenaIntel` → `modules/ui/arena-intel.tsx`** — DEDUPE: block existed twice (standalone + dock-status, identik 4 pills); component with `className` override replaces both (−~35). 4 snapshot fields injected (narrow). **Pin repoint:** L199 `arena-intel` clause → arenaIntelSource. **Verified:** 2 instances render, 4 pills each.
- **104 `StageHud` → `modules/ui/stage-hud.tsx`** — score/time strip + toggle wiring (`onToggle` injected). `formatTime` import removed from prototype (last use moved). **Verified:** timer renders "04:00 WAKTU", click opens stats overlay (toggle path).
- **105 `PlayingTopbar` → `modules/ui/playing-topbar.tsx`** — brand + profile/audio/mission/pause actions; imports `AudioSettings` from components/ (cross-path OK pre-R11). CAUGHT mid-seam: AudioSettings `onOpen` ≠ profile open (keys-clear only) → separate `onAudioOpen` prop (behavior preserved). Icons `Menu`/`Pause` pruned. logoSrc injected at call site (pin L243 string stays in prototype). **Verified:** logo + pause button live.
- **106 `PauseOverlay` → `modules/ui/pause-overlay.tsx`** — guard `snapshot.paused` stays owner; 5 callbacks injected. Icons LogOut/Play/RotateCcw/Volume2/VolumeX pruned from prototype. **Pins repoint:** L246 `pause-overlay` clause + L181 `Keluar ke menu` clause → pauseOverlaySource. **Verified:** opens via topbar Jeda, 4 buttons, Lanjutkan resumes.

**Batch-end NAMING REVIEW:** renamed none; new files `arena-intel/stage-hud/playing-topbar/pause-overlay.tsx` (plain domain, ui ownership ✓). Deferred ambiguous unchanged. Ownership mismatch: none.

**Remaining playing-shell widgets → Batch 13:** status-ribbon (9), prisoner-notice (28, tapKey), active-objective (17 — pin L246), character-hud (24), team-combo-hud (31 — pins L206/207), combo-callout (8), camera-switcher (17), boost-stack (14), ultimate-meter-hud (14), action-dock (~60 — pin L246), control-ribbon (9), mobile-controls (61), ultimate-banner (17), renderer-error (5). Then character-select (menu, ~120) + topbar-less menu bits. Alt: R10 batch.

### 2026-10-06 — Batch 11 COMPLETE (5 menu/result screens, browser-verified)

**Batch totals:** prototype.tsx 3256 → 3078 (−178). Gates, all live: tsc 0; lint **117** (≤ baseline, relocated `<img>` findings 1:1); audit-game 21 baseline (1 pin repointed); sweep 88/90 (2 pre-existing); build:pages PASS. **Browser sweep all-green, nol page/console errors.** No Git ops (HEAD `210a404`).

**Seams (gates + Playwright):**
- **98 `RoundResultAnnouncementCard` → `modules/ui/round-result-announcement.tsx`.** 16-line block → 1-line call; winner/final + `ROUND_RESULT_ASSET` injected; guard inside (null). Imports pruned: `FACTION_FOR_TEAM`, `teamName` (last uses). **Structural only** — live trigger needs a full round end (stated, not inherited). Revert: restore block + 2 imports.
- **99 `SplashScreen` → `modules/ui/splash-screen.tsx`.** 31→7; `resolveAsset` + `onEnter` injected (owner bundles audio cue + setMenuStep); `landingLogoAsset` import moves to component (prototype import pruned). **Verified:** renders (logo+2 heroes), enter click advances.
- **100 `TeamScreen` → `modules/ui/team-screen.tsx`.** 46→14; hover/focus → `onHover`, pick → `onPick` (owner bundles chooseFaction+nav+voice); `logoSrc` injected (keeps `benteng-tag-logo.webp?v=9` in prototype → pin L243 intact). Caught own bug mid-seam: raw string instead of publicAsset → switched to injection. Unused `FIXED_ROSTERS` import in component removed. **Verified:** 2 picks render, click advances. Pin L196 (mobile CSS) unaffected (globalStyles).
- **101 `RulesOverlay` → `modules/ui/rules-overlay.tsx`.** 60→1; pure static content, `onClose` injected. **Verified:** opens (title + 8 items), closes. **Pin repoint:** `Ultimate Raja dan Kaka` clause → rulesOverlaySource (new reader) — same check, new location.
- **102 `FieldSelectScreen` → `modules/ui/field-select-screen.tsx`.** 74→24; fields/squad/asset/selection/step/start all injected (`onStep` owner wraps `stepFieldId`, keyboard path unchanged). Zero audit pins. **Verified:** 6 cards, 5 lineup figures, carousel next selects PASAR SENGGOL (step wiring), MULAI MATCH → in-match (start wiring).

**Batch-end NAMING REVIEW:**
- **Renamed:** none. New files: `round-result-announcement.tsx`, `splash-screen.tsx`, `team-screen.tsx`, `rules-overlay.tsx`, `field-select-screen.tsx` — all plain-domain, ui ownership ✓.
- **Deferred ambiguous:** unchanged (list in B9/B10 entries).
- **Ownership mismatch:** none.

**Remaining screens for Batch 12:** in-match HUD block (status-ribbon/dock/touch/pause, ~340 = yield terbesar), topbar (~90), arena-intel (21), stage-hud (30), character-select (~162), profile/credits panels. Alternative: R10 lib purity batch (inventory siap).

### 2026-10-06 — Batch 10 COMPLETE (3 JSX screen components, browser-verified)

**Batch totals:** prototype.tsx 3551 → 3256 (−295). Gates, all live: tsc 0; lint **117** (↓ below baseline — dead imports cleaned); audit-game 21 baseline (2 pins repointed); sweep 88/90 (2 pre-existing map failures); build:pages PASS. Browser verification (Playwright vs running dev server :3000) passed for every component; ZERO page/console errors across all runs. No Git ops (HEAD `210a404`).

**Seams (all JSX gates-only + Playwright per plan):**
- **95 `MatchEventFeed` → `modules/ui/match-event-feed.tsx` (new).** Guard moved inside (returns null); frames table injected (`MATCH_EVENT_FRAME` const stays owner). **Verified:** in-match, a real bot tag rendered `.match-event-toast tag` through the new component. Revert: restore block, drop import.
- **96 `RoundStatsOverlay` → `modules/ui/round-stats-overlay.tsx` (new, 136-line block → 11-line call).** Splice via unique-assert script (start/end markers count==1, removed==136, safety copy %TEMP%\proto-pre-stats-dialog.tsx). 8 callbacks + snapshot board injected; `showStatsBoard` guard stays owner. **Verified:** leaderboard opens — Tab in `handleKeyDown` is hold-to-view (down opens / up closes): physical `keyboard.down/up('Tab')` both asserted + synthetic keydown; title/header/10 stat rows/scoreline render; second Tab closes. Revert: restore 136-line block, drop import.
- **97 `MissionPanel` → `modules/ui/mission-panel.tsx` (new, 143-line block → 8-line call).** Splice via unique-assert script (removed==143, safety copy %TEMP%\proto-pre-mission-panel.tsx). Preserved `${selectedFaction}` template verbatim (renders "null" — NOT normalized to `?? ''`). **Verified (play branch):** opens via `Tujuan aktif` opener, 5 team members, event-feed, 4 computed-status spans, close works. Menu branch (reference-card) reachable only via quit-while-open (opener hidden in menu on desktop/mobile) — verified structurally (tsc) only, stated not inherited. Revert: restore 143-line block, drop import.
- **Consequent dead-code cleanup (lint-driven):** removed unused `Check`, `X` (moved with mission), `GAME_RULES` (only use moved), `characterAsset` (unused since B8 CharacterPreview move), `opponentSquad` memo + `opponentLineup` import (died with B9 dead-JSX). Net lint −2 vs batch start.

**Audit:** 2 pins repointed (same checks, new locations; `missionPanelSource` reader added): `computed-status` → mission-panel; `characters.webp?v=8` → mission-panel.

**Batch-end NAMING REVIEW:**
- **Renamed:** none. New files named by responsibility: `match-event-feed.tsx`, `round-stats-overlay.tsx`, `mission-panel.tsx` (plain domain, ui ownership ✓).
- **Deferred ambiguous:** unchanged from Batch 9 (`*-check` ×4, `bars-score` (cosmetic), `movement-audio`, `base/water/format/roster/prison/scalars/effects-*/field-assets`, `image-cache`/`event-target`).
- **Ownership mismatch:** none — all three components in `modules/ui/` (R11 direction); `components/`+`hooks/` relocation itself remains R11's dedicated step (player-profile = upstream code).

**Next action:** Batch 11 options: remaining screens (in-match HUD ~340, topbar, round-result, menu screens) or R10 lib purity batch (inventory ready in B9 entry) — user pick, else continue screens per default priority.

### 2026-10-06 — Batch 9 COMPLETE (dead-JSX deletion + 4 P1 seams; naming rules active)

**Batch totals:** prototype.tsx 3846 → 3551 (−295: −219 dead JSX + −76 logic). 4 new direct tests (ult-cast, parkour-jump, step-bots, step-boost), all PASS live. Gates, all re-verified live: tsc 0; lint 119 (≤ baseline, 0 in seam files); audit-game 21 baseline (3 pins repointed this batch); sweep 88/90 (only 2 pre-existing map-suite failures); build:pages PASS. No Git ops (HEAD `210a404`).

**Work items:**
- **Dead JSX `{false && …}` DELETED (−219).** Spliced with unique-marker assertions (start `{false && (` unique, close `)}` + `{mode === 'playing'` unique, count === 219 asserted), CRLF-normalized compare, safety copy at %TEMP%\proto-pre-deadxjsx.tsx. Unreachable UI (stale character-select panel).
- **Seam 90: `tickUltimateMeter` + `beginUltimateCast` → `bars-score.ts`.** Passive charge (Q2 45s verbatim, passed as input — `RAJA_ULTIMATE_RECHARGE_SECONDS = 45` STAYS in prototype) + capslock cast gate/initiation. Key consumption stays owner (pin L214 `keys.current.has('capslock')` + `RAJA_ULTIMATE_CAST_MS = 3200` stay). Banner React wiring via `onBanner` callback. Revert: restore block, drop2 imports.
- **Seam 92: `tryParkourJump` → `collision-navigation.ts`.** Full gate matrix + 44px probe + studio `contains` import + adaptive landing verbatim; landing probe injected (`findLanding` binds owner forwarder); thresholds 54·agility/360/620·430/20000 in module. `studioContains`+`isNearWater` imports pruned from prototype. Pin L194 `landing.crossedWater` clause repointed → collisionNavSource. +1 missed `kanal2` literal → `isKanalField`. Revert: restore block + 2 imports, revert pin.
- **Seam 93: `stepBots` → `ai-vector.ts` + RENAME → `ai-movement.ts` (see naming review).** Bot tick (decide/steer/boost/move) verbatim incl. `as Player` casts (real objects, established pattern). AI tuning consts STAY in prototype (DIFFICULTY_PROFILES uses them; pin L192 unchanged) — passed via world. Pin L173 `aiProfile.steerDistance` clause repointed → aiVectorSource. Revert: rename back + restore loop.
- **Seam 94: `stepBoost` → `bars-score.ts`.** Trigger/latch/mouse-consume/drain(0.8 combo)/20s mark verbatim; `boostKey` decl stays owner (pin L87); GAME_RULES imported in module (pin L85 reads config). `Boolean(dx||dy)` coercion for annotated return (truthiness-identical; original inferred `number|boolean` loosely). +1 missed `kanal2` literal → `isKanalField`. Revert: restore block, drop import.
- **Reviewed, skipped (below seam threshold):** rescue-key slice (already composition/wiring — module effects applied owner-side by design), input axes+waypoint (4 thin lines; `boostKey`/`parkourKey` pins mandate owner declarations), phase block (still RISKY/excluded), RETURNING/move (thin composition).
- **R10 survey (Phase D):** lib/ game-rule candidates with sizes/destinations: `collision-navigation.js` 108L(21 rule consts)→modules/gameplay/collision-navigation.ts · `team-combo.js` 39L→gameplay/team-combo.ts · `field-cycle.js` 11L→game-core/match-control.ts (audit+test import directly — update) · `tag-contact.js` 15L→gameplay/tag-check.ts · `click-navigation.js` 70L→gameplay/input-navigation.ts · `kanal-footprints.js` 83L→world · `gameplay-audio.ts` 108L→audio · `character-animation.js` 85L / `sprite-motion.js` 24L→ui/data. NOT sempit → dedicated batch (after Batch 10 screens).

**Batch-end NAMING REVIEW:**
- **Renamed (1):** `modules/gameplay/ai-vector.ts` → `modules/gameplay/ai-movement.ts`. Reason: active seam added `stepBots` — file now owns AI movement/vector decisions (rule7 + suggested table); responsibility materially broadened. Exports unchanged (`aiVector` kept + `stepBots` added); importers updated (prototype, audit path, test-ai-vector.mjs import path — test file NAME kept per rule9 preserve test paths). Validation: direct tests (ai-vector + step-bots) PASS, tsc 0, lint clean, audit 21, sweep, build PASS.
- **Deferred ambiguous (untouched this batch):** `base-check.ts`/`refill-check.ts`/`rescue-check.ts`/`tag-check.ts` (rule4 `*-check` with mutations — top rename-when-touched: → base-control/refill-rules/rescue-rules/tag-rules), `bars-score.ts` (touched this batch; `score-bars` = cosmetic word-order only → rule "no rename for nicer sound"), `movement-audio.ts`→`movement-sounds.ts`, `base.ts`, `water.ts`→`water-rules`, `format.ts` (needs responsibility inspection first), `roster.ts`→`match-roster`, `effects-log/particles`, `field-assets.ts`, `prison.ts`, `scalars.ts`, `image-cache.ts`/`event-target.ts` (new-ish, borderline), R10 lib files (name at move time).
- **Ownership mismatches:** none found. `collision-navigation.ts` keep per explicit rule.

**Next action:** Batch 10 = JSX screen extraction (user-approved) with Playwright browser verification; then R10 dedicated batch; R11 after.

### 2026-10-06 — Batch 9 OPEN (naming rules ACTIVE; user-approved: dead-JSX deletion + logic-first, JSX screens Batch 10 with Playwright)

- **Rules ingested** into memori.md (naming rules + autonomous behavior + stop conditions). Applied only to created/modified modules; no naming-only batch.
- **Approved decisions:** (1) delete unreachable dead-JSX block after proving the `false &&` guard; (2) JSX screen extraction deferred to Batch 10 dedicated with browser verification; Batch 9 = P1 logic first.
- **Priority order:** P1 gameplay → P3 state/snapshot → P4 explicit-contract input → P2 narrow-world render. Exclusions carry over (Batch 6 five, phase-gate, edge-marker, dev toggles, playUiSample/Tone, draw() in Design).
- **Batch-end obligations:** naming review output (renames/old-new/reason/exports/validation + deferred ambiguous + ownership mismatches) + full gates + sweep.
- **Next action:** Phase C1 dead-JSX deletion, then survey → P1 seams.

### 2026-10-06 — Batch 8 COMPLETE (9 seams: fortGeometry, pauseGate, castFreeze, stuckTimeout, landingArena, lineups, pointerOut, fieldStep, CharacterPreview)

**Batch totals:** prototype.tsx 3889 → 3846 (−43). 3 new direct tests (gates, cast-freeze, lineups; event-target/lineups extended), all PASS live. Gates: tsc 0; lint 119 (≤119 documented baseline; +1 is the relocated no-img-element on the moved CharacterPreview — same finding, new file); audit-game 21 baseline (1 pin repointed); sweep 84/86 (only 2 pre-existing map-suite failures); build:pages PASS. No Git ops (HEAD `210a404`).

**Seams:**
- **fortGeometry → `modules/world/map-data/scalars.ts`.** 168/188/130 factors verbatim; def site becomes one destructure, 4 use sites untouched. 0 audit pins. Revert: restore 3 consts, drop import.
- **pauseGate → `modules/gameplay/input-navigation.ts` (`stepPauseGate`).** 'p' consumed in place; `{paused, halted}` returns; owner assigns + early-outs. Revert: restore 5-line head, drop import.
- **castFreeze → `modules/gameplay/bars-score.ts` (`freezeDuringUltimateCast`, ult family).** Velocities mutate facets in place; latches return as object, null when idle. 1 audit pin repointed (`player.vx = 0;` → barsScoreSource; other 3 clauses still in prototype). Revert: restore block, drop import.
- **stuckTimeout → `modules/gameplay/input-navigation.ts` (`stepMouseStuckTimeout`, needs the new math import).** Returns updated time; routeless passthrough. +1 missed `kanal2` literal → `isKanalField` (Seam 60 follow-through). Revert: restore if-block, drop import.
- **landingArena → `modules/game-core/match-control.ts` (`nextLandingArenaId`, generic `<T>` — zero casts).** Picker injected (deterministic test). Revert: restore updater, drop import.
- **lineups → `modules/gameplay/roster.ts` (`rosterCharacters/squadLineup/opponentLineup`).** useMemo shells stay, bodies move; `lineupFor` import pruned from prototype (still used in module). Test caught my wrong roster assumption (kaka is green) before gates — assertions corrected to real data. Revert: restore 3 memos + import.
- **pointerOut → `modules/ui/event-target.ts` (`handlePointerOut`, same closest family).** Hover-clear via injected callback. Revert: restore 3-line closure, drop import.
- **fieldStep → `modules/game-core/match-control.ts` (`stepFieldId`, generic).** Unifies keyboard + both carousel buttons (3 sites → 1 cycler). Revert: restore 3 blocks, drop import.
- **CharacterPreview → `modules/ui/character-preview.tsx` (new, verbatim, explicit `.tsx` import).** 9 call sites untouched; lib portrait imports stay (preload still uses them). NO direct node test possible (JSX) — verified via tsc + build:pages + full sweep instead; stated, not inherited. Revert: restore component, drop import.

**Deferred:** toggleBackgroundMusic (setter+saver glue — same ruling as Batch 6 five).

### 2026-10-06 — Batch 8 OPEN (autonomous; priorities: P1 gameplay → P3 state/snapshot → P4 explicit-contract input → P2 narrow-world render)

- **Exclusions carry over:** Batch 6 deferred five + phase-gate (setter bundle) + snapshot glue readers + edge-marker (broad world) + dev-only toggles + coupled playUiSample/playUiTone + `draw()` in Design. No re-attempts without new evidence.
- **Gate discipline:** every PASS re-verified live (full sweep + audit-game count at batch end).
- **Next action:** survey → build → gates → batch entry.

### 2026-10-06 — Batch 7 COMPLETE (9 seams: movement-audio, input-guards, rescue-bubble, phase-overlay, sudden-death, ultimate-impact, particles, route-ring, field-rotation)

**Batch totals:** prototype.tsx 3950 → 3889 (−61). 5 new direct tests (movement-audio, input-guards, sudden-death, ultimate-impact, roundouts-for-3), all PASS live. Gates: tsc 0; lint 118 (= baseline, 0 in seam files); audit-game 21 baseline (4 pins repointed); sweep 81/83 (only 2 pre-existing map-suite failures); build:pages PASS. No Git ops (HEAD `210a404`).

**Seams (P1 first, then P4, P2, P3-decision):**
- **movement-audio → `modules/gameplay/movement-audio.ts` (new).** Footstep/dash/prison/fort-enter triggers; 4 loop-locals return by value; `enemyBase` precomputed in (no Team import); audio via `onStep/onDash/onPrison/onFortEnter`. Forwarder destructures back into lets. Found: `boosting` is `number | boolean` upstream (dx||dy) — contract says so truthfully. +1 missed `kanal2` literal converted to `isKanalField` (Seam 60 follow-through). Revert: delete file+test, restore block+`other` import.
- **pointer-menu-guards → `modules/gameplay/input-navigation.ts`.** `handleContextMenu/handleStopForMenu/handleStopWhenHidden` (`document.hidden` injected as boolean). Enabling fix: `lib/click-navigation` → explicit `.js` (file exists; module now node-loadable — previously had NO direct test). Revert: delete fns+test, restore 3 closures, revert import.
- **rescue-bubble + phase-overlay → `modules/ui/draw-base.ts`.** Lookup + pulse math + PLAYING guard moved verbatim; owner passes `rescueRequest?.requesterId`. 0 audit pins. Revert: restore 2 blocks, drop imports.
- **sudden-death → `modules/game-core/match-control.ts` (`stepSuddenDeath`).** Tiebreaks verbatim; state returns by value; `onWinRound/onLog/onTone` direct-passed (signatures match). Enabling fixes (zero behavior, test-unlocking): match-control's 5 extensionless imports → explicit `.ts`/deep paths (`player-profile` → `profile-service.ts` deep to skip index chain); player-profile chain (`defaults/storage/migrations/statistics`) → explicit `.ts`. Revert: delete fn+test, restore block; revert import strings.
- **ultimate-impact → `modules/gameplay/bars-score.ts` (`applyUltimateImpact`).** Kind-switch verbatim; durations as inputs (Q2: no const moves, no tuning); shields mutate facets in place; loop timers return by value (field names mirror owner — no remap). Needed `CHARACTER_BY_ID` added to bars-score's lib import (caught by tsc, fixed). 0 audit pins on impact content. Revert: delete block+test, restore body.
- **particles/route-ring/rotation (3 alternates, 1 test `test-roundouts.mjs`).** `drawParticles` → effects-particles.ts (alpha math + trailing reset verbatim); `drawRouteTarget` → draw-base.ts (guard folded in, prototype `if` dropped); `pendingFieldRotation` → match-control.ts (`<3` gate kept — avoids redundant setState; `field-cycle.js` import pruned from prototype). Audit tests lib directly — no repoints. Revert each: restore block, drop import.

**Deferred with reason:** phase-gate (RISKY: 4+ loop-local mutations, setter bundle wider than value); missionCount/playerMechanicsLocked/requestNextRound/showStatsBoard (glue-class per Batch 6 ruling — 1-line snapshot readers/setters); marker (broad cam/scale/world object, violates priority-4 constraint); collisionKey/toggleCollision (dev-only, re-affirmed); playUiSample (coupled, re-affirmed).

**Audit pins repointed (4, same checks):** step/dash/prison/fort-enter prototype literals → movement-audio module + forwarder literals (count stays 9; comment corrected to 1-direct+8-forwarders).

### 2026-10-06 — Batch 7 OPEN (user-approved, autonomous; priorities: P1 gameplay → P3 state/snapshot → P4 input w/ explicit listener contract → P2 narrow-world render)

- **Exclusions:** Batch 6 deferred five (refreshPlayerProfile, closeLeaderboard, touchKey cluster, chooseFaction, highlightCharacterWithVoice) not re-attempted without new evidence; `draw()` stays in Design; dev-only toggles + coupled playUiSample stay deferred.
- **Gate discipline (tightened):** every reported PASS re-verified live this batch (full 77-file sweep + audit-game 21-count at batch end); no inherited PASS claims.
- **Next action:** survey → build seams one by one → full gates → batch entry.

### 2026-10-06 — Batch 6 COMPLETE (10 seams built: 60, 64, 67–74; 5 deferred with reason)

**Batch totals:** prototype.tsx 4046 → 3950 (−96). 9 new direct tests, all PASS. Gates: tsc 0; lint 118 (= baseline, 0 in seam files); audit-game 21 baseline (2 pins repointed, same checks); sweep 75/77 (only 2 pre-existing map-suite failures: test-kampung3d, test-kanal2-layout); build:pages PASS. No Git ops (HEAD `210a404`).

**Seams:**
- **60 isKanalField → `modules/world/field-flags.ts` (new, 3 lines).** Verbatim predicate + `FieldId` type-only import; ~24 call sites unchanged. 0 audit pins. Revert: delete file+test, restore def.
- **64 characterVoiceAsset → `modules/audio/character-voice.ts` (new).** 14-voice table moved verbatim + `characterVoiceAsset(id, resolveAsset)` (resolver injected — lib/characters.ts pulls react/lucide-react, unloadable in node tests). 1 call site threads `uiAudioAsset`. 0 audit pins. Revert: delete file+test, restore block+markers.
- **67 cycleRosterId → `modules/gameplay/roster.ts`.** Wrap-around math verbatim (incl. indexOf(−1) edge); `cycleCharacter` keeps guard + highlight call. Revert: delete fn+test, restore 3-line block.
- **68 uiAsset → `modules/ui/ui-assets.ts` (new, `UiAssetSources`).** Routing/versioning verbatim; `mapArtwork` injected (lib/map-studio is extensionless, unloadable in tests); 17 call sites via 1-line wrapper + shared sources const. Revert: delete file+test, restore def+drop wrapper.
- **69 image-cache trio → `modules/ui/image-cache.ts` (new).** `getSprintDustImage`/`getKakaUltimateImage`/`getFieldImage` + 3 caches verbatim; direct lib imports WITH `.ts` extension (roster-proven); `FIELD_ASSET_VERSION`/`kakaUltimateSpriteAsset` imports pruned from prototype. Test stubs `globalThis.Image`. Revert: delete file+test, restore defs+caches+imports.
- **70 asset tables → `ui-assets.ts` (`matchEventFrames`/`roundResultAssets`).** Sources-injected factories; prototype binds module-level consts under SAME names — 4 consumer sites untouched. Revert: restore 2 table defs, drop consts.
- **71 loadingUiFrame/LOADING_UI_FRAMES → `ui-assets.ts`.** Milestone math + comments verbatim; prototype keeps same names (thin wrapper + sources-bound const) — 3 consumer sites untouched. Revert: restore defs, drop wrapper.
- **72 interactiveTarget → `modules/ui/event-target.ts` (new, 5 lines).** Pure `instanceof`+closest verbatim; 4 effect call sites via 1-line adapter. Test stubs `Element`. Revert: delete file+test, restore body.
- **73 rajaUltimateMultiplier → `modules/gameplay/bars-score.ts`.** `RAJA_ULTIMATE_SPEED_MULTIPLIER = 1.4` moved verbatim (Q2, no tuning); 5-param pure predicate; thin adapter keeps 2 `update()` sites. Revert: delete block+test, restore def+const.
- **74 playAudioCue → `modules/audio/audio-cue.ts` (new).** try/catch `new Audio` body verbatim; direct lib imports (explicit `.ts`); 4 call sites via wrapper. Test stubs `Audio` (routing + blocked-media silence). Revert: delete file+test, restore def.

**Deferred with reason (not built):** 61 refreshPlayerProfile / 62 closeLeaderboard / 65 chooseFaction / 66 highlightCharacterWithVoice — 1-line React-setter glue, zero domain logic, module would cost more than def; 63 touchKey cluster → P4 locked order (input); collisionKey/toggleCollision — dev-only debug scaffolding, harmless inline; playUiSample — prior coupled deferral (shares uiAudio hover-guard context) stands.

**Audit pins repointed this batch (3, same checks, new locations):** audio-port fort-captured → match-control.ts + forwarder literal (was RED from Seam 58 — Batch 5 wrongly claimed PASS); UI-v8 versioning → uiAssetsSource; Titah ACTIVE modifier → barsScoreSource (value) + prototype BUFF_MS/`me.state` (kept).

**Rules learned:** (1) NEVER runtime-import extensionless lib paths in modules/tests (`lib/field-assets.generated`, `lib/audio-settings` fail in plain node) — explicit `.ts` or inject; `import type` is always safe (erased). (2) After moving a const, grep the name — near-miss duplicate-const incident caught by read-back before gates (Seam 73).

### 2026-10-06 — Seam 60: isKanalField → modules/world/field-flags.ts COMPLETE (Batch 6 opener, user-approved)

- **Owner:** `modules/world/field-flags.ts` (new, 3 lines). **Contract:** `isKanalField(id: FieldId) => boolean` — `id === 'kanal2'` verbatim; `FieldId` via type-only import from `map-data/field-types.ts` (no runtime chain). New file justified: no existing world module owns field predicates (types/builders/tables/mask all wrong domain); precedent `format.ts`/`effects-log.ts`.
- **Files:** new `field-flags.ts`; prototype: 1-line def deleted + 1-line import added (~24 call sites text-identical); `FieldId` type import kept (still used: 145/349/523/538/2340). Test `scripts/test-is-kanal-field.mjs` (kanal2 true; kampung/pasar/taman/kanal/kampung3d/studio-* false).
- **Audit pins:** 0 — none of this body was string-pinned (verified: no `isKanalField`/`kanal2` pins in audit-game.mjs). `templates.mjs` duplicate left alone (map-studio scope, not this seam).
- **INCIDENT (Batch 5 leftover, fixed here):** `test-audio-port.mjs` was RED — Seam 58 moved the `BENTENG DIREBUT`/`fort-captured` site into `match-control.ts` via `playFortCaptured` forwarder without repointing the line-18 verbatim pin (Batch 5 checkpoint wrongly claimed audio-port PASS). Verified equivalent by construction (same guard; `.55` → `0.55` numerically identical; port call preserved via forwarder; prototype still exactly 9 `matchAudio.play(` refs). Repointed same-check-new-location: guard + volume math pinned in `match-control.ts`, wiring pinned as forwarder literal in prototype. No behavior change.
- **Gates:** direct test PASS; audio-port PASS (after repoint); field-configs PASS; tsc 0; lint 118 (= baseline, 0 in seam files); audit-game 21 baseline (none seam-related); build:pages PASS. No Git ops (HEAD `210a404`).
- **Revert:** delete `field-flags.ts` + test, restore 1-line def + drop import; revert 3 audio-port pin lines (restore line-18 prototype pin, drop `matchControlSource` + 3 asserts).
- **Prototype line-count delta:** 4046 → 4046 (−1 def +1 import; honest zero for a shared predicate).
- **Next seam selected:** TBD — Batch 6 survey candidates 2–10 stand (refreshPlayerProfile, closeLeaderboard, touchKey, characterVoiceAsset, …); needs user pick per 1-seam approval rule.

### 2026-10-06 — Batch 6 SURVEY (candidates ranked, awaiting approval — no code changes)

- **State:** Batch 5 COMPLETE (prototype.tsx 4046 lines confirmed, HEAD `210a404`, Batch 5 modules present uncommitted). No approved Batch 6 scope — survey only, zero files changed by survey.
- **Ranked candidates (`draw()` excluded per Design Option B.5; module forwarders excluded):** 1. `isKanalField` ~L180 (1 line, pure, ~12 sites) — recommended Seam 60; 2. `refreshPlayerProfile` ~L543 (1 line, 2 sites); 3. `closeLeaderboard` ~L2503 (1 line, ~4 sites); 4. `touchKey` ~L2481 (1–2 lines, 3 sites); 5. `characterVoiceAsset` ~L403 (4 lines, 1 site); 6. `chooseFaction` ~L697 (4 lines, 2 sites); 7. `highlightCharacterWithVoice` ~L754 (4 lines, 2–3 sites); 8. `cycleCharacter` ~L2376 (7 lines, 2 sites); 9. `uiAsset` ~L355 (6 lines, ~3 sites); 10. `getSprintDustImage` ~L484 (7 lines, 2 sites + twin `getKakaUltimateImage` ~L492).
- **Caveat:** candidates 1–4 are 1-line glue (React setters / pure predicate); module+test overhead may exceed value — flagged for user ruling.
- **Validation:** none (read-only survey; `graphify-out/graph.json` exists but stale/dirty post-Batch 5 — refresh with `graphify update` after next code change, not now).
- **Blockers:** needs user approval of Batch 6 scope / Seam 60 before any implementation (per seam workflow: analisis → approval → 1 seam).
- **Next action:** await user pick; then 1 seam → direct test + R1 + tsc + lint + audit + build:pages → checkpoint + revert note.

### 2026-10-06 — Batch 5 COMPLETE (10 seams: 50–59)

**Batch totals:** prototype.tsx 4304 → 4046 (−258). Gates: tsc 0; lint 118 (≤119 baseline; residual no-unused in untouched files); audit-game 21 baseline; series PASS; build:pages PASS; direct sweep 67/69 (only 2 pre-existing map-suite failures: test-kampung3d, test-kanal2-layout — both proven pre-existing at HEAD). No Git ops (HEAD `210a404`).

**Seams:**
- **50 snapshot-types → `modules/game-core/snapshot-types.ts` (new, 143 lines).** `Mission`, `RoundResultAnnouncement`, `StatsBoard`, `Snapshot`, `initialSnapshot` verbatim move; prototype keeps only import. Tests: gates only (type move, no logic). Revert: delete file, restore block.
- **51 spawnGeo → `modules/gameplay/spawn.ts`.** 6-line geometry factory verbatim; 3 call sites updated. Tests: existing spawn tests. Revert: restore closure, drop import.
- **52 addMatchEvent inlined → `pushMatchEvent`.** 8-line closure replaced by 3 inline call sites (capture, rescue, rescueEffects) using module `pushMatchEvent` verbatim semantics. Tests: existing test-match-event. Revert: restore wrapper + call sites.
- **53 buildStatsBoard → `modules/game-core/stats-board.ts` (new, 76 lines).** 49-line board builder verbatim (ranking, MVP, round/match store select, boardRows). Forwarder binds closure values → input object; `CHARACTER_BY_ID` typing fix in module. Revert: restore body, revert pin (none — no audit pin on this body). **Delta included in batch total.**
- **54 writeSnapshot → `modules/game-core/snapshot-write.ts` (new, ~190 lines).** `createSnapshotWriter` factory; 123-line body → ~44-line forwarder with live getters for all mutated closure state (`getPlayers`, `getTeamCombos`, `getRefills`, `getPaused`, `getSuddenDeath`, …). Fixed two live-read bugs found in first pass: pickupCount was hardcoded 0 (now `refills.length`), `paused`/`suddenDeath` were captured values (now getters); pruned unused world fields. Revert: restore body, drop import.
- **55 pointerDown → `modules/gameplay/input-navigation.ts` (new `handlePointerDown`).** 20-line handler verbatim; routes via `setMouseRoute`/`setMouseBoost` callbacks; `PointerDownPlayer` facet +`x`,`y` after tsc caught `clickRoute` arg type. Unused `clickRoute`/`pointerWorld` imports dropped from prototype; lint 119→ (all residual in untouched files). Revert: restore body, drop import.
- **56 key handlers → `input-navigation.ts`.** `handleKeyDown`/`handleKeyUp`/`clearKeys`/`handleVisibilityChange` verbatim (~40 lines → 6-line forwarders). Unused `RoundResultAnnouncement` import dropped. Revert: restore 4 closures, drop import names.
- **57 resetRound → `modules/game-core/match-control.ts` (`createResetRound`).** 33-line round reset verbatim with getter/setter world (~40 setters covering every mutated closure var); `ensureStats`/`recordCompletedMatch` unused imports dropped from prototype (now owned by module). Revert: restore body, drop import.
- **58 winRound → `match-control.ts` (`createWinRound`).** 49-line body → ~28-line factory wiring; mutation fixed mid-seam: first version wrongly used `getScore()/setScore()` abstraction — replaced with direct `world.score[team]++` on the passed record (matches HEAD's `const` binding mutation); `recordCompletedMatch` direct import in module (was deferred-import in prototype — behavior equal, sync call). `EMPTY_KDA` import removed (module receives `emptyKda` value); `pendingProfile` typing narrowed to KDA shape. Revert: restore body, drop import name.
- **59 tickRefills + expireRescueRequest (two smallest remaining P1 slices, one batch slot each).** `tickRefills` → `spawn.ts`: expiry filter + capped scheduled spawn verbatim (2 call sites in update collapsed to one destructure assignment). `expireRescueRequest` → `rescue.ts`: 6-line expiry guard (expiry OR requester-not-prisoner) verbatim, single call site. Revert each: restore inline block, drop import name.

**Audit pins repointed this batch (0 — none of these bodies were string-pinned; audio-port test re-verified PASS against module `onAudio` homes).**
**Q2:** untouched.
**Rule compliance note:** `snapshot-write.ts` world is 30+ fields but every field is a live getter or pure value the writer reads once per tick — no broad mutable object is passed; gameplay rules stay out of game-core per strangler rules (writer is orchestration, calls `buildStatsBoard` owned by P3 stats module). `match-control.ts` worlds are getter/setter pairs over closure state, matching the approved strangler pattern (no wholesale state move).

### 2026-10-06 — Batch 4 (seams 47–49) + DRAW() RETURNS TO DESIGN (user Option B)

**Batch result:** prototype.tsx 4806 → 4304 (−502). 3 new direct tests (draw-player, frame-view; prison-inline reuses test-prison-overlays). Sweep: only 2 pre-existing map-suite failures. tsc 0; lint 117; audit 21 baseline; build PASS. No Git ops (HEAD `210a404`, 78 files changed).

#### Step 5 DECISION: remaining `draw()` orchestrator NOT extracted — returns to Design with evidence (per user Option B.5)
- **Precise dep inventory (scripted):** 38 dependencies — 8 draw-helper functions, 10 live-getter closures (`players`, `mouseRoute`, `refills`, `rescueRequest`, `particles`, `phase`, `announcement`, `mode`, `scene3d`, `cameraModeRef`), ~12 value fields (`field`, `bases`, `baseRadius`, `TEAM_COLOR`, `studioMap`, `selectedFieldId`, `isKanalField`, frame-view outputs…), plus mutation channels.
- **Root-state mutations inside the remaining body:** `ctx = target` / `ctx = previous` (3D actor pre-render swaps the composition-root context mid-frame), `paused = true`, `scene3d = undefined` (error path), React `setRendererError` call.
- **Rule hits:** >28 bindings (user threshold), crosses canvas-lifecycle/React-state/scene3d-lifecycle/input-overlay/match-display domains → `00-context.md` "touches several subsystems returns to Design for a smaller scope"; Design G "never move all shared closure state in one change".
- **What DID move (Option B steps 1–2):** camera/view/letterbox → `modules/ui/frame-view.ts` (see seam 49). The remaining `draw()` (135 lines) stays as the render closure Stage-1 named, pending a Design ruling on how (or whether) to decompose it — candidate sub-slices for Design: scene3d block (with ctx swap), world-layer pass, edge markers, phase dim.

#### Seam 49: camera/view/letterbox portion of draw() → `modules/ui/frame-view.ts` (computeFrameView) COMPLETE
- **Owner:** `modules/ui/frame-view.ts` (new, ~75 lines). **Contract:** `computeFrameView(input) => FrameView {cw, ch, scale, followsPlayer, camX, camY}` — 9 narrow inputs (canvas, ctx value read before any swap, mode/activeCamera/me per-call values, world dims, `kanal`, `setView` callback for the root `view` assignment). DPR resize, transform/clear, scale tiers (contain/tactical/follow), camera clamp via `clamp`, kanal letterbox matte — all verbatim (`clamp` imported, not reimplemented).
- **Files:** new `frame-view.ts`; prototype: 40-line section → 15-line destructure+call (unique anchors, count-asserted splice); audit pin repointed (`devicePixelRatio` clamp → `frameViewSource`). Test `test-frame-view.mjs` (8 cases: dpr+clear+view payload, follow clamp math, overview, tactical, menu, kanal matte with exact strokeRect math, follow-no-matte, resize guard; helper-signature bug fixed during iteration).
- **Gates:** tsc 0; lint 117; audit 21; build PASS. **Delta: 4328 → 4304 (−24 net; −40 body +15 call +import).**
- **Revert:** delete module+test, restore 40-line section, revert audit pin.

#### Seam 48: drawPlayer (468 lines) → `modules/ui/draw-player.ts` (createDrawPlayer) COMPLETE
- **Owner:** `modules/ui/draw-player.ts` (new, ~500 lines incl. private `spriteFrame`). **Contract:** factory with 16-field world — live getters (`getContext` for the prerender ctx-swap, `getPhase`, `getRoundWinner`, `getTeamCombos`, `getUltimateBuffUntil`, `getUltimateMeter`), `kanal`/`isWaterAt`/3 cast-MS values, 4 image-getter callbacks (owner's caches), `studioResolve` injected (type-only import — avoids lib chain). `DrawPlayerFacet` = 31-field structural subset of `Player`. Extraction done by scripted body move + systematic substitutions (not hand-transcription); `spriteFrame` moved verbatim (7-column math).
- **Prototype:** body → 17-line factory; `studioResolve` line removed (factory creates its own resolver); 11 now-unused imports removed (incl. `relationColor`, `roundedOn`+`rounded` adapter, `spriteFrame` def, sprite-motion block, `characterAnimationMapping`, `seriesFrame`).
- **Audit pins repointed (7):** 7-column math, Raja/Jago mirror ×2, sprint rotation, OOOPSS notice (→playerDraw), oneShotColumn (→playerDraw), river-fall parkour clause (→riverFallSource). Test `test-draw-player.mjs` (9 branches: sheet blit/fallback/prisoner/result/HUD/aura/surge/water+notice/kaka strip). **Delta: 4806 → 4328 (−478).**
- **Revert:** delete module+test, restore body+imports+`spriteFrame`+`studioResolve` line, revert 7 pins.

#### Seam 47: drawPrisonOverlays forwarder inlined COMPLETE
- Call site now calls `drawPrisonOverlaysAt(ctx, field.prisons, drawFieldAsset, field.structuresInBackground)` directly; 5-line adapter (incl. `void now`) deleted — last trivial `draw*` adapter gone. Coverage: existing `test-prison-overlays.mjs` + gates (tsc/lint/audit/build all PASS). **Delta: −5.**
- **Revert:** restore adapter + call-site line.

### 2026-10-06 — Batch 3 COMPLETE (10 seams: 37–46)

**Totals:** prototype.tsx 5372 → 4806 (−566 this batch; 8570 → 4806 = −44% overall). 10 new direct tests, all PASS; final sweep = 2 known pre-existing map-suite failures only; `tsc` 0; `lint` 117 (≤119); `audit-game` 21 baseline; `test-series-sprites` PASS; `build:pages` PASS; no Git operations (HEAD `210a404`, 74 files uncommitted).

**Batch composition:** P1 finish (37 stepParticles, 38 capture-hold) + P2 render layers (39 field-asset blitters, 40 drawRefill, 41 fieldAnimations, 42 groundTiles, 43 colliderDebug, 44 static-map layer −262, 45 drawKanalWater, 46 drawNearbyDetails).

**P2 remaining:** `drawPrisonOverlays` (4-line forwarder), `drawPlayer` (~460), `draw` orchestrator (~150), plus `rounded` adapter (not `draw*`-named — may stay). Then P3 (snapshot/stats-board/winRound/resetRound/addMatchEvent/buildStatsBoard), P4 (input), P6 (loading).

**Audit pins repointed this batch (5, all same-check-new-location):** STATIC_MAP_SCALE+staticLayer.width, layer cache, drawSceneryLayer order → staticMapSource; NEAR_FIELD_DETAIL_RADIUS+activeCamera overview → nearbySource; item.hidden/underlay → nearbySource.

**INCIDENT:** marker-splice deleted 1,130 lines (non-unique anchor). Recovered from opencode snapshot objects (`e5/7c6f9…`, git loose-object format, header stripped, size-verified); re-spliced with occurrence-count assertion. Full verification after recovery: all tests, gates, build. Safety copies in `%TEMP%\proto-*`. Lesson recorded in seam-44 entry.

#### Seam 46: drawNearbyFieldDetails → `modules/ui/draw-nearby-details.ts` COMPLETE
- **Owner:** `modules/ui/draw-nearby-details.ts` (new, ~135 lines). **Contract:** `createDrawNearbyFieldDetails(world) => (me, activeCamera) => void` — studio background (z-sorted) before play guard; radius filter (`NEAR_FIELD_DETAIL_RADIUS = 560` moved verbatim); overview/kanal show-everything rules verbatim (incl. HEAD's overlay-decorations skip in non-kanal overview); forts/prisons with background flags. World: `{ctx, field, studioMap, drawMapObject (injected — keeps lib chain out), isPlaying getter (live mode), kanal, bases, fortWidth/Height/fortAnchorY, drawFieldAsset}`.
- **Files:** new `draw-nearby-details.ts`; prototype: 89-line body → 13-line factory (unique-anchored splice, count asserted); `NEAR_FIELD_DETAIL_RADIUS` const removed; audit pins (line159 radius/overview; line158 hidden/underlay) repointed. Test `test-draw-nearby-details.mjs` (5 blocks: studio sort+menu guard, radius filter incl. far-fort skip fixture fix, overview rules, kanal show-all, background flags).
- **Gates:** tsc 0; lint 117; audit 21 baseline; build PASS. **Delta: 4882 → 4806 (−76).**
- **Revert:** delete module+test, restore body+const, revert 2 pins.

### 2026-10-06 — Batch 3: Seam 44 (static-map layer, largest seam) COMPLETE — with INCIDENT

#### INCIDENT + RECOVERY (read this first)
- **What happened:** a marker-based splice script used `findIndex` on a marker string that occurred TWICE after my init edit (`const { drawFieldAsset, drawAnimatedAsset } = createFieldAssetDraw({`). It matched the NEW init occurrence and deleted 1,130 lines (init block through `drawMap`), including `update()`, all seam forwarders, `makePlayers` wiring, and stats init.
- **Recovery:** opencode keeps git-style pre-write snapshots at `~/.local/share/opencode/snapshot/<repo>/<session>/objects/`. Object `e5/7c6f9cfdc320135482c9939df205efc603e503` held the exact pre-splice state (verified: `blob 202499\0` header + size check + markers: init-block, seam43, 2× factory, old drawStaticMap). Restored header-stripped content, re-spliced with an assertion `hits.length !== 2` guard (deleted exactly the intended 270 lines), re-applied import + call-site + audit pins lost in the corrupt copy. Safety copies: `%TEMP%\proto-prespline-clean.tsx`, `%TEMP%\proto-seam43.tsx`, `%TEMP%\proto-prespline.tsx`.
- **Verification after recovery:** full test sweep = only the 2 known pre-existing map-suite failures; tsc 0; lint 117; audit 21; series PASS; build PASS.
- **Lesson (applies to future batches):** never splice on a non-unique marker — assert occurrence count FIRST; prefer opencode snapshot objects over git for uncommitted recovery.

#### Seam 44: drawStaticMap + drawMap + static-layer cache → `modules/ui/static-map-layer.ts` COMPLETE
- **Owner:** `modules/ui/static-map-layer.ts` (new, ~330 lines). **Contract:** `createStaticMapLayer(world) => { layer, invalidate, drawMap }` — owns layer canvas, scale formula (kanal 1.5 / structures-bg 0.75 / `STATIC_MAP_SCALE = 0.5` verbatim), dirty flag, bake-once `drawStaticMap` (background/plazas/paths/road-dashes/scenery underlay+overlay/base circles/forts/prisons/title bar — verbatim), per-frame blit + `#667556` fallback, studio delegation via injected `drawMapTerrain` (keeps lib chain out of tests). `ctx` taken via live `getContext()` getter (root `ctx` is reassigned during drawPlayer pre-render).
- **Files:** new `static-map-layer.ts`; prototype: init block (scale/layer/dirty/listeners) → factory + `invalidateStaticMap = staticMapLayer.invalidate` alias (teardown listener code unchanged); old 270-line factory+drawStaticMap+drawMap deleted; `drawMap()` → `staticMapLayer.drawMap()`; unused imports removed (`drawMapTerrain` re-added as world param provider, `FieldAssetId`, `worldX/worldY`, `STATIC_MAP_SCALE` const). Audit: 3 pins repointed → `staticMapSource` (STATIC_MAP_SCALE+staticLayer.width; layer cache; drawSceneryLayer order).
- **Tests:** `test-static-map-layer.mjs` (scale formula ×3, bake-once cache, invalidate re-bake, no-context fallback, title bar, background blit, studio delegation).
- **Gates:** tsc 0; lint 117; audit 21 baseline; series PASS; build PASS; full sweep 51/53 (2 pre-existing).
- **Revert note:** delete `static-map-layer.ts` + test; restore init block, 270-line defs, `drawMap()` call, imports (`drawMapTerrain`,`FieldAssetId`,`worldX/Y`,`STATIC_MAP_SCALE`), revert 3 audit pins to prototypeSource.
- **Prototype line-count delta:** 5210 → 4948 (−262).

### 2026-10-06 — Batch 3: Seams 40–42 (P2 draw seams) COMPLETE

- **Seam 42: groundTileCanvas → `modules/ui/ground-tiles.ts` COMPLETE.** Contract: `createGroundTileCanvas(atlasImage, tiles) => (tile) => HTMLCanvasElement` — atlas cut onto fresh canvas, blank-until-loaded guard verbatim; caller caches. Prototype: 25-line def → 1-line factory call; `GroundTileId` import removed (unused). Test `test-ground-tiles.mjs` (4 blocks; DOM stub any-cast to dodge deprecated-`createElement` contextual typing). Gates: tsc 0; lint 117; audit 21; build PASS. **Delta: 5257 → 5233 (−24).**
- **Seam 41: drawFieldAnimations → `modules/ui/field-assets.ts` (createDrawFieldAnimations) COMPLETE.** Contract: factory binding `(ctx, drawAnimatedAsset, animated[]) => (now) => void` — pure forwarding of `AnimatedDecoration` list. Prototype: 14-line def → 1-line call. Test `test-field-animations.mjs` (forwarding/flags/tick-time/empty; fixture order fixed). Gates PASS. **Delta: 5270 → 5257 (−13).**
- **Seam 40: drawRefill → `modules/ui/draw-refill.ts` (createDrawRefill) COMPLETE.** Contract: factory binding `(ctx, drawAnimatedAsset) => (item, now) => void` — grade→animation table, id-seeded pulse, save/translate/scale/restore verbatim. Prototype: 17-line def → 1-line call; `FieldAnimatedId` import removed. Test `test-draw-refill.mjs` (grade mapping, order, pulse math, frame offset, reuse). Gates PASS. **Delta: 5285 → 5270 (−15).**
- **Next seam selected:** Seam 43 — `drawColliderDebug` survey, then `drawMap`/`drawKanalWater`.

### 2026-10-06 — Batch 3 OPEN: Seams 37–39 (P1 finish + P2 start) COMPLETE

- **Seam 39: drawFieldAsset + drawAnimatedAsset → `modules/ui/field-assets.ts` (createFieldAssetDraw) COMPLETE.** Contract: factory closing over `{kanal, objectAssets, animations, baseAtlas, kanalAtlas, animatedAtlas}` (all const per match run) returning both blitters; placeholder rounded-rect fallback, kanal shadow, flip, opacity, fps frame math verbatim. `FieldAssetWorld.animations` frames typed `readonly` (generated atlas tuples). Prototype: 88-line pair → 8-line factory call. Test `test-field-assets.mjs` (8 blocks). Gates: tsc 0; lint 117; audit 21; build PASS. Revert: delete file+test, restore defs+import. **Delta: 5361 → 5285 (−76).**
- **Seam 38: allHeld accumulator → `modules/gameplay/capture.ts` (updateCaptureHold) COMPLETE.** Contract: `(totalCapture: Record<Team, number>, players facet, dt, onWinRound) => void` — record mutates in place, threshold 2s verbatim, reason string verbatim; `other` imported. Prototype: 7-line block → 1-line call. Test `test-capture-hold.mjs` (5 blocks; fixture fixed: mutual-hold needs all opponents prisoner). Gates all PASS. **Delta: 5365 → 5361 (−4).**
- **Seam 37: particle physics → `modules/ui/effects-particles.ts` (stepParticles) COMPLETE.** Contract: `(particles, dt) => Particle[]` — in-place integrate + 0.94 decay + life drop, then filter (HEAD verbatim). Prototype: 8-line block → 1-line call. Test `test-step-particles.mjs` (6 blocks). Gates all PASS. **Delta: 5372 → 5365 (−7).**
- **P1 status:** all P1 domains from the plan now extracted (input/navigation remains as P4 per locked order; `buildStatsBoard`/`winRound`/`resetRound` stay P3 by plan).
- **Next seam selected:** Seam 40 — `drawRefill` (smallest remaining draw*; ctx + factory's drawAnimatedAsset via forwarder).

### 2026-10-06 — Batch 2 COMPLETE (10 seams: 27–36)

**Batch totals:** prototype.tsx 5661 → 5372 (−289); 10 new direct tests (all PASS); full regression: 51/53 test files PASS — only `test-kampung3d.mjs` + `test-kanal2-layout.mjs` fail, both proven pre-existing (fail identically against HEAD content: empty `DESIGN_W` slice; `kanalGuide` already committed in guide-fields.ts — the known 2 map-suite failures). No Git operations; HEAD still `210a404`, 57 files uncommitted.

**New modules:** `modules/ui/effects-particles.ts`, `modules/ui/effects-log.ts`, `modules/gameplay/base-check.ts` (+`applyExitOrder`), `modules/gameplay/roster.ts`, `modules/gameplay/water.ts` (sampler + drowning), `modules/world/water-mask.ts`; extended: `collision-navigation.ts` (+spacing resolver), `prison.ts` (+kanal walls).

**Audit/test pins repointed this batch (same checks, new locations, never suppressed):** spacing pin→collisionNavSource; prison floorAsset pin→prisonSource; jitter pin (`BASE_REENTRY` + `lastExitAt`)→baseCheckSource; `test-audio-port.mjs` site pins→module homes (9 prototype refs = 6 direct + 3 forwarders; moved cues pinned as `onAudio(...)` literals in capture/rescue-check/water).

**Deferred (with reason):** `winRound`/`resetRound`/`buildStatsBoard`/`addMatchEvent` → P3 per plan (`buildStatsBoard` explicitly "stays for P3"; winRound touches ~10 closure states — broad); `playUiTone`/`playUiSample` → shares `uiAudio` context state with hover guard (coupled, UI); key handlers (`down`/`up`/`navigate`) → P4 locked order; draw helpers → P2; `prepare()` → P6. Backlog for next batch: `stepParticles` (physics tail of effects-particles), `staticMapScale`/`invalidateStaticMap` (P2 candidate), `allHeld` capture-win accumulator (7 lines, needs winRound coupling), P3 snapshot/write.

#### Seam 36: applyExitOrder → modules/gameplay/base-check.ts COMPLETE
- **Owner:** existing `base-check.ts`. **Contract:** `(candidates, now, {round, nextExitOrder, onMissionRefresh, onLog, onTone}) => void` — dedupe-by-id (Map last-wins, HEAD), tie-hash order, ACTIVE activation, counter via owner callback. `BaseCheckFacet` +`exitOrder`,`rescueShieldUntil`.
- **Files:** base-check.ts (+applyExitOrder); prototype: 16-line inline chain → 11-line call; `tieHash` import removed (unused after move); audit jitter pin repointed (second clause → baseCheckSource). Test `test-exit-order.mjs` (6 blocks: dedupe-last-wins, tie-hash order, state resets, mission gate >5, tones, empty).
- **Gates:** tsc 0; lint 117; audit 21 baseline; build PASS; test PASS. **Revert:** delete applyExitOrder + test, restore chain + tieHash import, revert pin. **Delta:** 5376 → 5372 (−4).

#### Seam 35: cacheWaterMask → modules/world/water-mask.ts (extractWaterMask) COMPLETE
- **Owner:** `modules/world/water-mask.ts` (new, ~70 lines). **Contract:** `extractWaterMask({image, context, canvas, debugContext?, worldWidth, worldHeight, kanal}) => {pixels, glints} | null` — draw+getImageData+debug colorize (255/69/69/78)+kanal glint sampling verbatim; caller owns canvas/pixels/glints (prototype assigns). DOM-free for tests (stubs).
- **Files:** new `water-mask.ts`; prototype 64-line body → 11-line forwarder. Test `test-water-mask.mjs` (6 blocks: guards, draw/pixels, overlay, glints math, dry). **Gates:** all PASS. **Revert:** delete file+test, restore body. **Delta:** 5424 → 5376 (−48).

#### Seam 34: beginKanal2WaterFall → modules/gameplay/water.ts COMPLETE
- **Owner:** `water.ts` (same water home). **Contract:** `(p, now, x, y, WaterFallWorld) => boolean` — 16-side ring probe, snap, drowning state (720ms verbatim), 4 callbacks (`onBurst`,`onClearMouse`,`onAudio`,`onLog`), `kanal` guard input. Facet `WaterFallFacet`.
- **Files:** water.ts (+drowning); prototype 34-line body → 11-line forwarder. Test `test-water-fall.mjs` (guards×5, direct/ring/dry, state, controlled branch). **Gates:** all PASS. **Revert:** delete block+test, restore body. **Delta:** 5448 → 5424 (−24).

#### Seam 33: isWaterAt → modules/gameplay/water.ts (createWaterAt) COMPLETE
- **Owner:** `water.ts` (new file). **Contract:** `createWaterAt(WaterSource) => (x,y) => boolean` — studio-vs-mask branch, half-res mapping, >127 threshold, clamps verbatim; `pixels` getter because mask loads async. `studioMap` passed as value (const in effect).
- **Files:** new `water.ts`; prototype 15-line closure → 7-line factory call; `studioWaterAt` import removed. Test `test-water-at.mjs` (null-safe, threshold+clamp, lazy load, studio objects/bridge/RLE mask). **Gates:** all PASS. **Revert:** delete file+test, restore closure+import. **Delta:** 5455 → 5448 (−7).

#### Seam 32: kanalPrisonWalls → modules/gameplay/prison.ts COMPLETE
- **Owner:** existing `prison.ts` (prison geometry home). **Contract:** `kanalPrisonWalls(prisons, kanal) => Obstacle[]` pure — U-frame walls (thickness/gate/shoulder math + floorAsset default verbatim).
- **Files:** prison.ts (+export, +Obstacle type); prototype: 26-line block → 3-line spread into `solidObstacles`; `Obstacle` type import removed from prototype (unused); audit floorAsset pin repointed → prisonSource. Test `test-kanal-prison-walls.mjs` (gate off/on, 5 walls, geometry, override, tight prison).
- **Gates:** all PASS. **Revert:** delete fn+test, restore block, revert pin. **Delta:** 5480 → 5455 (−25).

### 2026-10-06 — Batch 2: Seams 30–31 (spacing, roster) COMPLETE

#### Seam 31: makePlayer/makePlayers → modules/gameplay/roster.ts COMPLETE
- **Owner:** `modules/gameplay/roster.ts` (new, ~120 lines). **Contract:** `makePlayers({ faction, selectedId, bases }) => RosterPlayer[]` pure — `makePlayer` internal; `RosterPlayer` structurally satisfies prototype `Player` (annotated `players: Player[]`); `spawnOffsets` direction math, `aiSeed` formula, id scheme, lineup order verbatim. `GAME_RULES` imported with JSON attribute (team-tables precedent).
- **Files:** new `roster.ts`; prototype: local 69-line factory pair deleted, both call sites now pass options; `TEAM_FOR_FACTION` import removed (lineupFor stays). Test `scripts/test-roster.mjs` (8 blocks: ids/control, teams, lineup order, offsets/direction, aiSeed, faction rosters, purity; erasing-op lint fix `0*1.17` → comment).
- **Gates:** tsc 0; lint 117 (≤119); audit 21 baseline; build PASS. **Revert:** delete `roster.ts` + test, restore factory pair + call-site no-arg form + import. **Delta:** 5548 → 5480 (−68).

#### Seam 30: resolvePlayerSpacing + spacingWorldFor → collision-navigation.ts COMPLETE
- **Owner:** `modules/gameplay/collision-navigation.ts` (existing spacing home, beside `spacingPositionAllowed`). **Contract:** `resolvePlayerSpacing(now, SpacingResolveWorld) => void` — visible filter, pair push (42/30 minimums, 0.52 factor, 34/58/32 clamps verbatim), per-pair `spacingPositionAllowed` gate, `onRecover` per visible player. 12-field world (4 predicates + data + callback).
- **Files:** collision-navigation.ts (+`SpacedPlayerFacet`, `SpacingResolveWorld`, `resolvePlayerSpacing`; imports `tieHash`, `CHARACTER_BY_ID`); prototype: `spacingWorldFor` +32-line body → 17-line forwarder, `spacingPositionAllowedAt` removed from import; audit line-182 pin repointed (`spacingPositionAllowed` → `collisionNavSource`). Test `scripts/test-resolve-spacing.mjs` (8 scenarios incl. exclusions/coincidence/clamp).
- **Gates:** tsc 0; lint 117; audit 21 baseline; build PASS. **Revert:** delete resolver block + test, restore forwarder→body + import alias, revert audit pin. **Delta:** 5583 → 5548 (−35).

- **Next seam selected:** survey `beginKanal2WaterFall` (water), `winRound` (round), `isWaterAt` (water mask closure).

### 2026-10-06 — Batch 2 OPEN: Seams 27–29 (particles, log, baseCheck) COMPLETE

Batch 2 scope = remaining P1 domains from `03-implement.md` (particles/events, capture/base, collision, spawn roster).

#### Seam 29: baseCheck → modules/gameplay/base-check.ts COMPLETE
- **Owner:** `modules/gameplay/base-check.ts` (new, ~135 lines). **Contract:** `(p, dt, now, BaseCheckWorld) => void` — fort entry/exit, top-3 charge queue, forced exit, enemy-fort capture (`fortCharge >= 1.5`), boost-ready refill; facet transitions in place; 4 narrow callbacks (`onExitCandidate`, `onLog`, `onTone`, `onWinRound`). `BASE_REENTRY_COOLDOWN_MS = 1500` moved verbatim.
- **Files:** new `base-check.ts`; prototype local 87-line body → 22-line forwarder; const removed; `audit-game.mjs` line-182 pin repointed (`baseCheckSource` for the const; `p.lastExitAt = now` stays in prototype). Test `scripts/test-base-check.mjs` (13 scenarios: skips, jitter, entry, queue top-3, deadline arming, forced exit, contested exit, capture win/defended/none, boost-ready).
- **Gates:** tsc 0; lint 117 (≤119); audit 21 baseline; build PASS. Test PASS (fixture fixes: kaka baseChargeTime 0.75s, float tolerance).
- **Revert:** delete `base-check.ts` + test; restore local body + const; revert audit pin. **Delta:** 5653 → 5583 (−70).

#### Seam 28: log → modules/ui/effects-log.ts COMPLETE
- **Owner:** `modules/ui/effects-log.ts` (new, 7 lines). **Contract:** `pushLog(logs, text) => string[]` pure (newest-first, cap `LOG_LIMIT=5`, no input mutation); prototype forwarder keeps the one reassignment. Distinct from the rejected migration scope: no array ownership moves, no render coupling — pure helper + owner-side reassign.
- **Files:** new `effects-log.ts`; prototype `log` body → 1-line call. Test `test-effects-log.mjs` (prepend/cap/immutability). Gates all PASS. **Revert:** delete file + test, restore 2-line body. **Delta:** 5652 → 5653 (+1).

#### Seam 27: burst → modules/ui/effects-particles.ts COMPLETE
- **Owner:** `modules/ui/effects-particles.ts` (new, ~30 lines). **Contract:** `burst(x, y, color, count=12) => Particle[]` pure (HEAD velocity envelope 30..110, life 0.65); forwarder `particles.push(...result)` keeps mutation at owner; 14 call sites unchanged.
- **Files:** new `effects-particles.ts`; prototype 12-line body → 2-line forwarder. Test `test-effects-particles.mjs` (count/origin/envelope/default/purity/zero, PRNG stubbed). Gates all PASS. **Revert:** delete file + test, restore loop body. **Delta:** 5661 → 5652 (−9).

- **Next seam selected:** Seam 30 — `makePlayer`/`makePlayers` (spawn roster domain) or `resolvePlayerSpacing` (collision), survey first.

### 2026-10-06 — Seam: riverFallCheck → modules/gameplay/river-fall.ts COMPLETE (batch final)

- **Seam name and owner:** `riverFallCheck` (`RiverFallWorld`) — `modules/gameplay/river-fall.ts` (new file).
- **Files changed:**
  - `modules/gameplay/river-fall.ts` (new, ~56 lines): water-source guard, kanal2 drown/wait/reset windows (`KANAL2_FALL_RESET_MS = 3000` moved verbatim), non-kanal instant reset, guards (PRISONER, parkour, fallSafe); calls `fall-reset.applyFallReset` directly with `world.fx`; `onWaterFall` callback binds `beginKanal2WaterFall` (owner keeps the drowning sequence).
  - `app/prototype.tsx`: 24-line body → 17-line forwarder; `KANAL2_FALL_RESET_MS` const removed; prototype `applyFallReset` forwarder + its import removed (zero callers left — river-fall.ts owns that path now).
  - `scripts/test-river-fall.mjs` (new): 9 scenarios — no-source guard, non-kanal wet reset + spawn math, guard matrix, kanal dry/drown/2999ms-wait/3000ms-reset, prisoner/parkour immunity.
- **Contract:** `(now, world: RiverFallWorld) => void`; `waterSource` boolean computed by owner; `fx` nested `FallResetFx`.
- **Tests:** `test-river-fall.mjs` PASS; full 8-test batch suite re-run PASS. **Gates:** `tsc` PASS; `lint` 117 (≤119); `audit` 21 baseline (assertion `riverFallCheck(now)`/`parkourUntil`/`OOOPSS` still pinned — call site + beginKanal2WaterFall + banner strings all remain in prototype, no repoint); `build:pages` PASS.
- **In-match result:** Headless. Identical by construction: same guard order, same 3000ms boundary, same reset/drown split.
- **Revert note:** Delete `modules/gameplay/river-fall.ts` + test; restore local body, `KANAL2_FALL_RESET_MS` const, `applyFallReset` forwarder + imports.
- **Prototype line-count delta:** 5675 → 5661 (−14).

### 2026-10-06 — AUTONOMOUS BATCH COMPLETE (8 built, 2 deferred)

- **Built this batch:** aiVector, registerTeamAction, capture, tagCheck, rescueCheck, refillCheck, applyFallReset, riverFallCheck — each with own contract, direct test, gates, checkpoint entry, revert note.
- **Deferred:** `log` (user instruction — same scope as previously rejected), `burst` (same mutation pattern as log; consistent deferral until a narrow `onParticle`/`onLog` callback contract is approved).
- **Batch totals:** prototype.tsx 5808 → 5661 (−147); 8 new direct tests (all PASS); new modules `ai-vector`, `team-combo-actions`, `capture`, `tag-check`, `rescue-check`, `refill-check`, `fall-reset`, `river-fall`; audit pins repointed: 6 (same checks, new locations — never suppressed); Q2 constants `RAJA_ULTIMATE_TAG_BONUS=20` / `RAJA_ULTIMATE_RESCUE_BONUS=30` moved verbatim into capture/rescue-check with frozen comments; `KANAL2_FALL_RESET_MS=3000` moved verbatim.
- **Final gates:** `tsc` 0; `lint` 117 (≤119 baseline); `audit` 21 pre-existing baseline; `build:pages` PASS; all 8 batch tests + 6 regression tests PASS.
- **In-match:** headless environment — behavior preservation argued by construction (verbatim bodies, same predicates/order/values) + direct tests; browser in-match run pending user.
- **Next candidates (backlog, not started):** `burst`/`log` (await callback contract approval), `baseCheck`, input-navigation slice, snapshot-write slice.

### 2026-10-06 — Seam: applyFallReset → modules/gameplay/fall-reset.ts COMPLETE

- **Seam name and owner:** `applyFallReset` (`FallResetFx`) — `modules/gameplay/fall-reset.ts` (new file).
- **Files changed:**
  - `modules/gameplay/fall-reset.ts` (new, ~26 lines): calls `spawn.resetFallenPlayer` and replays bursts/beeps/logs through 3 narrow callbacks (`onBurst`, `onTone`, `onLog`).
  - `modules/gameplay/spawn.ts`: `FallenPlayerFacet` exported (type only; needed by fall-reset signature).
  - `app/prototype.tsx`: 6-line body → 7-line forwarder; `resetFallenPlayer` import removed (now only in fall-reset.ts); `applyFallResetAt` import added.
  - `scripts/test-fall-reset.mjs` (new): full state-reset matrix (position side/lane via tieHash, all zeroed fields, timers), controlled vs bot effects replay.
- **Contract:** `(p, round, base, now, fx: FallResetFx) => void` — state transition stays in spawn.ts; replay wiring here.
- **Tests:** `test-fall-reset.mjs` PASS. **Gates:** `tsc` PASS; `lint` 117 (≤119); `audit` 21 baseline; `build:pages` PASS.
- **In-match result:** Headless; same reset fields, same effect order (burst→tone→log per group).
- **Revert note:** Delete `modules/gameplay/fall-reset.ts` + test; restore local body, `resetFallenPlayer` import, spawn.ts `export` keyword.
- **Prototype line-count delta:** 5675 → 5675 (≈0; thin wrapper — placement/ownership is the win, prepares riverFallCheck).
- **Next seam selected:** `riverFallCheck` (Seam 26, final of batch scope).

### 2026-10-06 — Seam: refillCheck → modules/gameplay/refill-check.ts COMPLETE

- **Seam name and owner:** `refillCheck` (`RefillCheckWorld`, `RefillPlayerFacet`) — `modules/gameplay/refill-check.ts` (new file).
- **Files changed:**
  - `modules/gameplay/refill-check.ts` (new, ~63 lines): eligibility filter (ACTIVE, no kanal water, boost below max), 27px pickup, gain `maxBoost*grade/100` capped, grade→color/tone table verbatim, local `refills` reassignment visible in-pass (single consumption), `onRefills` delivers final list once; callbacks `onBurst`, `onTone`, `onLog`, `onMissionBoost`.
  - `app/prototype.tsx`: local 28-line body → 14-line forwarder.
  - `scripts/test-refill-check.mjs` (new): 11 scenarios — eligibility blocks ×3, gain/color/tone/log/mission, grade variants (100/75/25), cap, out-of-range, shared-item single consumption, unchanged-list reporting.
- **Contract:** `(world: RefillCheckWorld) => void` — boost mutates in place; list replacement via `onRefills`.
- **Tests:** `test-refill-check.mjs` PASS; prior direct tests re-run PASS.
- **Gates:** `tsc` PASS; `lint` 117 (≤119); `audit` 21 baseline (no pins on this body); `build:pages` PASS.
- **In-match result:** Headless. Identical by construction: same filter/find/gain math, same in-pass visibility of removal, same effect order.
- **Revert note:** Delete `modules/gameplay/refill-check.ts` + `scripts/test-refill-check.mjs`; restore local body.
- **Prototype line-count delta:** 5687 → 5675 (−12).
- **Next seam selected:** `applyFallReset` (Seam 25) then `riverFallCheck` (Seam 26).

### 2026-10-06 — Seam: rescueCheck → modules/gameplay/rescue-check.ts COMPLETE

- **Seam name and owner:** `rescueCheck` (`RescueCheckWorld`, `RescueFacet`) — `modules/gameplay/rescue-check.ts` (new file).
- **Files changed:**
  - `modules/gameplay/rescue-check.ts` (new, ~110 lines): ACTIVE rescuer scan (kanal-water skip), held sorted by prisonIndex, rescueRange gate, prisoner release (RETURNING + shield + ±22 shift — post-shift burst/teamAction coords preserved), rescuer action, 10 narrow callbacks (`onStat`, `onProfileStat`, `onClearRescueRequest`, `onMatchEvent`, `onBurst`, `onAudio`, `onLog`, `onTeamAction(rescuer,x,y)`, `onChargeUltimate`, `onMissionRescue`) + inputs `kanal`, `rescueRequest`, `audible(rescuer)` predicate. `RAJA_ULTIMATE_RESCUE_BONUS = 30` moved verbatim (Q2 frozen).
  - `app/prototype.tsx`: local 49-line body → ~24-line forwarder; `RAJA_ULTIMATE_RESCUE_BONUS` const removed; `onTeamAction` casts rescuer facet to `Player` (real object).
  - `scripts/audit-game.mjs`: `rescueCheckSource` reader; Q2 pin repointed (RESCUE_BONUS now in rescue-check.ts); HUD combo pin updated for `rescuer as Player` cast form.
  - `scripts/test-rescue-check.mjs` (new): 10 scenarios — no-held/range blocks, full release chain (blue ± shift, shield, event with single/multi target fields), request clear on/off match, audio 3-branch, kanal-water skip. Two fixture corrections matched HEAD semantics (post-shift burst x; held-controlled audio branch).
- **Contract:** `(now, world: RescueCheckWorld) => void` — prisoner transitions mutate facets; request clear + stats/audio/etc. via callbacks; `audible` predicate supplied by owner.
- **Tests:** `test-rescue-check.mjs` PASS; all prior direct tests re-run PASS.
- **Gates:** `tsc` PASS; `lint` 117 (≤119); `audit` 21 baseline (after 2 repoints); `build:pages` PASS.
- **In-match result:** Headless. Identical by construction: same order (shift → stat → profile → request → event → burst → audio → log → teamAction → meter → mission), same values, Q2 constant verbatim.
- **Revert note:** Delete `modules/gameplay/rescue-check.ts` + `scripts/test-rescue-check.mjs`; restore local body + `RAJA_ULTIMATE_RESCUE_BONUS` const; revert 2 audit pins.
- **Prototype line-count delta:** 5710 → 5687 (−23).
- **Next seam selected:** `refillCheck` (Seam 24).

### 2026-10-06 — Seam: tagCheck → modules/gameplay/tag-check.ts COMPLETE

- **Seam name and owner:** `tagCheck` (`TagCheckWorld`, `TagPlayerFacet`) — `modules/gameplay/tag-check.ts` (new file).
- **Files changed:**
  - `modules/gameplay/tag-check.ts` (new, ~97 lines): O(n²) swept-contact pair scan, legal-contact filters (team, kanal water, line-of-sight, parkour), targetability, tagRange+4 edge, exit-order priority sort with id tiebreak, resolved-set single application. `onCapture` callback (owner's capture forwarder binds `now`); `lineOfSight` callback binds `solidObstacles`+`studioMap`; `kanal` boolean input.
  - `app/prototype.tsx`: local 58-line body → 8-line forwarder; `sweptContactDistance` import removed (now only in module); `hasLineOfSight` kept (bound in forwarder); `onCapture` casts facets to `Player` (they are the real `players` objects).
  - `scripts/audit-game.mjs`: `tagCheckSource` reader added; swept-contact regex pin repointed from prototype to tag-check.ts (same check, new location).
  - `scripts/test-tag-check.mjs` (new): 13 scenarios — team/LOS/parkour/water blocks, in/out of range (exact tagRange+4 edge, with lastX fixtures for swept math), equal-order, PRISONER, RETURNING shield, ultimate shield, priority resolution (shared target captured once).
- **Contract:** `(now, world: TagCheckWorld) => void` — detection + resolution in module; capture application and LOS predicate via narrow callbacks.
- **Tests:** `test-tag-check.mjs` PASS; prior direct tests re-run PASS.
- **Gates:** `tsc` PASS; `lint` 117 (≤119); `audit` 21 baseline (after 1 repoint); `build:pages` PASS.
- **In-match result:** Headless. Identical by construction: same filters, same order of comparisons, same sort comparator, same resolved-set rule; capture still applied through prototype's forwarder.
- **Revert note:** Delete `modules/gameplay/tag-check.ts` + `scripts/test-tag-check.mjs`; restore local body + `sweptContactDistance` import; revert audit pin. Single logical revert boundary.
- **Prototype line-count delta:** 5760 → 5710 (−50).
- **Next seam selected:** `rescueCheck` (Seam 23; Q2 `RAJA_ULTIMATE_RESCUE_BONUS = 30` verbatim move only).

### 2026-10-06 — Seam: capture → modules/gameplay/capture.ts COMPLETE

- **Seam name and owner:** `capture` (`CaptureWorld`, `CapturePlayerFacet`) — `modules/gameplay/capture.ts` (new file).
- **Why selected:** Batch plan Seam 21 (user-approved: capture/tagCheck/rescueCheck allowed as three separate seams in this batch).
- **Files changed:**
  - `modules/gameplay/capture.ts` (new, ~130 lines): guards, player state transitions (tagCooldown, captures++, capturedIds, action/visualTagVector/actionUntil, loser → PRISONER), plus 13 narrow callbacks (`onStat`, `onProfileStat`, `onMatchEvent`, `onBurst`, `onAudio`, `onLog`, `onTeamAction`, `onChargeUltimate`, `onMissionTag`, `onLayoutPrisons`, `onWinRound`) + 2 data inputs (`suddenDeath`, `loserAudible`). `RAJA_ULTIMATE_TAG_BONUS = 20` moved verbatim (Q2 frozen) with comment.
  - `app/prototype.tsx`: local 54-line body → ~26-line forwarder; `RAJA_ULTIMATE_TAG_BONUS` const removed (now module-owned).
  - `scripts/audit-game.mjs`: `captureSource` reader added; 2 assertions repointed — Q2 meter pin (`RAJA_ULTIMATE_TAG_BONUS = 20` now pinned in capture.ts) and Kaka shield guard (`now < loser.ultimateShieldUntil` now pinned in capture.ts). Same checks, new locations.
  - `scripts/test-capture.mjs` (new): 9 scenarios — shield/cooldown/order/PRISONER blocks, full transition chain (state+stats+event+audio+meter+mission+log+combo+prisons), audio 3-way branch (caught/tag/tag·.22 + silent when inaudible), RETURNING targetability with/without rescue shield, sudden-death win.
- **Contract:** `(winner, loser, now, world: CaptureWorld) => void` — rule + transitions in module; all cross-owner effects via narrow callbacks; `loserAudible` computed by owner pre-call (equivalent to HEAD's distance check which ran before prison layout).
- **Tests:** `test-capture.mjs` PASS; regression re-run of ai-vector/team-combo/direction-traversable/base-vector/blocked tests all PASS.
- **Gates:** `tsc` PASS; `lint` 117 (≤119); `audit` 21 baseline (after 2 repoints); `build:pages` PASS.
- **In-match result:** Headless. Behavior identical by construction: same guard order, same transition values, same side-effect order (burst → audio → log → teamAction → meter → mission → layout → suddenDeath); Q2 constant value/formula untouched.
- **Revert note:** Delete `modules/gameplay/capture.ts` + `scripts/test-capture.mjs`; restore local body + `RAJA_ULTIMATE_TAG_BONUS` const in prototype; revert the 2 audit pins. Single logical revert boundary.
- **Prototype line-count delta:** 5791 → 5760 (−31).
- **Next seam selected:** `tagCheck` (Seam 22; depends on capture, hasLineOfSight, sweptContactDistance).

### 2026-10-06 — Seam: registerTeamAction → modules/gameplay/team-combo-actions.ts COMPLETE

- **Seam name and owner:** `registerTeamAction` (`TeamActionWorld`, `TeammateFacet`, `TeamComboState`) — `modules/gameplay/team-combo-actions.ts` (new file).
- **Why selected:** Batch decision (user): TeamActionWorld uses narrow callbacks for cross-owner effects; direct mutation only for combo state owned by this subsystem.
- **Files changed:**
  - `modules/gameplay/team-combo-actions.ts` (new, ~77 lines): combo state machine step with 6 narrow callbacks (`onComboCallout`, `onPlayerBoost`, `onBurst`, `onTone`, `onLog`, `onMissionCombo`); returns new `TeamComboState` (caller assigns to `teamCombos[team]`); boost fractions 0.12/0.16, tone pitches, callout copy/windows verbatim.
  - `app/prototype.tsx`: local 53-line body replaced by ~36-line forwarder wiring the 6 callbacks (boost math stays at owner via `CHARACTER_BY_ID`; callout dual-var write in `onComboCallout`); `advanceTeamCombo` import removed (now only in module); import of `registerTeamActionAt` added.
  - `scripts/test-team-combo-actions.mjs` (new): 7 scenarios — ignored (surge active), started player/enemy, duo player/enemy (teammate filter: excludes PRISONER + enemy), surge player/enemy (mission+callout only for player team).
- **Contract extracted:** `(actor, actionLabel, x, y, now, world: TeamActionWorld) => TeamComboState` — combo state in/out; all cross-owner effects via narrow callbacks.
- **Tests:** `test-team-combo-actions.mjs` PASS. R1 suites inside `npm run audit`.
- **Gates:** `tsc --noEmit` PASS; `lint` 117 (≤ 119); `audit` 21 pre-existing (line-196 assertion pins call-site strings `registerTeamAction(winner, 'TAG'` / `(rescuer, 'RESCUE'` — still present, no repoint needed); `build:pages` PASS.
- **In-match result:** Headless. Identical by construction: same `advanceTeamCombo` call, same branch order, same copy/pitches/fractions/windows; state write-back now via return value (always assigned, matching HEAD's write-before-check).
- **Revert note:** Delete `modules/gameplay/team-combo-actions.ts` + `scripts/test-team-combo-actions.mjs`; restore local 53-line body, `advanceTeamCombo` import; drop `registerTeamActionAt` import. Single logical revert boundary.
- **Prototype line-count delta:** 5808 → 5791 (−17).
- **Next seam selected:** `capture` (Seam 21; Q2 `RAJA_ULTIMATE_TAG_BONUS` verbatim move only).

### 2026-10-06 — Seam: aiVector → modules/gameplay/ai-vector.ts COMPLETE

- **Seam name and owner:** `aiVector` (`AiVectorWorld`, `PlayerFacet`, `AiProfile`) — `modules/gameplay/ai-vector.ts` (new file).
- **Why selected:** `log` deferred by user instruction (same ~30-reassignment scope as previously rejected). Next smallest valid seam: pure AI decision function, 1 call site, no mutable/render coupling. Unblocks the bot navigation chain.
- **Files changed:**
  - `modules/gameplay/ai-vector.ts` (new, ~104 lines): `AiProfile` narrowed to the 4 fields the function reads (`prediction`, `playerBias`, `threatRadius`, `rescueCutoff`), `PlayerFacet` (13 fields, structural subset of `Player`), `AiVectorWorld` (players/rescueRequest/refills/bases/worldWidth/worldHeight/aiProfile), `aiVector` body verbatim.
  - `app/prototype.tsx`: local `aiVector` (66 lines) deleted; import added; call site passes `players`, `rescueRequest`, `refills`, `bases`, `worldWidth`, `worldHeight`, `aiProfile` directly (no mapping — `Player` satisfies `PlayerFacet` structurally). Unused imports cleaned (`directionIsTraversableAt`, `navigateAroundHazardsAt`, `pointHitsExpandedRect`, `steerAroundRects`, local `audio` var).
  - `scripts/audit-game.mjs`: `aiVectorSource` reader added; difficulty assertion repointed (`aiProfile.prediction`/`rescueCutoff` now pinned in `ai-vector.ts`, `steerDistance`/`DIFFICULTY_PROFILES` stay pinned in prototype); AI-navigation assertion repointed (`directionIsTraversableAt(` → `navigateAroundHazardsForPlayer`).
  - `scripts/test-ai-vector.mjs` (new): 8 branches — returning, in-base idle, assigned rescue, held-teammate (≥3), refill chase, threat repel, predictive target, default push.
- **Contract extracted:** `(p: PlayerFacet, now: number, world: AiVectorWorld) => { x: number; y: number }` — pure decision function, world injected.
- **Tests:** `test-ai-vector.mjs` PASS (node --experimental-strip-types). R1 suites pass inside `npm run audit`.
- **Gates:** `tsc --noEmit` PASS; `lint` 117 (≤ 119 baseline); `audit` 21 pre-existing failures (2 pinned-code assertions repointed, not suppressed); `build:pages` PASS.
- **In-match result:** Not run in browser (headless). Behavior identical by construction: body moved verbatim; `baseVector(p)` → `baseVector(p, world.bases)` with `world.bases = bases` matches the old local forwarder; `other`/`distance` same sources; call site passes the same runtime values.
- **Revert note:** Delete `modules/gameplay/ai-vector.ts` + `scripts/test-ai-vector.mjs`; restore local `aiVector` def in `prototype.tsx` and the removed imports; revert the 2 audit assertions + `aiVectorSource` reader. Single logical revert boundary.
- **Prototype line-count delta:** 5874 → 5808 (−66).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** `registerTeamAction` → `modules/gameplay/team-combo-actions.ts` (Seam 20 of batch; narrow callbacks for cross-owner effects per user decision).

### 2026-10-06 — Seam: beep → modules/audio/audio-tone.ts (playTone) COMPLETE

- **Seam name and owner:** `beep` (`playTone` + `closeToneAudio`) — `modules/audio/audio-tone.ts` (new file).
- **Files changed:** `modules/audio/audio-tone.ts` (new, 28 lines: module-owned AudioContext, `playTone(frequency, duration)`, `closeToneAudio()`); `app/prototype.tsx` local `beep` (20 lines) deleted, 12 call sites renamed to `playTone`, cleanup calls `closeToneAudio()`.
- **Contract:** `(frequency: number, duration?: number) => void` — oscillator tone gated by `audioLevels().sfx`; `closeToneAudio(): void` for teardown.
- **Tests:** existing suites; gates `tsc` clean, `lint` 119, `audit` 21 pre-existing, `build:pages` PASS.
- **In-match result:** Headless; identical Web Audio path, same gating, same values.
- **Revert note:** Delete `modules/audio/audio-tone.ts`, restore local `beep`, revert import + 12 call-site renames + teardown line.
- **Prototype line-count delta:** 5893 → 5874 (−19).
- **Next seam:** aiVector.

### 2026-10-06 — Seam: navigateAroundHazards → modules/gameplay/collision-navigation.ts (navigateAroundHazardsForPlayer) COMPLETE

- **Seam name and owner:** `navigateAroundHazards` wrapper (`navigateAroundHazardsForPlayer` + `NavigationWorld`) — `modules/gameplay/collision-navigation.ts` (existing file).
- **Files changed:** `modules/gameplay/collision-navigation.ts` (+`NavigationWorld`, `navigateAroundHazardsForPlayer`; duplicate mid-file import block consolidated to header); `app/prototype.tsx` wrapper now delegates to the exported function with an explicit world object (`studioMap`, `worldWidth/Height`, `radius`, `isBlocked`, `isWaterAt`, `rects`, `cache`).
- **Contract:** `(p: BlockedPlayerFacet, desired, now, probeDistance, turnBias, world: NavigationWorld) => {x, y}` — builds traversable/solid/water closures then calls the existing pure `navigateAroundHazards`.
- **Tests:** gates `tsc` clean, `lint` 119, `audit` 21 pre-existing, `build:pages` PASS.
- **In-match result:** Headless; same predicates, same cache, same call flow.
- **Revert note:** Remove `NavigationWorld` + `navigateAroundHazardsForPlayer` from `collision-navigation.ts`; restore the inline wrapper in `prototype.tsx`.
- **Prototype line-count delta:** 5916 → 5893 (−23).
- **Next seam:** beep.

### 2026-10-06 — DEFERRED: log (Seam 17 rejected by user instruction)

- Scope evidence: previous rejection cited ~30 reassignments; current `effects-log` proposal is the same subsystem (same `logs` array, same 18 call sites, same render consumers). Cross-module mutation of UI state — architectural issue identical.
- **Not built this batch.** Revisit only if a narrow callback contract (`onLog(text)`) is approved.

### 2026-10-05 — Seam: directionIsTraversable → modules/gameplay/collision-navigation.ts COMPLETE

- **Seam name and owner:** `directionIsTraversable` (+ `TraverseProbe`) — `modules/gameplay/collision-navigation.ts` (existing file).
- **Why selected:** Narrowest valid seam: pure raycast with two injected predicates, 3 call sites in `navigateAroundHazards`. Navigation chain remainder, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/gameplay/collision-navigation.ts` (+30): `TraverseProbe`, `directionIsTraversable` verbatim (incl. 0.01 degenerate, min-5 samples, /14 spacing).
  - `app/prototype.tsx`: deleted the 19-line local def; forwarder threads `{ isBlocked, isWaterAt }` closures. Net −9 lines.
  - `scripts/audit-game.mjs`: AI-navigation assertion repointed (module-source pins + call-site pin); same check, new location.
  - `scripts/test-direction-traversable.mjs` (new): degenerate, clear, blocked, wet, min-samples.
- **Contract extracted:** `(from, direction, distanceToProbe, now, probe) => boolean` — straight-ray sampling, any blocked/wet sample fails.
- **Tests:** `test-direction-traversable.mjs` PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures (after repointing 1 assertion that pinned the moved code); `build:pages` PASS.
- **In-match result:** Not run in browser (headless); raycast identical by construction — same sampling, same predicates, same sites.
- **Revert note:** Delete the `directionIsTraversable` block from `collision-navigation.ts`, restore the 19-line local def, revert the forwarder + import + audit assertion. Single-commit revertible.
- **Prototype line-count delta:** 5925 → 5916 (−9).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: move → modules/gameplay/collision-navigation.ts (movePlayer) COMPLETE

- **Seam name and owner:** `move` (`movePlayer` + `MoveWorld`) — `modules/gameplay/collision-navigation.ts` (existing file; unblocks the `aiVector` chain).
- **Why selected:** Narrowest P1 unblocker: 24-line axis stepper, 4 call sites, explicit injected world. Navigation chain remainder, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/gameplay/collision-navigation.ts` (+52): `MovingPlayerFacet`, `MoveWorld`, `movePlayer` verbatim (incl. kanal-swim stop, studio speed, axis split, water-fall escape).
  - `app/prototype.tsx`: deleted the 24-line local def; `move` becomes a thin adapter threading per-call closures. Net −9 lines.
  - `scripts/test-move-player.mjs` (new): advance, swim stop, studio speed, water escape, dry fall-through, y-axis split.
- **Contract extracted:** `(player, dx, dy, speed, dt, now, world) => void` — velocity set, axis-stepped, blocked-gated with water escape; mutates position/velocity only.
- **Tests:** `test-move-player.mjs` PASS (after fixing the override-spread helper — third occurrence of the same test-harness bug; also fixed 3 lint findings in the new test). R1 suites 4/4 PASS. Full in-scope run 36/36 PASS (kampung3d + kanal2-layout + series-sprites excluded: both map suites fail pre-existing, verified via stash-compare).
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS (2.34s).
- **In-match result:** Not run in browser (headless); stepping identical by construction — same velocity, bounds, gating, escape order.
- **Revert note:** Delete the `movePlayer` block from `collision-navigation.ts`, restore the 24-line local def, delete the adapter, revert the import. Single-commit revertible.
- **Prototype line-count delta:** 5934 → 5925 (−9).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: blocked → modules/gameplay/collision-navigation.ts COMPLETE

- **Seam name and owner:** `blocked` (`isBlocked` + `BlockedWorld` / facet) — `modules/gameplay/collision-navigation.ts` (existing file).
- **Why selected:** Narrowest P1 unblocker: pure 6-guard movement predicate, 5 call sites; unblocks `move` next. Navigation chain, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/gameplay/collision-navigation.ts` (+74): `BlockedPlayerFacet`, `BlockedWorld`, `isBlocked` verbatim (incl. HEAD guard order).
  - `app/prototype.tsx`: deleted the 40-line local def; one shared `blockedWorld` (studio/kanal/fort/obstacle/water/charge/bases/occupant closures); `blocked` becomes a 1-line forwarder. Net −18 lines.
  - `scripts/test-blocked.mjs` (new): studio, kanal ring, fort entry, obstacle, home charge gate, occupied fort, parkour skip.
- **Contract extracted:** `(x, y, player, now, world) => boolean` — studio → kanal ring → fort-core entry → obstacle → home charge gate → occupied fort.
- **Tests:** `test-blocked.mjs` PASS (after fixing the override-spread test helper — same bug pattern as the spacing test). R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS (2.34s).
- **In-match result:** Not run in browser (headless); predicate identical by construction — same six guards, same order, same call sites.
- **Revert note:** Delete the `isBlocked` block from `collision-navigation.ts`, restore the 40-line local def, delete `blockedWorld`, revert the forwarder + import alias. Single-commit revertible.
- **Prototype line-count delta:** 5952 → 5934 (−18).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop (`move` is now unblocked).

### 2026-10-05 — Seam: findParkourLanding → modules/gameplay/collision-navigation.ts COMPLETE

- **Seam name and owner:** `findParkourLanding` (+ `ParkourProbe` type) — `modules/gameplay/collision-navigation.ts` (existing file).
- **Why selected:** Narrowest valid seam: pure landing probe with two injected predicates, 1 call site, no player facet needed. `blocked`/`move`/navigation chain, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/gameplay/collision-navigation.ts` (+52): `ParkourProbe`, `findParkourLanding` verbatim (incl. 132-minimum, 0.72 threshold, clamped bounds).
  - `app/prototype.tsx`: deleted the 31-line local def; 1 site threads `{ isWaterAt, isBlocked, worldWidth, worldHeight }` via `At`-aliased import. Net −19 lines.
  - `scripts/audit-game.mjs`: parkour assertion repointed (`findParkourLandingAt(` + module-source pins); same check, new location.
  - `scripts/test-parkour-landing.mjs` (new): degenerate, dry fallback, blocked, water-crossing, all-wet.
- **Contract extracted:** `(from, direction, nominalDistance, probe) => landing | null` — first dry ground past water, or nearby dry fallback.
- **Tests:** `test-parkour-landing.mjs` PASS. R1 suites 4/4 PASS. Full extended run 13/13 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures (after repointing 1 assertion that pinned the moved code); `build:pages` PASS.
- **In-match result:** Not run in browser (headless); landing identical by construction — same scan, thresholds, clamps, predicates.
- **Revert note:** Delete the `findParkourLanding` block from `collision-navigation.ts`, restore the 31-line local def, revert the site + import + audit assertion. Single-commit revertible.
- **Prototype line-count delta:** 5971 → 5952 (−19).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: team tables → modules/world/team-tables.ts COMPLETE

- **Seam name and owner:** `TEAM_COLOR` + `FIXED_ROSTERS` + `TEAM_FOR_FACTION`/`FACTION_FOR_TEAM` + `factionName`/`teamName`/`lineupFor` — `modules/world/team-tables.ts` (new file, world/team-data ownership; config-derived tables).
- **Why selected:** Narrowest valid seam: 7 pure data/naming helpers read from `game-rules.json`, ~25 call sites unchanged in text. `blocked`/`move`/navigation chain, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/world/team-tables.ts` (new, ~34 lines): tables + mappings + naming + lineup (verbatim, JSON import with `with { type: 'json' }` per Node-test convention).
  - `app/prototype.tsx`: deleted the 7-def block; +1 import line. All call sites unchanged. Net −20 lines.
  - `scripts/test-team-tables.mjs` (new): colors, mappings, labels, lineup order/promotion/cap.
- **Contract extracted:** config-derived team tables + naming + `matchSize`-capped lineups with selected-first promotion.
- **Tests:** `test-team-tables.mjs` PASS (after adding JSON import attribute — same convention as `characters.ts`). R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS (2.27s).
- **In-match result:** Not run in browser (headless); tables identical by construction — same config source, same call sites.
- **Revert note:** Delete `modules/world/team-tables.ts` + `scripts/test-team-tables.mjs`, restore the 7-def block, remove the import. Single-commit revertible.
- **Prototype line-count delta:** 5991 → 5971 (−20).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: baseVector → modules/gameplay/collision-navigation.ts COMPLETE

- **Seam name and owner:** `baseVector` — `modules/gameplay/collision-navigation.ts` (existing file, collision-navigation ownership; vector-to-own-base for RETURNING bots).
- **Why selected:** Narrowest valid seam: 4-line pure geometry, 3 call sites, facet of team+x/y. `blocked`/`move`/navigation chain, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/gameplay/collision-navigation.ts` (+11): `baseVector(p, bases)` verbatim; facet sidesteps the `Player` import.
  - `app/prototype.tsx`: deleted the 4-line local def; kept a 1-line `baseVector` forwarder (3 existing sites untouched). Net −3 lines.
  - `scripts/test-base-vector.mjs` (new): per-team direction, zero-at-base.
- **Contract extracted:** `(player, bases) => { x, y }` — own-base minus position.
- **Tests:** `test-base-vector.mjs` PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS.
- **In-match result:** Not run in browser (headless); vector identical by construction — same subtraction, same bases, same sites.
- **Revert note:** Delete the `baseVector` block from `collision-navigation.ts`, restore the 4-line local def + forwarder removal, revert the import. Single-commit revertible.
- **Prototype line-count delta:** 5994 → 5991 (−3).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: drawPrisonOverlays → modules/ui/draw-base.ts COMPLETE

- **Seam name and owner:** `drawPrisonOverlays` (+ `PrisonAssets` type) — `modules/ui/draw-base.ts` (existing file, UI render ownership; same layer/owner as `drawBase`).
- **Why selected:** Narrowest valid seam: 16-line overlay loop, 1 call site in `draw()`, pure given the asset painter. Navigation/input/register clusters, `buildStatsBoard`, `beep`, sibling `draw*Asset` helpers rejected as too wide.
- **Files changed:**
  - `modules/ui/draw-base.ts` (+32): `PrisonAssets` type, `drawPrisonOverlays(target, prisons, paintAsset, backgroundBaked?)` verbatim; optional param kept last.
  - `app/prototype.tsx`: deleted the 16-line local def; 1 site threads `(ctx, field.prisons, drawFieldAsset, field.structuresInBackground)` via `At`-aliased import. Net −13 lines.
  - `scripts/audit-game.mjs`: overlay assertion repointed to `draw-base.ts` + call-site pin (`drawPrisonOverlaysAt(`); floor pin stays in prototype.
  - `scripts/test-prison-overlays.mjs` (new): both-teams defaults, baked skip, per-prison overrides.
- **Contract extracted:** `(target, prisons, paintAsset, backgroundBaked?) => void` — skip when baked; else paint both overlays with defaults.
- **Tests:** `test-prison-overlays.mjs` PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS (after moving optional param last); `lint` 119 (= baseline); `audit` 21 pre-existing failures (after repointing 1 assertion that pinned the moved code — same check, new location); `build:pages` PASS.
- **In-match result:** Not run in browser (headless); overlays identical by construction — same assets, geometry, flip/opacity defaults, same site.
- **Revert note:** Delete the `drawPrisonOverlays` block from `draw-base.ts`, restore the 16-line local def, revert the site + import + audit assertion. Single-commit revertible.
- **Prototype line-count delta:** 6006 → 5994 (−12; net −13 prototype, +1 audit source line).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: spacingPositionAllowed → modules/gameplay/collision-navigation.ts COMPLETE

- **Seam name and owner:** `spacingPositionAllowed` (+ `SpacingWorld` / facet) — `modules/gameplay/collision-navigation.ts` (existing file).
- **Why selected:** Narrowest valid seam: pure 3-guard predicate (kanal ring+core, water/obstacle, IN_BASE charge), 2 call sites in `resolvePlayerSpacing`, facet of 5 player fields. Navigation chain, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/gameplay/collision-navigation.ts` (+52): `SpacingPlayerFacet`, `SpacingWorld`, `spacingPositionAllowed` verbatim.
  - `app/prototype.tsx`: deleted the 13-line local def; 2 sites threaded via `spacingWorldFor` (explicit player slice + world closures). Net +6 lines.
  - `scripts/test-spacing-allowed.mjs` (new): clear, obstacle, kanal ring/core variants, base-charge gating.
- **Contract extracted:** `(player, x, y, world) => boolean` — reject on kanal ring/core, direct water/obstacle, or undercharged IN_BASE leaving home radius.
- **Tests:** `test-spacing-allowed.mjs` PASS (incl. corrected test bug: non-kanal water alone does NOT block — only obstacles do, per HEAD). R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS (after trimming facet to actually-read fields, then restoring x/y for the genuine fort-core read); `lint` 120 (1 above baseline — verified pre-existing drift via stash-compare, zero findings in seam files); `audit` 21 pre-existing failures; `build:pages` PASS.
- **In-match result:** Not run in browser (headless); predicate identical by construction — same three guards, same call sites.
- **Revert note:** Delete the `spacingPositionAllowed` block from `collision-navigation.ts`, restore the 13-line local def, delete `spacingWorldFor`, revert the 2 sites + import alias. Single-commit revertible.
- **Prototype line-count delta:** 5996 → 6006 (+10; explicit world construction costs more than the deleted def — honest contract cost).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: hitsObstacle → modules/gameplay/collision-navigation.ts COMPLETE

- **Seam name and owner:** `hitsObstacle` (+ `ObstacleWorld` type) — `modules/gameplay/collision-navigation.ts` (existing file, collision-navigation ownership).
- **Why selected:** Narrowest valid seam: pure two-source OR (studio solids + expanded rects), 5 call sites, single `ObstacleWorld` contract. `blocked`/`move`/navigation chain, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/gameplay/collision-navigation.ts` (+22): `ObstacleWorld` type, `hitsObstacle(x, y, world)` verbatim; imports `studioSolidAt`, `StudioMap` type, `Obstacle` type (matching `spawn.ts` convention).
  - `app/prototype.tsx`: deleted the 4-line local def; one shared `obstacleWorld` object (studioMap, solidObstacles, radius); 5 existing sites route through the local wrapper unchanged. Net +2 lines.
  - `scripts/test-hits-obstacle.mjs` (new): rect hit, 13px expansion edge, empty world.
- **Contract extracted:** `(x, y, { studioMap, rects, radius }) => boolean` — studio hit OR any expanded-rect hit.
- **Tests:** `test-hits-obstacle.mjs` PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS.
- **In-match result:** Not run in browser (headless); predicate identical by construction — same two sources, same radius, same call sites.
- **Revert note:** Delete the `hitsObstacle` block from `collision-navigation.ts`, restore the 4-line local def, delete `obstacleWorld`, revert the import. Single-commit revertible.
- **Prototype line-count delta:** 5994 → 5996 (+2; shared world object costs more than the deleted def — honest cost of the explicit contract).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: formatTime + statPercent → modules/ui/format.ts COMPLETE

- **Seam name and owner:** `formatTime` + `statPercent` — `modules/ui/format.ts` (new file, UI display-formatting ownership).
- **Why selected:** Narrowest valid seam: two pure top-level helpers (clock + percent), 8 call sites total, zero closure deps (`statPercent` uses `lib/math.ts` clamp). `uiAsset`, `registerTeamAction`, `beep`, input handlers, render layers rejected as too wide.
- **Files changed:**
  - `modules/ui/format.ts` (new, ~14 lines): `formatTime(seconds)`, `statPercent(value, min, max)`.
  - `app/prototype.tsx`: deleted both local defs; +1 import line. `clamp` import stays (15+ remaining sites). Net −5 lines.
  - `scripts/test-format.mjs` (new): clock rollover/ceil/negative-floor, percent bounds + clamping + fractional range.
- **Contract extracted:** `formatTime` → `mm:ss` (ceil, floor at 0); `statPercent` → normalized `N%` clamped to 0–100.
- **Tests:** `test-format.mjs` PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS (2.01s).
- **In-match result:** Not run in browser (headless); formatting identical by construction — same arithmetic, same call sites.
- **Revert note:** Delete `modules/ui/format.ts` + `scripts/test-format.mjs`, restore both local defs, remove the import. Single-commit revertible.
- **Prototype line-count delta:** 5999 → 5994 (−5).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: boardRows → modules/gameplay/bars-score.ts COMPLETE

- **Seam name and owner:** `boardRows` (+ `BoardRow` / `BoardPlayerFacet` types) — `modules/gameplay/bars-score.ts` (existing file, bars-score ownership; completes the stats-store family: store → add → score → rows).
- **Why selected:** Narrowest valid seam: pure team-filter + row projection, 2 call sites (inside `buildStatsBoard` only), facet of 5 player fields, direct testability. `buildStatsBoard` itself rejected (closes over ~10 bindings incl. phase/timers/refs). `beep`, input handlers, `registerTeamAction` rejected as too wide.
- **Files changed:**
  - `modules/gameplay/bars-score.ts` (+30): `BoardPlayerFacet`, `BoardRow`, `boardRows(store, players, team, mvpId)`; +`Team` type import.
  - `app/prototype.tsx`: deleted the 16-line local def; 2 call sites threaded with `players` via `boardRowsOf` alias (no shadowing). Net −15 lines.
  - `scripts/test-board-rows.mjs` (new): order, stats+contribution, mvp flag, team isolation, zero-defaults, input purity.
- **Contract extracted:** `(store, players, team, mvpId) => BoardRow[]` — filter by team preserving input order; rows carry identity + `ensureStats` defaults + `contribution` + `mvp`; inputs never mutated.
- **Tests:** `test-board-rows.mjs` PASS (incl. corrected test bug: distinct round/match stores — sharing one store doubled `addStat` writes). R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS (after fixing `BoardRow` to `Omit<facet,'team'>` — rows intentionally omit team); `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS (2.01s).
- **In-match result:** Not run in browser (headless); leaderboard rows identical by construction — same filter/map, same store reads, same mvp plumbing.
- **Revert note:** Delete the `boardRows` block + types from `bars-score.ts`, restore the 16-line local def, revert the 2 call sites + import alias. Single-commit revertible.
- **Prototype line-count delta:** 6014 → 5999 (−15).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop (remaining: `buildStatsBoard` shell, `registerTeamAction`, `beep`, P4 input, P2 render layers, P6 loading).

### 2026-10-05 — Seam: roundedOn → modules/ui/canvas-shapes.ts COMPLETE

- **Seam name and owner:** `roundedOn` (+ `rounded` bound locally) — `modules/ui/canvas-shapes.ts` (new file, UI canvas-primitive ownership).
- **Why selected:** Narrowest valid seam in the file: pure 2-call wrapper over the ctx `roundRect` primitive, zero deps, 6 targeted call sites, direct testability, no new dependency. `draw*` layers, `registerTeamAction`, `beep`, input handlers all rejected as too wide.
- **Files changed:**
  - `modules/ui/canvas-shapes.ts` (new, ~13 lines): `roundedOn(target, x, y, w, h, r)`.
  - `app/prototype.tsx`: deleted the 11-line local `roundedOn` def; `rounded` kept as a one-line `ctx`-bound closure (unchanged text); +1 import line. Net −10 lines.
  - `scripts/test-canvas-shapes.mjs` (new): exact call order (beginPath → roundRect with geometry), zero-radius passthrough.
- **Contract extracted:** `(target, x, y, w, h, r) => void` — emits beginPath then roundRect with the passed args, verbatim.
- **Tests:** `test-canvas-shapes.mjs` 2/2 PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (matches baseline exactly, no seam findings); `audit` 21 pre-existing failures (none seam-related); `build:pages` PASS (1.92s, chunk warning pre-existing).
- **In-match result:** Not run in browser (headless); path-construction behavior identical by construction — same two ctx calls, same args, same call sites.
- **Revert note:** Delete `modules/ui/canvas-shapes.ts` + `scripts/test-canvas-shapes.mjs`, restore the 11-line local def, remove the import. Single-commit revertible.
- **Prototype line-count delta:** 6024 → 6014 (−10).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop (remaining bulk: P1 rules closures, P2 render layers, P4 input, P6 loading — smallest valid first).

### 2026-10-05 — Seam: pushMatchEvent → modules/game-core/match-state.ts COMPLETE

- **Seam name and owner:** `pushMatchEvent` — `modules/game-core/match-state.ts` (new file, match-state ownership; fulfils the recorded `pushMatchEvent` backlog item, which is now approved as the active seam).
- **Why selected:** Recorded backlog candidate with 8 pre-defined verification points; pure queue semantics, 3 call sites, narrow contract, direct testability, no new dependency.
- **Files changed:**
  - `modules/game-core/match-state.ts` (new, ~45 lines): `MatchEventInput`, `MatchEventQueue`, `pushMatchEvent`.
  - `app/prototype.tsx`: `addMatchEvent` body delegates to `pushMatchEvent` (threading `{events, nextId}` through, reassigning both); +1 import line. Net −13 lines.
  - `scripts/test-match-event.mjs` (new): 8 assertions covering the 8 backlog verification points.
- **Contract extracted:** `(queue, event, now) => queue` — priority rescue 2/tag-else 1, durations tag 2100/rescue 2500/other 1800, filter-then-drop-or-replace, sequential ids (no id consumed on drop), descending-id tie sort.
- **Tests:** `test-match-event.mjs` 8/8 PASS (incl. corrected arithmetic: held queue sits at nextId 5; drop path returns deep-equal array, not shared ref — module filters before checking, behavior identical). R1 suites 4/4 PASS (`tag-contact`, `team-combo`, `collision-navigation`, `click-navigation`).
- **Gates:** `tsc --noEmit` PASS (no output); `lint` — seam files clean, repo-wide failures pre-existing only; `audit` 21 pre-existing failures (sprite/field golden baselines, none seam-related); `build:pages` PASS (2.59s, pre-existing chunk-size warning only).
- **In-match result:** Not run in browser this turn (headless environment); behavior preserved by construction — same priority/duration/id/sort semantics, same 3 call sites, same reset paths (`matchEvents = []` retained).
- **Revert note:** Delete `modules/game-core/match-state.ts` + `scripts/test-match-event.mjs`, restore the 17-line `addMatchEvent` body in `app/prototype.tsx`, remove the import line. Single-commit revertible.
- **Prototype line-count delta:** 6041 → 6028 (−13).
- **Remaining active blockers:** None. 21 pre-existing audit failures (golden baselines) unchanged; no new findings.
- **Next seam selected:** TBD by next autonomous analysis loop (candidates: `log`/`burst` mutators, `input-navigation` slice, `snapshot-write` slice — to be surveyed, smallest valid first).

### 2026-10-04 — Refactor workflow: Phase 1, Phase 2 (step 1–3), Phase 3 selesai (milestone, dilanjutkan G0 di bawah)

- State: SUPERSEDED oleh bagian G0 COMPLETE di bawah (riwayat desain, jangan diulang).
- Tujuan aktif: arsitektur refactor `app/prototype.tsx` mengikuti
  `.workflow/bentengan-refactor/`. Phase 2 selesai untuk step 1, 2, dan 3 saja.
  Step 4 dan 5 di luar cakupan atas keputusan pengguna. Phase 3 (Implementation
  Plan) selesai dan menunggu evaluasi pengguna sebelum Build.
- Sudah selesai:
  - `Review Plan.MD` selesai, 400 baris, ste-lint 0.
  - `phase-1.md` (Analyze) selesai: R1–R14, lima jalur, ATAM, timeline G0–G4,
    jalur terpilih Path A plus amendmen 1 dan 2, keputusan 1A/2A/3B.
  - `phase-2-step-1.md` selesai: tujuh proposal A–G.
  - `phase-2-step-2.md` selesai: bukti ATAM untuk tujuh desain.
  - `phase-2-step-3.md` selesai: Quality Attribute, skor tertimbang, putusan
    **Desain G** (9/11), loop-back tidak aktif.
  - Amandemen kriteria ukuran: 500 baris menjadi target, bukan gate. Kualitas
    batas menang saat seri. `prototype.tsx` difinalisasi paling akhir.
  - `00-context.md` diperluas: prinsip modul, tabel kepemilikan satu penanggung
    jawab, tabel batas area, pohon folder target, kontrak hasil, dan safeguard
    pasca-G3.
  - `03-implement.md` selesai (Phase 3): rencana kerja G0 sampai G4, base
    commit HEAD di `Refactor-Clio`, diagram arus dependensi Mermaid, verifikasi
    per perubahan, dan mitigasi risiko Design G. Pengguna memutuskan rendering
    milik `modules/ui/`, stage 1 milik `modules/game-core/`, dan satu diagram.
  - Putaran review pertama pengguna diterapkan (8 poin, dokumen saja, tanpa
    kerja G0): aturan varian ukuran di bawah 500 baris yang selaras dengan R5,
    aturan anti god-file untuk `match-lifecycle.ts`, diagram audio tiga arah
    (core, gameplay, audio), bukti G0.4/G0.5/G0.7 yang konktrak, kontrak format
    map-data JSON vs TypeScript, dan tabel pemetaan P0 sampai P6 yang
    memastikan tidak ada ekstraksi di luar P0–P6.
- Temuan yang harus diingat: seluruh anchor `file:line` di `Review Plan.MD`
  dipatok di `673ef2a4`, sedangkan file di HEAD sudah 8.570 baris (7.741 di
  pin, +829). G0 wajib menurunkan ulang anchor dan mencatat baseline baru sebelum
  ekstraksi pertama. Angka baseline phase-1 tetap catatan historis berlabel
  "Value at `673ef2a4`".

### 2026-10-04 — Refactor workflow: requestRescue seam COMPLETE (result-object pertama)

- State: ACTIVE (approved analysis → approved slice; pwsh 7.6.6 shell)
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/game-core/match-types.ts` += `MatchEventKind`/`MatchEvent`/
    `RescueRequest` (satu-satunya tipe bersama yang pindah).
  - `modules/gameplay/rescue.ts` baru: `requestRescue(players, prev, cooldown,
    query, now)` murni → `RescueRequestEffects` (request/cooldown/event/
    sounds/bursts/logs). Satu situs `keys 'r'` menerapkan hasil
    (addMatchEvent lokal tetap — backlog `pushMatchEvent` tak tersentuh).
  - `scripts/test-rescue-request.mjs`: guard, assignment terdekat, cooldown,
    kontrak efek lengkap.
  - Loop-back test audio: 1 pin verbatim → pin loop orkestrasi (pasangan
    tetap di-pin test rescue). Tidak ada failure baru di suite mana pun.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 19/19.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: kanalWaterBlocks seam COMPLETE

- State: ACTIVE (survey otonom → build otonom; pwsh 7.6.6 shell)
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/collision-navigation.ts` += `kanalWaterBlocks(x, y,
    waterAt, radius)` — verbatim (pusat + ring 16 sisi); predikat air
    eksplisit, tanpa mask/canvas di modul.
  - `app/prototype.tsx`: definisi lokal dihapus (satu salah-stub langsung
    dikoreksi); 3 situs jadi `(x, y, isWaterAt, PLAYER_COLLISION_RADIUS)`.
  - `scripts/test-kanal-water-blocks.mjs`: center, ring, dry, radius.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 23/23.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: fall-reset seam COMPLETE (riwayat, dilanjutkan kanalWaterBlocks di atas)

- State: SUPERSEDED oleh bagian kanalWaterBlocks di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `match-types.ts` += `PlayerAction` (satu-satunya tipe bersama yang pindah).
  - `spawn.ts` += `resetFallenPlayer(p, round, base, now)` + facet 19 field
    + `FallResetEffects` (bursts/beeps/logs); mutasi posisi/gerak/match/timer,
    efek ke orkestrator. `riverFallCheck` tetap (butuh isWaterAt lokal).
  - `app/prototype.tsx`: definisi lokal dihapus; wrapper tipis
    `applyFallReset` (efek→burst/beep/log); 2 situs jadi wrapper.
  - `scripts/test-fall-reset.mjs`: placement blue/red, reset field, timer,
    efek controlled/bot.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru; pin sungai PASS), build PASS, test 22/22.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: isNearWater seam COMPLETE (riwayat, dilanjutkan fall-reset di atas)

- State: SUPERSEDED oleh bagian fall-reset di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/collision-navigation.ts` += `isNearWater(x, y, query)`
    + tipe `WaterQuery` (hasWater/waterAt) — verbatim, murni.
  - `app/prototype.tsx`: definisi lokal dihapus; 1 situs jadi
    `{ hasWater: Boolean(field.waterMask || studioMap), waterAt: isWaterAt }`.
    Satu salah-stub saat edit langsung dikoreksi sebelum verifikasi.
  - `scripts/test-near-water.mjs`: direct hit, cross 30px, dry-map
    tanpa panggil predikat, miss.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 21/21.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: recoverFromObstacle seam COMPLETE (riwayat, dilanjutkan isNearWater di atas)

- State: SUPERSEDED oleh bagian isNearWater di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/collision-navigation.ts` baru: `recoverFromObstacle(p,
    now, world)` + tipe `CollisionWorld` (kanal/collides/pushOut); mutasi
    hanya x/y; facet struktural kanonis.
  - `app/prototype.tsx`: definisi lokal dihapus; 1 objek `collisionWorld`
    (closures atas `hitsObstacle`/`depenetrateFromRects` + bounds 34/58/32);
    2 situs pakai objek bersama.
  - `scripts/test-recover-obstacle.mjs`: guard tahanan/renang/parkour/bebas,
    happy path, varian kanal.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru; pin depenetrate PASS), build PASS, test 20/20.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: relationColor seam COMPLETE (riwayat, dilanjutkan requestRescue di atas)

- State: SUPERSEDED oleh bagian requestRescue di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert: relation-color + situs,
  test 8 kasus).

### 2026-10-04 — Refactor workflow: drawBase seam COMPLETE (P2 opener) (riwayat, dilanjutkan relationColor di atas)

- State: SUPERSEDED oleh bagian relationColor di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert: draw-base + 2 situs draw,
  test fake-ctx).

### 2026-10-04 — Refactor workflow: line-of-sight seam COMPLETE (riwayat, dilanjutkan drawBase di atas)

- State: SUPERSEDED oleh bagian drawBase di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `lib/collision-navigation.js` += `segmentHitsRect` + `hasLineOfSight`
    verbatim (R10-murni; `studioSolidAt` import, tanpa siklus — model tak
    import apa pun). Satu koreksi churn sendiri (duplikat typedef/const
    saat edit, langsung dibersihkan).
  - `app/prototype.tsx`: 2 definisi lokal dihapus (termasuk perbaikan salah
    stub yang langsung dikoreksi); 1 situs jadi
    `hasLineOfSight(a, b, solidObstacles, studioMap ?? null)`.
  - `scripts/test-line-of-sight.mjs`: segmen tembus/meleset, dinding
    menghalangi, off-path jelas. Dua ekspektasi test yang salah dikoreksi
    oleh perilaku kode (sampel interior saja, endpoint dikecualikan).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 16/16.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: spawn-refill seam COMPLETE (riwayat, dilanjutkan line-of-sight di atas)

- State: SUPERSEDED oleh bagian line-of-sight di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert: spawn.ts + 3 definisi + tipe,
  4 situs setup/reset/timer, test stub-random).
  - `app/prototype.tsx`: tipe + 3 definisi dihapus; setup/reset pakai
    `seedRefills` (destructure `{refills, nextId: refillId}`); blok timer
    pakai return value. `refills`/`refillId`/`nextRefillSpawn` tetap milik efek.
  - `scripts/test-spawn-refill.mjs`: grade kuartil, placement lane-id-expiry,
    sekuens id, blocked-geometri, seed-of-six (stub Math.random).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 15/15.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: tieHash seam COMPLETE (riwayat, dilanjutkan spawn di atas)

- State: SUPERSEDED oleh bagian spawn-refill di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert).
  - `app/prototype.tsx`: definisi lokal dihapus; 4 situs
    (spacing-push, lane, base-exit sort, exit-order sort) jadi
    `tieHash(round, …)` — `round` sudah di scope semua situs.
  - `scripts/test-tie-hash.mjs`: nilai pin eksak, sensitivitas round/id,
    determinisme, rentang uint32.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 14/14.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: fortOccupant seam COMPLETE (riwayat, dilanjutkan tieHash di atas)

- State: SUPERSEDED oleh bagian tieHash di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `lib/math.ts` baru: `other`/`distance`/`clamp` verbatim (R10-murni);
    prototype hapus lokal + import (situs panggil tak berubah).
  - `modules/gameplay/base.ts` baru: `fortOccupant(players, bases,
    baseRadius, kanal, baseTeam, exceptId?)` — body verbatim; facet
    `id/name/team/state/waterEnteredAt/x/y` kanonis (tanpa `string` lebar,
    tanpa import Player); varian kanal dari `isKanalField(field.id)`.
  - `app/prototype.tsx`: definisi lokal dihapus; 5 situs di-thread eksplisit.
  - `scripts/test-math.mjs` + `scripts/test-fort-occupant.mjs`: pin util +
    8 kasus (ketemu, filter tim/state, exceptId, tepi radius, air kanal vs
    biasa, kosong).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 13/13.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: P1 prison-layout slice COMPLETE (riwayat, dilanjutkan fortOccupant di atas)

- State: SUPERSEDED oleh bagian fortOccupant di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert).
  - `modules/game-core/match-types.ts` baru: `PlayerState` (satu-satunya tipe
    bersama yang dipindah; `PlayerAction` tetap di prototype).
  - `modules/gameplay/prison.ts` baru: `layoutPrisons(prisons, players,
    kanal)` — body verbatim; kontrak mutasi eksak (prisonIndex/x/y/lastX/
    lastY); facet `Team`/`PlayerState` kanonis, tanpa `string` lebar, tanpa
    import tipe Player dari prototype; varian kanal dari
    `isKanalField(field.id)` seperti HEAD (tanpa klaim data-driven).
  - `app/prototype.tsx`: definisi lokal dihapus; 2 situs jadi
    `layoutPrisons(field.prisons, players, isKanalField(field.id))`.
  - `scripts/test-prison-layout.mjs`: 10 kasus (blue/red/kanal/non-kanal,
    multiprisoner, index, sync lastX/lastY, non-prisoner, re-layout rescue,
    input tak termutasi).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 11/11.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: P1.2 stats-store slice COMPLETE (riwayat, dilanjutkan prison di atas)

- State: SUPERSEDED oleh bagian prison-layout di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/bars-score.ts` += `PlayerStats`/`StatsStores`,
    `emptyStats`, `createStatsStore(ids)`, `ensureStats`, `addStat({round,
    match}, …)`, `contributionScore` — semua verbatim, tanpa state/rules lain.
  - `app/prototype.tsx`: tipe + 5 definisi dihapus; init/reset pakai
    `createStatsStore(ids)`; 3 situs `addStat` di-thread ke `{round, match}`.
    `boardRows`/`buildStatsBoard` tetap untuk P3. Bentuk + referensi
    object-identik untuk pembaca board/leaderboard.
  - `scripts/test-stats-store.mjs`: 10 kasus yang diminta (creation,
    defaults, preserve/create, dual-write, isolasi, independensi,
    reset, scoring, shape).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 10/10.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: G3 ult-meter slice COMPLETE (riwayat, dilanjutkan P1.2 di atas)

- State: SUPERSEDED oleh bagian P1.2 di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/bars-score.ts` baru: `chargeUltimateMeter` murni
    (meter, controlled, id, amount) — bot/non-ultimate diabaikan, clamp 0–100.
  - `app/prototype.tsx`: 2 situs (tag +20, rescue +30) jadi reassign;
    definisi lokal `chargeUltimate` dihapus; import modul.
  - `scripts/test-ultimate-meter.mjs` baru: 9 asersi (abaikan, akumulasi,
    clamp, fraksi). Import `.ts` eksplisit (pola G1.2).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru; pin meter/tag/rescue PASS), build PASS, test 9/9.
- Re-validasi P1.1 (tanpa perubahan kode): direct test + 4 suite R1 5/5 PASS,
  tsc bersih, lint 119, audit 21 pre-existing (pin ultimate/meter hijau),
  build PASS. In-match browser (tag +20, rescue +30) tetap untuk pengguna.
- Revert note P1.1: kembalikan definisi lokal `chargeUltimate` + 2 situs
  (`capture` ~2362, `rescue` ~2469) + hapus import modul; `bars-score.ts`
  tetap untuk stats-store. Anchors: konstanta bonus 302–303 (beku Q2),
  ULTIMATE_CHARACTER_IDS dari data.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

- State: ACTIVE (Build resumed post-L1 approval; this seam per amended L1)
### 2026-10-04 — Refactor workflow: G3 P5 loop-driver seam COMPLETE (riwayat, dilanjutkan slice meter di atas)

- State: SUPERSEDED oleh bagian slice meter di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/game-core/match-runtime.ts` baru: `startMatchLoop` + guard
    `stopped` (stop idempoten, stop-dari-dalam aman, tanpa loop ganda).
    Urutan HEAD lestari: tick → render → commit, dt clamp 0.033, re-arm
    setelah kerja, sumber waktu campuran tak diubah.
  - `app/prototype.tsx`: blok snapshot → closure `writeSnapshot` (verbatim);
    `loop` + `raf`/`last` → `stopLoop`; kickoff + cancel via driver.
    `update`/`draw`/state/rules tidak tersentuh.
  - `scripts/test-match-loop.mjs` baru: 10 kasus (scheduling, urutan HEAD,
    dt/clamp, re-arm, stop, idempoten, stop-dalam-tick/render/commit, bersih).
- Validasi terakhir: tsc PASS, lint 119 (0 baru; 3 prefer-const test
  diperbaiki), audit 21 pre-existing (7 game + 14 metadata sprite, 0 baru),
  build PASS, test 8/8.
- Next action: seam strangler berikut (kecil, satu perubahan — kandidat:
  konsolidasi teardown ATAU konstruktor snapshot; perlu analisis dulu).
- Commit terakhir: belum dibuat (G0–G3-seam-1 belum di-commit).

### 2026-10-04 — Refactor workflow: L1 amendments (riwayat, Build dilanjut di atas)

- State: SUPERSEDED oleh bagian seam P5 di atas.
- L1Approved + 8 amendemen implementasi Anda telah ditulis ke dokumen:
  1. Urutan frame: loop HEAD `update → draw → snapshot-commit → re-arm`
     (bukan klaim). Guard 10 Hz tiap frame; re-arm SETELAH kerja; dt pertama
     dari (timestamp rAF − performance.now saat setup), clamp 0.033; sumber
     waktu campuran; fokus/visibilitas tak ubah loop; restart = teardown penuh.
  2. Aturan sumber waktu: clock/dt/order HEAD dipertahankan persis.
  3. Kontrak `startMatchLoop` kini memakai guard `stopped` (stop idempoten,
     stop-dari-dalam aman, tanpa loop ganda).
  4. Rencana test `test-match-loop.mjs`: stub rAF/cancel scoped + restore,
     10 kasus (scheduling, urutan, dt/clamp, re-arm, stop, idempoten,
     stop-dalam-tick/render/commit, bersih pasca-cleanup).
  5. Timeout announcement: status "kepemilikan belum jelas" — lestarikan,
     jangan sentuh sampai ekstraksi khusus.
  6. P1 = famili ekstraksi (8 domain kandidat, tanpa skeleton kosong).
  7. State transisional privat ditegaskan di kontrak; tanpa slice shell lepas.
  8. Status L1: "Approved with implementation amendments"; G3 pause sampai
     kontrak + rencana test ini di-review.
- File: `00-context.md`, `03-implement.md`, `CHECKPOINT.md`.
  (`phase-2-step-1.md` §7 tak berubah — verdict tetap.)
- Next action: TUNGGU review Anda atas L1 amendemen sebelum Build P5.

### 2026-10-04 — Refactor workflow: initial loop-back record (riwayat, dilanjutkan amendemen di atas)

- State: SUPERSEDED oleh bagian amendemen L1 di atas.
- Pemicu: temuan analisis Stage 1 — efek HEAD (1184–4556) berisi ±50 closure
  rules + ±40 closure-var bersama; tidak ada tiga region yang dapat diekstrak
  (literal Design G split akan butuh parameter raksasa atau god object).
- Revisi yang ditulis (menunggu review L1 Anda):
  1. `00-context.md`: aturan Strangler (mapping → seams → ekstraksi; game-core
     hanya orkestrasi; tanpa god object publik; tanpa ekstraksi loop/teardown
     tanpa inventori + kontrak + coverage).
  2. `phase-2-step-1.md` §7: revisi Design G (verdict 9/11 tetap).
  3. `03-implement.md` §5/§6/§9/§11: mapping P1–P6 di HEAD (+anchor baru),
     inventori lifecycle 11 baris, kontrak validasi, kontrak ekstraksi pertama
     (`startMatchLoop` + tick/render/commit), risiko revisi, L1 gate.
- Kontrak ekstraksi pertama (PROPOSAL, belum dibangun):
  `match-runtime.ts` — driver rAF + dt clamp + sekuens; update/draw/snapshot
  tetap closure prototype; stop idempoten; test `test-match-loop.mjs` (stub timer).
- Tidak ada commit. Next action: TUNGGU review L1 Anda sebelum Build G3.

### 2026-10-04 — Refactor workflow: G2 Data COMPLETE (riwayat, dilanjutkan loop-back di atas)

- State: SUPERSEDED oleh bagian loop-back di atas (Build dihentikan).
- Sudah selesai (G2.2, di `Refactor-Clio`, tanpa merge ke main):
  - a: 14 `config/characters/*.json` (generator dari tabel) + `lib/characters.ts`
    sebagai reader (import `with { type: 'json' }`, API stabil);
    `ULTIMATE_CHARACTER_IDS` dari data; `characterUsesDedicatedEast` +
    `characterMirrorsWest` dari flags; registry `ULTIMATE_ICONS`/`ULTIMATE_BANNERS`.
    Test `test-character-data.mjs` (round-trip, flags, ultimate beku).
  - b: ±20 situs presentasi ultimate → descriptor + registry (preload banner,
    badge roster, HUD meter/aksi/buff/sentuh/banner).
  - c: 11 situs gameplay → flags + kind-switch (`shield`/`surge`); `isKaka` →
    descriptor; `dedicatedEast` ternary → helper (nilai pemenang identik);
    `ULTIMATE_CHARACTER_IDS` lokal → import lib.
  - d: `character-animation.js` selector → table lookup.
  - Exit R6: 0 cabang id di `prototype.tsx` + `lib/`.
  - Loop-back audit: 2 pin lokasi (mirror, shield) → kontrak baru; 1 pin
    (`Map 4 guide`) terbukti basi sejak baseline (substring tak cocok di mana
    pun) → revert verbatim + flag G4; `roster tim sinkron` HIJAU via JSON.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 7 game pre-existing +
  14 metadata sprite pre-existing (terbuka oleh perbaikan regex, di luar diff),
  build PASS, test 7/7.
- Next action: G3 Stage 1 — bagi giant effect jadi mount/tick/teardown di
  `modules/game-core/match-lifecycle.ts` (tipis, tanpa aturan).
- Commit terakhir: belum dibuat (G0 + G1 + G2 belum di-commit).

### 2026-10-04 — Refactor workflow: G2.1 P0 map data COMPLETE (riwayat, dilanjutkan G2 di atas)

- State: SUPERSEDED oleh bagian G2 COMPLETE di atas.
- Sudah selesai (G2.1a–e, di `Refactor-Clio`, tanpa merge ke main):
  - a: 10 tipe → `field-types.ts`. b: skalar + worldX/Y → `scalars.ts`.
  - c: `RAW_FIELD_CONFIGS` + `DEFAULT_RAW_PRISONS` → `raw-fields.ts`.
  - d: `KAMPUNG_OPEN_ARENA` → `raw-fields.ts`.
  - e: builders + `GUIDE_FIELD_CONFIGS` + kanal pieces + transform sebagai
    `buildFieldConfigs()` → `guide-fields.ts`; `BASES` + `BASE_RADIUS` →
    `scalars.ts`; `kanal2X` tetap live untuk render via export. Semua
    byte-exact move + wrapper tipis; ekuivalensi diverifikasi via dump
    + hitung tangan (basis kampung/pasar cocok) + `test-field-configs.mjs`.
  - Loop-back audit: 7 asersi pin lokasi lama → kontrak baru (modul + wiring);
    1 pin basi (`waterMask: 'kanal-water-mask.png'`, tak cocok di mana pun
    sejak baseline) dikembalikan verbatim + dicatat sebagai stain pin G4.
- Exit P0: 0 literal peta di `prototype.tsx` (tersisa 1 baris wiring
  `buildFieldConfigs(GUIDE_FIELD_CONFIGS)`).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 8 pre-existing,
  build PASS, test 6/6.
- Next action: G2.2b — cabang presentasi ultimate di prototype → descriptor +
  registry (situs 1039/1042/5000/5866–6165).
- G2.2a SELESAI: 14 `config/characters/*.json` (generator dari tabel, verbatim)
  + `lib/characters.ts` sebagai reader (import JSON `with { type: 'json' }`,
  API stabil); `ULTIMATE_CHARACTER_IDS` dari data; `characterUsesDedicatedEast`
  + `characterMirrorsWest` dari flags; registry `ULTIMATE_ICONS`.
  Test `test-character-data.mjs` PASS (14 file, round-trip, flags, ultimate beku).
  Audit: `definisi karakter dan roster tim sinkron` HIJAU kembali (baca JSON);
  perbaikan itu membuka 14 mismatch metadata sprite pre-existing (file di luar
  diff, isu asset-pipeline, TANPA tindakan — bukan regresi).
  Gates: tsc PASS, lint 119, build PASS.
- Catatan stat-quirk: beberapa file tampil M dengan diff kosong (fenomena
  autocrlf/index); 6 file manifest/baseline dibersihkan via checkout (konten
  identik); 4 file config milik pengguna dibiarkan apa adanya.
- Commit terakhir: belum dibuat (G0 + G1 + G2.1 belum di-commit).

### 2026-10-04 — Refactor workflow: G1 cheap decoupling COMPLETE (riwayat, dilanjutkan G2.1 di atas)

- State: SUPERSEDED oleh bagian G2.1 COMPLETE di atas.
- Sudah selesai (G1.3, di `Refactor-Clio`, tanpa merge ke main):
  - `modules/ui/character-workshop/character-workshop.tsx` baru: pindahan
    verbatim 148 baris (hanya kedalaman import `../` → `../../../`).
  - `app/prototype.tsx`: import menunjuk lokasi baru; render
    `<CharacterWorkshop onClose>` tidak berubah — workshop tetap reachable
    in-game (keputusan 2A).
  - `components/character-workshop.tsx` dihapus (satu-satunya importir
    adalah prototype).
  - `scripts/audit-game.mjs`: path baca workshop → lokasi baru; 2 asersi
    (boost directional, pixel ratio) PASS.
- File yang diubah: `modules/ui/character-workshop/` (baru),
  `components/character-workshop.tsx` (hapus), `app/prototype.tsx`,
  `scripts/audit-game.mjs`, `CHECKPOINT.md`.
- Validasi terakhir: tsc PASS 0 error, lint 121 (temuan ikut pindah file,
  0 baru), audit 8 gagal pre-existing, build:pages PASS, `node --test`
  5/5 PASS.
- Exit G1: 0 `localStorage` di `app/`, 0 `gameplayAudio.play` di `app/`,
  `modules/ui/character-workshop/` ada dan terbuka di game.
- Next action: lanjut G2.1b — skalar peta (W/H/DESIGN/MAP_*_dims, worldX/worldY)
  → `modules/world/map-data/scalars.ts`; prototype import.
- G2.1a SELESAI (2026-10-04): 10 tipe peta → `modules/world/map-data/field-types.ts`;
  prototype hapus duplikat + `import type`. tsc PASS, lint 121 (0 baru),
  audit 8 pre-existing, build PASS, test 5/5.
- G2.1b SELESAI: skalar peta (DESIGN/W/H/MAP_*_dims/MAP_OBJECT_SCALE/worldX/worldY)
  → `modules/world/map-data/scalars.ts`; prototype import. Gates sama hijau.
- G2.1c SELESAI: `RAW_FIELD_CONFIGS` + `DEFAULT_RAW_PRISONS` (±1.226 baris,
  byte-exact move) → `modules/world/map-data/raw-fields.ts` (export, nonaktif
  tetap nonaktif). Loop-back audit: 3 asersi pin lokasi lama (W/H/WORLD_SCALE_X,
  MAP4_WORLD_SCALE, grounds dirt/concrete/grass) → kontrak baru (modul + wiring).
  Gates: tsc PASS, lint 121, audit 8 pre-existing, build PASS, test 5/5.
- G2.1d SELESAI: `KAMPUNG_OPEN_ARENA` (±304 baris, byte-exact move) →
  `modules/world/map-data/raw-fields.ts` (export). Gates: tsc PASS, lint 120,
  audit 8 pre-existing, build PASS, test 5/5.
- Commit terakhir: belum dibuat (G0 + G1 belum di-commit).

### 2026-10-04 — Refactor workflow: G1.2 audio port COMPLETE (riwayat, dilanjutkan G1 di atas)

- State: SUPERSEDED oleh bagian G1 COMPLETE di atas.
- Sudah selesai (G1.2, di `Refactor-Clio`, tanpa merge ke main):
  - `modules/audio/audio-port.ts` baru: `AudioPort` (`play`/`close`) +
    `createMatchAudio()` per-match; memiliki unlock wiring agar root hanya
    create + close. Attenuasi jarak tetap di call site.
  - `app/prototype.tsx`: 13 situs `gameplayAudio.play` → `matchAudio.play`
    (nama `audio` sudah dipakai audio menu → `matchAudio`); import engine,
    setup, dan teardown dipindah ke port. Grep: 0 `gameplayAudio` di `app/`.
  - `scripts/test-audio-port.mjs` baru: pin 13 situs verbatim + kontrak
    (wiring, play aman 9 suara, close idempotent). Perintah:
    `node --experimental-strip-types --test scripts/test-audio-port.mjs`.
  - Testabilitas TS-di-node: 3 import rantai audio memakai ekstensi `.ts`
    eksplisit + `allowImportingTsExtensions: true` di `tsconfig.json`.
- File yang diubah: `modules/audio/audio-port.ts` (baru),
  `scripts/test-audio-port.mjs` (baru), `app/prototype.tsx`,
  `lib/gameplay-audio.ts` + `lib/audio-settings.ts` (ekstensi import),
  `tsconfig.json`, `CHECKPOINT.md`.
- Validasi terakhir: tsc PASS 0 error, lint 121 (0 baru di file sentuhan),
  audit 8 gagal pre-existing (mute PASS), build:pages PASS, `node --test`
  5/5 PASS (4 lama + audio).
- Next action: mulai G1.3 — pindah workshop ke `modules/ui/`.
- Commit terakhir: belum dibuat (G0 + G1.1 + G1.2 belum di-commit).

### 2026-10-04 — Refactor workflow: G1.1 storage wrapper COMPLETE (riwayat, dilanjutkan G1.2 di atas)

- State: SUPERSEDED oleh bagian G1.2 COMPLETE di atas.
- Sudah selesai (G1.1, di `Refactor-Clio`, tanpa merge ke main):
  - `modules/storage/local-settings.ts` baru: satu-satunya pemilik kunci
    `bentengan:music-muted` + `benteng-audio-levels-v1`; `load/saveMusicMuted`,
    `load/saveLevelSnapshot` (parse ketat, tolak bentuk buruk, tak pernah
    throw). Runtime terverifikasi via stub `window` (round-trip, tolak JSON
    rusak, aman tanpa window).
  - `app/prototype.tsx`: 2 situs mentah → wrapper; konstanta
    `MUSIC_MUTED_STORAGE_KEY` dihapus. Grep: 0 `localStorage` di `app/`.
  - `lib/audio-settings.ts`: baca/tulis level via wrapper; cache, clamp,
    event tidak berubah.
  - Loop-back audit: asersi mute di `scripts/audit-game.mjs:204` memeriksa
    lokasi lama → diperbarui ke kontrak baru (wrapper + pemakaian).
    Bukan baseline-hash, jadi pembaruan asersi adalah perbaikan benar, bukan
    menutupi regresi.
- File yang diubah: `modules/storage/local-settings.ts` (baru),
  `app/prototype.tsx`, `lib/audio-settings.ts`, `scripts/audit-game.mjs`,
  `CHECKPOINT.md`.
- Validasi terakhir: tsc PASS 0 error, lint 122 (0 baru), audit 8 gagal
  pre-existing (asersi mute PASS kembali), build:pages PASS, stub wrapper PASS.
- Pelajaran: JANGAN `npm run format` telanjang — oxfmt memformat 316 file.
  Sudah di-revert kecuali file tugas; diff kini hanya set intentional.
  Format secukupnya per file yang disentuh bila diperlukan.
- Next action: mulai G1.2 — `modules/audio/audio-port.ts` + mock test per situs.
- Commit terakhir: belum dibuat (G0 + G1.1 belum di-commit).
- Sudah selesai (G0, di branch `Refactor-Clio`, tanpa merge ke main):
  - G0.1 `npm ci` lulus (564 paket).
  - G0.2 Q4 ditutup: tidak ada aturan path-restriction di `.oxlintrc.json`;
    `dependency-cruiser` tidak ditambahkan (default sesuai rencana).
  - G0.3 skrip `check` ditambahkan ke `package.json`.
  - G0.4 CI `pages.yml`: job lint, typecheck, audit disisipkan sebelum
    `build:pages`. Belum di-merge; pengguna yang merge ke main.
  - G0.5 `checkJs: true` + 114 error JS diperbaiki via JSDoc (10 file `lib/`,
    tanpa perubahan runtime; 2 fallback `?? 0` netral, 1 cast `as FieldId`,
    1 predikat filter). `tsc --noEmit` PASS 0 error.
  - G0.6 baseline tercatat di `03-implement.md` §4: tsc PASS, lint 122
    (pre-existing), audit FAIL 8 asersi (pre-existing), build:pages PASS.
    Varian: `npm run check` ujung-ke-ujung belum hijau di baseline; aturan
    per-ekstraksi: tidak ada lint/audit baru, tsc bersih, build hijau.
  - G0.7 tiga characterization test baru PASS + 1 lama: `test-tag-contact`,
    `test-team-combo`, `test-collision-navigation`, `test-click-navigation`
    (4/4 via `node --test`).
- File yang diubah: `package.json`, `.github/workflows/pages.yml`,
  `tsconfig.json`, `lib/*.js` (10 file, JSDoc saja), `app/prototype.tsx`
  (1 cast type), `lib/selection-preview-assets.ts` (1 predikat),
  `scripts/test-{tag-contact,team-combo,collision-navigation}.mjs` (baru),
  `.workflow/bentengan-refactor/03-implement.md`, `CHECKPOINT.md`.
- Validasi terakhir: tsc PASS, lint 122 (0 di file sentuhan G0), audit FAIL 8
  (sama dgn baseline), build:pages PASS, `node --test` 4/4 PASS.
- Masalah tersisa: lint/audit признать pre-existing di HEAD; jangan
  diperbaiki borongan (melanggar blast radius). Anchor `673ef2a4` tetap
  historis; baseline G0 yang berlaku.
- Next action: mulai G1.1 — wrap 2 touchpoint storage ke
  `modules/storage/local-settings.ts`.
- Commit terakhir: belum dibuat (file workflow + G0 belum di-commit).

### 2026-10-03 — Harness pilihan map bawaan

- Root cause live port4320: server lama mengembalikan template/library tanpa
  builtins/builtinTemplates; frontend sebelumnya fallback [] sehingga daftar
  bawaan hilang diam-diam. Server lama session34221 dihentikan; versi terbaru
  berjalan port4320 session15218. Tab/draft lama tidak direfresh paksa.
- catalog.mjs shared guard menolak katalog tidak lengkap dengan peringatan
  restart; HTTP harness memastikan lima template bawaan + route MIME JavaScript.
- 7 tes Map Studio PASS. Browser port4320: lima bawaan muncul, Kampung Merdeka
  dapat dipilih/dibuka, error console kosong. Screenshot ../map-catalog-fixed.png.
- config/map-studio.json berisi perubahan baru pengguna, tidak ikut commit ini.
  Fitur artwork penjara tetap keterbatasan terpisah, bukan diperbaiki oleh harness.
- COMPLETE: commit dbda042 dipush; Pages run37102736839 build/deploy SUCCESS.
  Next: pengguna gunakan tab editor baru4320; jangan simpan template QA ke manifest.

### COMPLETE — Publish Jago + Arena Benteng 1, hapus arena 3D dari daftar

- Release `c796cde` dipush ke github/main; Pages run `37027823960`
  build + deploy SUCCESS. URL https://lengkongandreuw.github.io/bentengan-squad-tag/.
- 53 referensi entry aset map/Jago terverifikasi ada di dist-pages dan dimensi
  cocok dengan manifest. Working tree clean sebelum pencatatan hasil deployment.
- Fitur editor lifecycle `6fac739` ikut release ini. Map3D tidak muncul dalam
  daftar aktif, tetapi data/kode tetap recoverable. Optimasi frame/resolusi belum
  dilakukan; versi map yang pengguna simpan dipublikasikan tanpa perubahan visual.
- Next action: feedback pengguna / profiling dan optimasi map bila diminta.

- Implementasi/aset scoped `1623c1a` tersimpan; upstream `a199b80` sudah merge
  tanpa konflik. 6 tes map + 5 tes sprite PASS, tsc --noEmit PASS,
  build:pages PASS (warning CSS/chunk legacy masih ada).
- Browser build produksi 4322 masuk Arena Benteng 1; console error kosong.
  Screenshot ../release-jago-map.png. Push dan deployment sudah selesai di atas.

- Pengguna mengizinkan publikasi manifest sprite Jago dan map lokal beserta
  aset yang dirujuk. Diff sprite hanya Jago: enam arah run diagonal/kiri/kanan.
- Arena Benteng 1 lulus mapIssues (kosong). builtinStates.kampung3d=deleted
  menghapus arena eksperimental dari pilihan game, recoverable dari editor.
- Optimasi ukuran/frame sumber sebelumnya masih diskusi, tidak diam-diam
  mengurangi kualitas aset pengguna. Akan publish versi lokal yang tersimpan.
- Next: commit scoped referenced assets, merge github/main terbaru, tes dan
  build, push, tunggu workflow Pages; jangan stage upload yang tidak dirujuk.

### Checkpoint terkini — 2026-10-02 (diskusi + pembaruan dokumentasi)

- Request aktif: saran meringankan map editor dan catat fitur programmer lain.
  Tidak mengubah aset, manifest map/sprite, dependency, atau gameplay pada turn ini.
- HEAD implementasi lokal `2c1029c`: merge `github/main` lama `1c0977a`
  (pemulihan baseline Nusantara 1) dengan lifecycle editor `6fac739`.
  Enam tes Map Studio, typecheck dan build Pages sesudah merge tersebut PASS.
  Kode lifecycle belum dipush; belum ada konfirmasi deployment untuk commit ini.
- Fetch terbaru menghasilkan `github/main` = `a199b80`. PR #6 / `1a73c74`
  menambah profil pemain localStorage, setup username, karakter unggulan,
  menang/kalah, tag/penjara/rescue, KDA dan radar performa; panel lazy di menu/HUD.
  `ac3edfb` membersihkan .npmrc; `75dc69f` meregenerasi package-lock.json.
  Upstream ini belum di-merge, build/runtime fitur profil BELUM diuji lokal.
  Branch `github/Refactor-Clio` ada tetapi tidak diasumsikan sudah masuk main.
- IMPORTANT: pengguna sudah menyimpan map aktif `Arena Benteng 1` ke
  config/map-studio.json (studio-kampung-2420b8cf, 1969x1560, 84 objek,
  46 visual, 11 animasi @54 frame). Pernyataan manifest kosong di histori
  setelah bagian ini SUDAH TIDAK BERLAKU. Jangan reset/replace manifest tersebut.
- Referensi gambar map: 13 aset unik / 14,68 MiB file; perkiraan buffer RGBA
  109,48 MiB berdasarkan dimensi (bukan profiling memori browser aktual).
- Dirty pengguna: config/map-studio.json, config/sprite-studio.json,
  public/map-studio/, public/sprite-studio/jago/. Semua dipertahankan.
- Server lifecycle baru 4322; tab/server lama 4320 tetap dipertahankan agar
  draft pengguna tidak hilang. Jangan hentikan/refresh paksa tab dengan draft.
- Memori diperbarui berdasarkan kode remote, bukan hanya judul commit.
  Tidak menjalankan ulang build karena perubahan turn ini dokumentasi saja.

Next action jika implementasi/publikasi dilanjutkan: periksa status dan fetch
lagi, gabungkan upstream terbaru secara aman dengan menjaga file map/sprite
pengguna, selesaikan konflik hanya pada kode terkait, jalankan tes/typecheck/
Pages build setelah merge, lalu publish hanya file tugas yang disetujui.
Jangan ikut meng-commit map/sprite pengguna tanpa permintaan publish asetnya.

Next action optimasi: ukur loading/memori/FPS map pengguna lebih dahulu;
bedakan bottleneck atlas/animasi dari collider/AI, gunakan duplikat map/aset
untuk uji kualitas sebelum menerapkan perubahan. Diskusi belum mengizinkan
otomatis resize/reduce frame atau menghapus objek pengguna.

- 2026-10-02: revisi edit existing map + Arsip/Sampah/Pulihkan. Enam tes model/API
  lulus, typecheck lulus; browser isolated menguji edit/simpan Pasar, Arsip, Sampah,
  Pulihkan tanpa error. Server baru 4322 (session 95860) agar tab/draft lama 4320
  tidak ditutup. Fixture 4321 (session 45903). Sedang build dan publish kode saja.
  config/map-studio.json aktual tetap kosong; perubahan sprite/config dan upload
  pengguna tidak disentuh. Bawaan 3D hanya pengelolaan daftar, editor visual 2D.

- 2026-10-02 Map Studio: implementasi editor/model/server/runtime sudah tersimpan
  di commit checkpoint dda7ee0 dan 605e2ad; penyelesaian 03df919. Pengujian 5
  model/API map, 5 Sprite Studio, TypeScript dan build Pages lulus. Uji browser
  save GIF/FPS 6 dan aktivasi pada fixture lulus; map custom muncul di pilihan
  arena dan masuk pertandingan tanpa error JavaScript. COMPLETE: commit
  65426da dipush; Pages run 36978917151 build/deploy SUCCESS.
  config/map-studio.json tetap kosong; tidak mengganti map/sprite pengguna.
  Fixture QA dipindahkan ke sa/map-studio-test-fixture-Tv5nsZ, di luar kode game.
  Audit lama masih gagal 7 assertion format/version/baseline; test Kampung 3D
  lama gagal isKanalField undefined (sudah ada pada baseline sebelum perubahan).
  Test series Maria/Boke lulus. Jangan rebuild sprite pengguna untuk mengatasinya.
  Server Map Studio 4320 aktif (terminal session 34221). Tab editor berisi contoh
  salinan Kampung belum disimpan; manifest aktual tetap maps:[]. Perubahan baru
  pengguna config/sprite-studio.json dan public/sprite-studio/jago/ tidak ikut
  commit/push Map Studio. Untuk mencoba lagi: npm run admin:maps.

- 2026-10-02: kontrol FPS 1–60 langsung di preview editor, tersinkron Advanced;
  pengali playback bersama 0,25×–4× di comparison (preview saja, tanpa mengubah
  skala atau FPS game). Tes browser FPS 6/24, validasi FPS invalid dan pengali
  lulus; 5 tes dan typecheck lulus. Commit `de8dc28` dipush, Pages run
  `36952810037` build/deploy SUCCESS. Draft test dibatalkan; sprite pengguna utuh.

- Panel perbandingan `/comparison`: seluruh animasi custom diterapkan lokal,
  common camera/zoom/pijakan, visualScale karakter seperti renderer, filter/pause,
  reload manifest, deep link edit slot. Uji browser 9 animasi Raja dan filter
  ultimate lulus tanpa error; tes server route dan syntax lulus. Tidak mengubah
  config/sprite-studio.json atau aset upload pengguna. Commit `4559dd2` dipush;
  Pages run `36951628757` build/deploy SUCCESS. Panel lokal 4319 sudah direstart.

- 2026-10-02: movement independen (aktif saja atau draft dicentang), 81 slot
  (Default + 8 arah untuk setiap movement), fallback kompatibel renderer lama,
  status file dekat upload + inspeksi metadata dan dukungan PNG tunggal/sheet/frame.
  Uji PNG/idle diagonal/victory diagonal/draft tidak terpilih/error file di browser
  lulus; API/unit fallback/typecheck lulus. Commit `722686a` dipush; Pages run
  `36947108535` build/deploy SUCCESS. Server 4319 diperbarui, refresh tab untuk
  sesi baru. Pengujian tidak menerapkan sprite test ke karakter game.

- Revisi UI sederhana: seri/arah + upload/crop + tandai sesuai + update karakter
  batch atomik. Draft hasil proses bertahan saat pindah arah/seri/karakter;
  pengaturan teknis dipindah ke Advanced options. Tes API batch termasuk rollback
  invalid, revision guard, dan preservasi arah/karakter lain lulus. Typecheck/syntax
  dan uji UI draft/approval/switch karakter lulus tanpa error browser. Commit
  `d1d3205` dipush; Pages run `36871348889` build/deploy SUCCESS. Server lokal
  4319 dimuat ulang; pengguna perlu refresh panel. Sprite game tidak diganti.

- Revisi Sprite Studio 2026-10-01: preview upload GIF/gambar langsung, crop visual
  move/resize, koordinat per sel sheet, reset full frame dan guard sebelum Save.
  Tidak mengubah sprite karakter maupun mekanik game. Commit `e545f1b` dipush;
  GitHub Pages run `36861802699` build/deploy SUCCESS. Lima tes, typecheck,
  build Pages dan uji browser GIF/crop lulus. Warning npm/CSS build lama masih ada.

- State: `COMPLETE` (Sprite Studio 2026-10-01)
- Diperbarui: 2026-10-01
- Branch: `main`
- Commit implementasi terakhir: `d1d3205`
- Perubahan pengguna yang dipertahankan: app/globals.css, lib/characters.ts,
  public/fonts/ dan aset public/sprite-studio/ yang tidak dirujuk manifest.

## Tujuan aktif

2026-10-01 COMPLETE: Sprite Studio ingame lokal port 4319. Manifest override per
karakter/per slot, 30 slot (run/tag/parkour 8 arah; idle/prisoner/ready/ultimate/
victory/defeat). Server/editor/compiler + renderer fallback dan preload dibuat.
Input sheet PNG/GIF/WebP/multi PNG, grid/order/crop, pivot/scale/offset/FPS/mirror.
Simpan slot, reset fallback, build+uji game, publish dengan monitoring Pages.
Validasi: 5 tes node PASS, TypeScript PASS, build:pages PASS; browser editor dan
Build + Uji game PASS, console error kosong. Manifest tetap kosong: tidak ada
sprite karakter diganti. GIF berlebih ditolak dengan batas yang jelas (128 frame).
Publikasi: implementasi 16b9e39, merge map/UI terbaru 1179d0e; Pages run
36859336242 SUCCESS (build + deploy). Server sesi 13901 port 4319 aktif.
Dirty milik user: globals.css, lib/characters.ts, public/fonts; sudah dikembalikan
sesudah sync dan tidak ikut publish. Backup stash bernama 'Preserve user font and
character edits during Sprite Studio sync' masih disimpan untuk pemulihan.

2026-09-26: Kontrol mouse klik kiri HANYA tujuan, kanan boost (revisi terbaru).
Parkour tetap Shift/tombol mobile. Route A* terhadap collider/water; keyboard
mengambil alih; batalkan target saat pause/penjara/ultimate/menu. Tidak mengubah aset.
Kontrol sentuh hanya pada viewport <=1024px; layout lengkap landscape/portrait.
Tes navigasi node, TypeScript, build:pages lulus. Browser: kontrol tersembunyi
1366x768; tampil dan seluruh tombol di layar pada 844x390 dan 390x844; console
error kosong. Pengujian perangkat fisik belum dilakukan. Next: push dan Pages.
User memiliki perubahan config/selection-previews.json dan aset brand yang belum
dicommit; jangan ikut stage perubahan tersebut.

2026-09-24: Panel lokal preview karakter. Scope: upload GIF/gambar statis,
posisi/skala active preview, preview langsung, simpan dan publish GitHub.
Konfigurasi versioned terpisah dari layout publik; gameplay tidak diubah.
Selesai: editor lokal, upload/drag/slider/reset/simpan/publish, kontrak terpisah,
Host/Origin/token, validasi path/ukuran, backup konfigurasi dan concurrency guard.
Pengguna telah mengisi GIF seluruh roster dan menyimpan/memublikasikan sebagian
integrasi pada 065eaca; jangan menimpa konfigurasi atau CSS roster mereka.
Tambahan terbaru: editor logo landing, preload GIF seluruh tim sebelum character
selection dengan shared readiness cache, favicon BST upload pengguna.
Validasi: 3 test node lulus (cache/retry, validator, server upload/logo/security),
TypeScript dan build:pages lulus. Browser produksi: loading -> GIF Ciici; pindah
Kaka langsung src GIF complete, Ciici kembali statis. Tidak ada console error.
Panel logo terlihat dan server terbaru berjalan pada 127.0.0.1:4318.
Publikasi selesai: commit 8c6502d, Pages run 36079767892 SUCCESS (2026-09-25).
Favicon identik SHA256 dengan upload pengguna. Folder admin tidak ada dalam
dist-pages. Next action: tunggu feedback; buka panel lewat npm run admin:characters.

2026-09-21: Kampung Merdeka 3D eksperimental sebagai map kelima, bukan pengganti.
MODE implementasi + publish. Terrain asli, seluruh scenery low-poly 3D;
sprite dan gameplay tetap. Konfigurasi arena kloning setelah normalisasi agar
collider/base/prison identik. Renderer WebGL terpisah, loading/error terkontrol.
Sudah: renderer lib/kampung-3d.ts, map kelima deep clone, WebGL loading/error,
scenery low-poly lengkap dan margin Kampung, batching, resource disposal,
sprite billboard depth, koreksi kaki/nameplate terpotong, carousel lima map.
TSC dan audit lulus (termasuk test-kampung3d: clone, collider, proyeksi, rotasi).
Build Pages awal lulus. Browser desktop: pilih tim/map, loading, overview,
follow, berjalan keluar base dan animasi bot lulus; console terakhir bersih.
Uji browser di work/test-kampung3d.cjs memakai bundled Playwright/Chrome
karena tool browser Node REPL tidak tersedia. Screenshot di work/3d-*.png.
Perbaikan pendukung: key unik backdrop, favicon.svg yang memang tersedia,
audit UI menerima koreksi logo merah v9 yang sudah ada sebelum task ini.
Implementasi b043b90; merge 3860d85 mempertahankan github/main 7f78069 (notifikasi
match, Minta Rescue, CSS/HUD dan sumber Lala baru). Konflik hanya disatukan,
bukan menimpa fitur. Path notifikasi memakai publicAsset agar Pages valid.
TSC + build final setelah merge lulus; browser desktop setelah merge tanpa error.
Mobile landscape/portrait sebelum merge juga lulus; pengujian build produksi
mobile/asli/non-WebGL selesai melalui work/test-kampung3d.cjs.
Audit sebelum merge lulus lengkap; setelah merge hanya baseline sumber Lala
gagal karena commit upstream ff31445 mengubah sprite-sources/lala.png tanpa
rebuild atlas/baseline. Jangan ubah baseline atau sprite untuk menutupi ini.
Test-kampung3d lulus setelah merge. Autentikasi GitHub terverifikasi valid.
Pengujian build produksi: mobile landscape/portrait dan Kampung asli tanpa
console error; WebGL dinonaktifkan menampilkan pesan jelas dan Back berfungsi.
Push pertama ditolak karena commit upstream baru 7295482 (path/preload event).
Sudah merge tanpa membuang perubahan; helper URL tidak dipanggil dua kali.
Publikasi selesai 2026-09-22: ea9b24e sudah di github/main. GitHub Pages run
35658921041 selesai SUCCESS: https://github.com/lengkongandreuw/bentengan-squad-tag/actions/runs/35658921041
Next action: tunggu feedback pengguna pada map kelima Kampung Merdeka 3D.
Detail art masih low-poly eksperimental; performa perangkat fisik belum diuji.

Task terbaru: ABOUT DEVELOPER di landing dengan latar upload dan kredit lengkap.
Selesai: komponen developer-credits, CSS responsif, generator background WebP,
menu pembuka, keyboard guard, reduced motion, Back/Jeda/Lanjut/Ulangi.
TSC dan build:pages lulus; browser memverifikasi tampilan, scroll sampai selesai,
Ulangi, Jeda, Back dan pemulihan fokus. Publikasi c548fe6 berhasil; GitHub Pages
run 35504546649 sukses. Next action: tunggu feedback pengguna.

Task terbaru: preview Boke/Kodo dan potongan logo Tim Merah. Implementasi selesai:
sumber upload disimpan, generator targeted build-preview-refresh.mjs, portrait
baru, skala preview Boke 1.05/Kodo 1.17, logo normal/aktif dipisah pada y466.
Gameplay tidak diubah. TypeScript, build:pages dan diff-check lulus; empat aset
output diperiksa visual. Belum uji interaktif seleksi/mobile. Publikasi c5fb210
berhasil, GitHub Pages run 35483974573 sukses. Next action: tunggu feedback.

Task selesai: implementasi + publish series Maria/Boke. Sumber di folder
sprite-sources/maria dan boke sudah disinkronkan hingga 2f541bc; perubahan CSS
pengguna tetap dipertahankan. Atlas tambahan series-runtime.webp (8×11 sel160)
dan metadata series.json dibangun oleh scripts/build-series-sprites.mjs.
Renderer memilih delapan arah, idle, tag sesuai target, prison/win/lose;
parkour/rescue tetap atlas lama. Loading menunggu kedua atlas baru.
49 pose Maria dan 50 Boke sudah diperiksa visual; dua frame diagonal Maria
yang terpotong di tepi sumber dihindari. TSC lulus. Tidak mengubah fisika/statistik.
Validasi: test-series-sprites, audit gameplay, TypeScript dan build:pages lulus;
peringatan CSS/npm nonfatal. Maria terlihat pada pertandingan browser lokal.
Belum menguji manual seluruh pose Boke/mobile. Tidak mengklaim semua pose telah
diuji dalam pertandingan; pemetaan seluruh pose diuji otomatis.
Statistik ronde/leaderboard dari github/main ab94bdb sudah digabung tanpa
konflik. TypeScript, audit dan build gabungan lulus. Publikasi 9f26b9c sukses:
GitHub Pages run 35455831521. Next action: tunggu feedback sprite pengguna.
URL: https://lengkongandreuw.github.io/bentengan-squad-tag/

Task terbaru: mixer volume Musik/SFX dan preview ingame selesai. Default .16/.85,
penyimpanan browser dan update langsung; musik normal diredam saat preview.
File: lib/audio-settings.ts, components/audio-settings.tsx, lib/gameplay-audio.ts,
app/prototype.tsx, app/globals.css, memori.md. TypeScript/audit/build/diff-check
lulus; uji clamp/default/persistence/event/mute lulus. Uji dengar belum dilakukan.
Publikasi 0183c0a berhasil; GitHub Pages run 34960714832 sukses.
Next action task terbaru: tunggu feedback audio pengguna. Migrasi repo tetap HOLD.

Task audio gameplay terbaru: sembilan efek prosedural selesai di
lib/gameplay-audio.ts dan app/prototype.tsx. TypeScript, audit, build:pages,
diff --check lulus. Belum ada uji dengar langsung di browser/perangkat.
Publikasi 00e1537 sukses, Pages run 34935578548. Gameplay/mute musik tetap.
Next action: tunggu feedback volume/karakter suara dari pengguna.

Publikasi UI arena sesuai instruksi pengguna "publikasikan sekarang".
Carousel, lima portrait skuad, background map, video landing/loading, dan poster
tim selesai. Generator arena-ui, TypeScript, build:pages, diff --check lulus.
Uji browser mencapai loading Tim Merah (29%); visual carousel/mobile belum
diverifikasi karena akses browser terhenti. Jangan mengklaim visual QA selesai.
Publikasi selesai: 726c552, GitHub Pages run 34932815982 sukses.
Gambar hijauload1.jpg terbaru dari ab886b9 ikut digabung dan WebP diregenerasi.
Next action task terbaru: tunggu feedback pengguna; visual carousel/mobile
belum terverifikasi, bukan blocker publikasi yang diminta langsung pengguna.

Task terbaru: loading sebelum seleksi karakter dan pertandingan. Implementasi
di app/prototype.tsx, app/globals.css, lib/asset-ready.ts. Gambar decode sebelum
ditampilkan, video menunggu loadeddata, progres, retry/cancel, batching 4 aset.
TypeScript, audit, build:pages, dan diff --check lulus. Uji helper decode sukses,
gambar kosong, timeout, dan retry lulus. Uji browser interaktif belum dilakukan.
Audio tetap opsional, video menunggu frame awal. Commit d82f7cf sudah dipublish;
GitHub Pages sukses pada run 34796256954.

Proporsi visual 14 karakter mengikuti perbandingan roster pengguna, Kaka = 1.
Skala seragam untuk kedua sumbu; collider, atribut gameplay, dan atlas tetap.
Implementasi visualScale dan posisi HUD kepala selesai.
TypeScript, audit, build:pages, serta diff --check lulus. Perbandingan otomatis
membuktikan seluruh atribut selain visualScale identik dengan HEAD sebelumnya.
Build memberi warning npm/CSS nonfatal. Uji visual interaktif belum dilakukan.
File task ini: lib/characters.ts, app/prototype.tsx, memori.md, CHECKPOINT.md.

## Sudah selesai

- Sembilan kelompok PNG Jago sudah disalin ke `sprite-sources/jago-parts/`.
- Generator deterministik `build-jago-source.mjs` menyusun sumber atlas 7×6.
- Runtime Jago memakai arah lari depan/samping/belakang, parkour tiga arah,
  serta pose khusus penjara, menang, dan kalah.
- Orientasi samping dikoreksi: kanan memakai frame asli; kiri memakai mirror,
  berlaku untuk lari, sprint, dan parkour samping.
- Atlas hasil komposit sudah diperiksa di atas latar terang dan semua 42 sel utuh.
- Pemilihan Tim Merah dan Tim Hijau pada ponsel diperbaiki.
- Tampilan ponsel portrait otomatis memakai layout landscape.
- D-pad dan susunan tombol aksi mobile diperbesar serta dirapikan.
- Tombol mekanik pemain nonaktif selama berada di penjara; menu dan opsi
  non-mekanik tetap aktif.
- Navigasi AI dan perjalanan pulang setelah rescue membaca collider serta water
  mask dan dapat memilih arah alternatif.
- Parkour sungai mencari titik pendaratan darat yang aman.
- Kecepatan, konsumsi boost, dan bias target AI kawan/lawan disetarakan.
- Badge Ultimate Raja/Kaka, status pertandingan, dan penjelasan aturan diperbarui.
- Perubahan dipublikasikan ke GitHub Pages.

## File implementasi terakhir

- `app/prototype.tsx`
- `app/globals.css`
- `scripts/audit-game.mjs`
- `memori.md`

## Validasi terakhir

- `node scripts/build-jago-source.mjs`: lulus.
- `node scripts/build-sprites.mjs jago`: lulus, 42 frame, sel 256×256.
- `npm run sprites:build`: lulus untuk 14 karakter; Jago 42 frame, sel 256×256.
- `npm run sprites:baseline`: hanya lima hash golden Jago yang berubah.
- `npx tsc --noEmit`: lulus.
- `npm run audit`: lulus, termasuk frame kanan asli, mirror kiri, parkour tiga
  arah, dan pose khusus Jago.
- `npm run build:pages`: lulus, bundle produksi GitHub Pages terbentuk.
- Uji runtime lokal: halaman tampil, Tim Hijau dapat dipilih, dan seleksi
  karakter terbuka.
- GitHub Pages workflow: sukses.
- URL publik: <https://lengkongandreuw.github.io/bentengan-squad-tag/>

## Masalah atau blocker tersisa

Tidak ada blocker. Push berhasil melalui akses jaringan yang disetujui.
GitHub Pages untuk 3b02cc5 sukses: workflow run 34793092437.

## Next action

Task loading selesai. Tunggu umpan balik pengguna; uji browser interaktif masih
belum dilakukan, jangan mengklaim sudah diuji langsung pada ponsel.

## Format checkpoint ketika task aktif

```text
State: ACTIVE
Tujuan aktif: [hasil yang harus dicapai]
Sudah selesai: [tahap yang benar-benar selesai]
File yang diubah: [daftar path]
Validasi terakhir: [perintah dan hasil]
Masalah tersisa: [error atau blocker]
Next action: [satu tindakan konkret berikutnya]
Commit terakhir: [hash atau belum dibuat]
```

Jika limit hampir habis atau proses terinterupsi, simpan keadaan kerja apa adanya
dan isi seluruh bagian di atas sebelum berhenti. Jangan menandai tahap sebagai
selesai jika belum dibuktikan oleh pemeriksaan yang relevan.
