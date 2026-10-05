# bentengan-refactor — context

Every `/phase-*` command reads this file first. Do not assume or hardcode a
platform or services list anywhere else.

## Platform / stack

Web frontend. React 19.2.6 + TypeScript 5.9.3, Vite 8 + Vinext (static export).
Canvas 2D game loop. Three.js only for experimental map `kampung3d`.
Tailwind 4 + shadcn primitives. Lint: oxlint + oxlint-tsgolint. Format: oxfmt.
Typecheck: `npx tsc --noEmit` (no `tsc` script, `allowJs` on, `checkJs` off).
Deploy: GitHub Pages via `.github/workflows/pages.yml` → `dist-pages/`.

## What we're building

Behavior-preserving modularization of `app/prototype.tsx` (7,741 lines at pin
`673ef2a4`) per `Review Plan.MD`: S1 safety net first, then findings F0–F10,
then extractions P0–P6 into `modules/`. Exit: `prototype.tsx` is composition
and wiring only, with one owner per responsibility. Under 500 lines stays a
target. Boundary quality wins any tie. No gameplay, balance, or asset changes.

## Existing Services

1. GitHub Pages + Actions CI — build only (`npm ci` → `npm run build:pages`).
2. npm asset pipelines — `fields:build`, `sprites:build`, `ui:build`, `audit`.
3. localStorage — 2 runtime touchpoints (music mute, audio levels JSON).
4. Local character-admin server — `scripts/character-admin/`, 127.0.0.1:4318,
   never ships to Pages.

Proposed Services: anything the refactor introduces, such as `modules/storage/`
or `modules/audio/audio-port.ts`, counts as Proposed until Analyze says
otherwise.

## Rules for every phase

- The workflow uses **Analyze / Design / Build / Retrospective** for phase
  names. Never "Phase 1–4". `Review Plan.MD` already uses Phase 1/2/4 to mean
  extraction sequencing, so the two vocabularies must not collide.
- Blast radius: one finding or one extraction per change. Do not touch other
  maps or features, rebuild unrelated sprites/audio/UI, or edit baselines.
- Re-verify `file:line` anchors against `673ef2a4` before designing and after
  each extraction.
- Blocked findings stay blocked. Q1 gates F0. Q2 gates F2/F3 balance sign-off.
- Loop-back trigger: a Build finding that falsifies a Design assumption stops
  Build, gets written down, and returns to Design.
- Gates after every change: `npx tsc --noEmit`, `npm run lint`, `npm run audit`,
  `npm run build:pages`.
- Plain-language names. No speculative abstractions.
- File names stay easy to read. Avoid overly technical names.
- Finalize `prototype.tsx` last. The final trim runs after every extraction
  lands, not between extractions.

## Strangler rules (Design loop-back 2026-10-04)

- Lifecycle mapping first, strangler seams second, subsystem extraction third.
  Lifecycle is an analysis map (setup/mount, per-tick ordering, loop, listener
  and timer ownership, cleanup) — never a requirement to move the whole effect
  into exported mount, tick, and teardown functions.
- `modules/game-core/` owns runtime orchestration only: runtime types, loop
  start and stop, setup and cleanup coordination, narrow shared runtime
  handles. It must never become the permanent owner of tag, navigation,
  collision, score, spawn, rescue, capture, or other gameplay rules.
- No public mutable god object. A runtime object may exist only as a private
  transitional implementation detail. Final gameplay modules receive narrow
  domain inputs and outputs, never wholesale shared state.
- No loop or teardown extraction without the lifecycle inventory, the
  validation contract, and characterization coverage appropriate to the seam.
- Time source and first-frame behavior must match the HEAD loop exactly. Do
  not replace the clock, dt clamp, first-frame dt, or frame order as an
  optimization during this behavior-preserving refactor.
- P1 is an extraction family, not one change. No P1 change moves the whole
  `update()` body, all helpers, or all shared state at once. Do not create
  gameplay modules as empty skeletons.

## How modules behave

- **One owner per responsibility.** Each gameplay concern lives in exactly one
  module. The ownership table below names the owner.
- **Game rules stay out of React.** `app/prototype.tsx` assembles the runtime,
  mounts the UI, and renders snapshots. It calculates no collision, tag, spawn,
  score, or snapshot cadence.
- **Lifecycle is not gameplay.** `mount`, `tick`, and `cleanup` only manage when
  things start, run, and get cleaned up. They never become a home for tagging,
  spawning, scoring, or navigation.
- **Modules take only what they need.** No module reads every `useRef` or the
  whole React state. No function takes thirty parameters. No new global
  singleton exists to dodge a parameter.
- **Every extraction is verifiable.** Each one carries test or characterization
  coverage. Run typecheck, lint, audit, and the Pages build after it. An
  extraction that touches several subsystems returns to Design for a smaller
  scope.

## Module boundaries

**Ownership.** Each row names one owner. A module asks that owner for a result.

| Responsibility           | Owner                                           |
| ------------------------ | ----------------------------------------------- |
| Collision and navigation | `modules/gameplay/collision-navigation.ts`      |
| Tagging and combat       | `modules/gameplay/tag-combat.ts`                |
| Score and bars           | `modules/gameplay/bars-score.ts`                |
| Input navigation         | `modules/gameplay/input-navigation.ts`          |
| Spawn rules              | `modules/gameplay/spawn.ts`                     |
| Snapshot write           | `modules/gameplay/snapshot-write.ts`            |
| Audio implementation     | `modules/audio/audio-port.ts`                   |
| Storage                  | `modules/storage/local-settings.ts`             |
| Runtime lifecycle        | `modules/game-core/match-lifecycle.ts`          |
| Screens and markup       | `modules/ui/`                                   |
| Map and character stats  | `modules/world/map-data/`, `config/characters/` |

**Area limits.** Each area holds its own column and stops at the second.

| Area                      | May contain                                                                                | Must not contain                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `app/prototype.tsx`       | React composition, wiring, module imports, UI root, minimal runtime hookup                 | Game rules, collision, tagging, spawning, raw storage, raw audio calls, large map or stat literals |
| `modules/game-core/`      | Runtime types, lifecycle orchestration, runtime handles, setup, tick, cleanup coordination | Scoring rules, tagging rules, navigation rules, UI markup                                          |
| `modules/gameplay/`       | Game rules and gameplay updates                                                            | React page composition, raw localStorage, asset-pipeline tooling                                   |
| `modules/audio/`          | Audio implementation and wrappers                                                          | Rules for tagging a player or for changing the score                                               |
| `modules/storage/`        | Safe local setting reads and writes, JSON parsing and validation                           | Match rules or unit state                                                                          |
| `modules/world/map-data/` | Map geometry and map data                                                                  | Combat rules or React state                                                                        |
| `config/characters/`      | Plain stat and config data                                                                 | JSX, asset rendering, presentation logic                                                           |
| `modules/ui/`             | Screens, component and UI binding, layout, display state                                   | Collision, game-loop logic, direct raw storage                                                     |

**Target shape.**

```text
app/
└── prototype.tsx

config/
└── characters/
    ├── kaka.json
    ├── raja.json
    └── ...

modules/
├── audio/
│   └── audio-port.ts
├── storage/
│   └── local-settings.ts
├── world/
│   └── map-data/
│       ├── map-1.ts
│       ├── map-2.ts
│       └── ...
├── game-core/
│   ├── match-types.ts
│   ├── match-runtime.ts
│   ├── match-lifecycle.ts
│   └── snapshot-types.ts
├── gameplay/
│   ├── input-navigation.ts
│   ├── collision-navigation.ts
│   ├── spawn.ts
│   ├── tag-combat.ts
│   ├── bars-score.ts
│   └── snapshot-write.ts
└── ui/
    ├── character-workshop/
    ├── match-hud/
    └── ...
```

## Contracts

Boundaries alone do not stop a module from rewriting the runtime from anywhere.
Each extraction states its output as a small contract.

```ts
type TagResult = {
  taggedUnitId: string;
  scoreEvents: ScoreEvent[];
  audioEvents: GameplayAudioEvent[];
};

function resolveTagContact(input: TagContactInput): TagResult {
  // Tag and combat logic only
}
```

The orchestration layer applies that result.

```ts
const result = resolveTagContact(tagInput);

applyScoreEvents(result.scoreEvents);
playGameplayAudioEvents(result.audioEvents);
queueSnapshotUpdate();
```

`tag-combat.ts` knows nothing about React `setState`. It never touches
`localStorage` and never drives Canvas. Audio can change without a tag rule
change. Scoring becomes testable from the returned events. A tag rule change
lands in the output contract.

Not every module needs this shape. Use a return value, a narrow callback, or a
local result object only when a real dependency exists. The plan still rules
out a global event bus.

## Post-G3 safeguards

| Safeguard                                  | Purpose                                         | Covers       |
| ------------------------------------------ | ----------------------------------------------- | ------------ |
| No `localStorage` in `app/`                | Storage stays inside the wrapper                | R7           |
| No `gameplayAudio.play` in `prototype.tsx` | Audio detail never reaches the composition root | R8           |
| No `characterId ===` branches for stats    | Data stays data-driven                          | R6           |
| No game rules in `lib/`                    | `lib/` stays a utility folder                   | R10          |
| `prototype.tsx` holds no gameplay rules    | The root stays composition-only                 | R5           |
| Approved dependency flow                   | UI pulls no gameplay internals                  | New after G3 |
| Gameplay modules carry key behavior tests  | Static grep alone proves nothing about behavior | New after G3 |
