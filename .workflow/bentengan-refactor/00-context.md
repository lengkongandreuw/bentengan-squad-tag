# bentengan-refactor — context

Every `/phase-*` command reads this file first. Do not assume or hardcode a
platform or services list anywhere else.

## Platform / stack

Web frontend. React 19.2.6 + TypeScript 5.9.3, Vite 8 + Vinext (static export).
Canvas 2D game loop; Three.js only for experimental map `kampung3d`.
Tailwind 4 + shadcn primitives. Lint: oxlint + oxlint-tsgolint. Format: oxfmt.
Typecheck: `npx tsc --noEmit` (no `tsc` script, `allowJs` on, `checkJs` off).
Deploy: GitHub Pages via `.github/workflows/pages.yml` → `dist-pages/`.

## What we're building

Behavior-preserving modularization of `app/prototype.tsx` (7,741 lines at pin
`673ef2a4`) per `Review Plan.MD`: S1 safety net first, then findings F0–F10,
then extractions P0–P6 into `modules/`. Exit: `prototype.tsx` is composition
and wiring only, under 500 lines. No gameplay, balance, or asset changes.

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

- Workflow phases are named **Analyze / Design / Build / Retrospective**.
  Never "Phase 1–4". `Review Plan.MD` already uses Phase 1/2/4 to mean
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
