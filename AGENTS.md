# AGENTS.md — bentengan-squad-tag

## Start here

Source-of-truth order: (1) active task instructions, (2) `CHECKPOINT.md` (if `State: ACTIVE`, resume at `Next action`, don't redo passed stages), (3) `memori.md` (canonical project decisions), (4) code/config/git history. Do not read old chat history unless asked. An instruction stating it replaces/cancels/ignores a prior decision wins, then summarize back into `memori.md`.

After each major stage, update `CHECKPOINT.md` (goal, done, changed files, validation, blockers, next action).

## Stack and entrypoints

- React 19 + TypeScript + Vinext/Vite. Node `>=22.13.0`. Path alias `@/*` → `./*`.
- Gameplay entry: `app/prototype.tsx`. Team/spawn rules: `config/game-rules.json`.
- Engine helpers in `lib/`; `lib/kampung-3d.ts` is a lazy-loaded Three.js renderer used only by experimental map `kampung3d`.
- `lib/field-assets.generated.ts` is generator output — never hand-edit.

## Commands

- `npm install` then `npm run dev` (`vinext dev`) for local dev.
- Production Pages build: `npm run build:pages` → `dist-pages/` with stable `assets/app.js` plus legacy cache aliases in `vite.github.config.ts`. Do not rename output filenames.
- `npm run lint` (oxlint, type-aware) and `npm run format` (oxfmt, single-quote, width 80).
- No `tsc` script exists; typecheck with `npx tsc --noEmit`.
- `npm run audit` = gameplay audit + `test-series-sprites` + `test-kampung3d`. `npm run verify` rebuilds everything (UI + fields + sprites + audit + builds) — slow, use only for cross-subsystem changes or on explicit request.
- Local-only character panel: `npm run admin:characters` → `http://127.0.0.1:4318/`. Never ships to Pages; `.preview-admin/` is git-ignored.

## Verification budget (smallest sufficient check)

- Map/collider only: `npm run fields:build` → `npm run audit` → `npm run build:pages`. Skip `sprites:build`.
- UI only: `npm run ui:build` (only if UI asset sources changed) → `npm run build:pages`.
- Sprite/animation: `npm run sprites:build` (or targeted builder, e.g. `node scripts/build-series-sprites.mjs`) → `npm run audit` → relevant build.
- Baselines (`config/field-baseline.json`, `config/sprite-baseline.json`) update only after an intentional, reviewed asset change via `fields:baseline` / `sprites:baseline`. Never update them to hide a regression.

## Asset pipeline

- Sources: `sprite-sources/` (Jago uses `sprite-sources/jago-parts/` + deterministic `scripts/build-jago-source.mjs` to a 7x6 atlas — don't swap in the old Jago sheet), `field-sources/` + `Assets/map/`, UI video in `Assets/Video and GIFs/`.
- Generators: `scripts/build-*.mjs`. Runtime outputs: `public/field/`, `public/characters/`, `public/arena-ui/`. Reuse existing assets before creating new ones.

## Arena and gameplay gotchas

- Red fort left, Green fort right. Margin/decor stay on the bottom layer and must not cover forts, prisons, players, or items.
- Decorative objects get no collider unless gameplay requires it; solid objects (buildings, prisons, barriers, planters, canals) get tight colliders following the solid part, not the transparent bounding box.
- Keep spawn → fort → prison → center paths walkable; layouts may be non-symmetric but must not give one team a large path advantage.
- Map 4 (`kanal`) river: water mask sends players back to their fort outside bridges; bridges must keep ~64px+ effective width for two characters side by side.

## Deploy and scope guard

- Remote `github` → `lengkongandreuw/bentengan-squad-tag`, branch `main`. CI `.github/workflows/pages.yml` runs `npm ci` → `npm run build:pages` → uploads `dist-pages`. Public URL: `https://lengkongandreuw.github.io/bentengan-squad-tag/`.
- Finished, passing work: commit, push to `github/main`, wait for the Pages run to succeed. Skip publishing only if the task says `jangan publish` or is discussion/inspection with no implementation.
- Repo split/migration is HOLD — do not touch visibility, remotes, or history.
- Single-map/feature task: don't touch other maps/features, don't rebuild unrelated sprites/audio/UI, don't restore old assets, batch changes and validate once.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
