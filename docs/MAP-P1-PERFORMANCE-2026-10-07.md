# Map P1 parity and lossless performance changes — 7 October 2026

Status: implemented locally; not committed/published. Existing unrelated edits
and the user's map document/assets are preserved. The Kanal 2 draft remains
disabled in the real repository.

## P1 correction

- Arena content ID and simulation rules are separate. Kanal 2 replacements and
  copies retain water-fall timing, interaction gates, prison layout/U-walls,
  fort core geometry and flying collision behavior.
- New editor templates carry `arenaRules`, `rulesVersion`, and native footprint
  collision metadata. A legacy pristine generated collider is upgraded in memory
  from the incorrect solid behavior to the original parkour behavior. Moved,
  rotated, reshaped or renamed colliders are not overwritten. No automatic draft
  activation or source-document rewrite occurs when opening the editor.
- Native collision silhouettes retain their rectangular-band and expanded-radius
  semantics; hidden rectangular barriers retain the original single rectangle.
  Explicit custom solid colliders still block flight; native Kanal footprints
  also retain their original flight blocking.
- Prison floor/overlay assets are inherited while edited positions/sizes remain
  authoritative. Editor preview uses the matching native prison artwork.
- Recovery after parkour considers native editor footprints, and editor-map bot
  routes account for the implicit prison walls and fort cores.
- The water mask uses the original Kanal 2 sampling convention; animated water
  effects can also read the inherited editor mask.

## Performance without image reduction

- A match-scoped rectangle spatial index narrows collision candidates without
  changing the strict narrow-phase test, movement order, radius or gameplay speed.
- Offscreen Kanal props and water glints are culled against the actual viewport.
- Studio maps no longer allocate the unused native static-map canvas.
- The single-player loading gate decodes only the selected map. Rotation loads
  the next arena before returning to play; old custom map image-cache references
  are released. Multiplayer host/join prepares that arena's images before start.
- `npm run maps:runtime` creates content-addressed runtime atlases by trimming
  transparent padding and losslessly repacking frames. Original map/editor
  sources, frame sizes, visible RGBA, FPS, positions, scale and mirroring remain
  unchanged. Unknown/new frames fall back to the original source until rebuilt.
- `npm run build:pages` includes the map runtime build. Multiplayer compatibility
  identity includes the packed-map assets and manifest.

## Measured asset changes

These are dimension-based **single RGBA decode estimates**, not measurements of
browser-process RAM, GPU residency, total game payload or FPS.

| Scope | Before | After | Reduction |
|---|---:|---:|---:|
| Eleven optimized unique atlases | 78.06 MiB | 58.54 MiB | 19.52 MiB / 25.0% |
| Arena Benteng 1: all referenced map images | 110.39 MiB | 90.89 MiB | 19.50 MiB / 17.7% |
| Kampung editor: all referenced map images | 42.64 MiB | 36.55 MiB | 6.09 MiB / 14.3% |

Rows overlap/shared assets; their savings must not be added together. Packed
downloads for the eleven atlases are about 12.28 → 12.37 MiB: approximately
0.09 MiB additional transfer for lower decode/texture pressure and exact pixels.
The build rejects >3% file-size growth and requires >=10% decoded-area savings
when accepting a larger file.

## Verification

- 79 automated tests passed: core, multiplayer, map editor and packed-map pixels.
- Pixel regression checked all **223 packed frames**, preserving every visible
  source RGB/alpha value and requiring discarded pixels to be transparent.
- Native vs editor Kanal 2 collision sampled across the arena for walk, parkour
  and flight; explicit regression covers the audit's planter/prison-wall failures,
  water-fall timer, both prison owners with 1–5 prisoners, immutable migration,
  intentional geometry edits and the actual runtime field replacement projection.
- Broad-phase parity checks include bucket seams, outside-map points, zero/large
  radii and flight filtering.
- Six active arenas passed isolated Chrome host/join/ready/start, input and
  initial runtime rendering with no JS errors or failed image requests.
- Kanal 2 replacement also passed host/join/start on an isolated Vite server
  which substituted the enabled draft **in memory only**. Real config unchanged.
- Editor checked all six offered maps, including the corrected Kanal 2 prison
  preview, without Save/Build/Publish. No JS/asset errors; map config unchanged.
- TypeScript no-emit check and production Vite build passed. Existing CSS
  minifier/Tailwind warnings and large-chunk warnings remain, not build failures.
- Single-player loading/start, viewport/modal/HUD, touch controls and invitation
  flow passed on desktop, emulated portrait and emulated landscape. These are
  layout/functional checks, not physical mobile performance measurements.

Evidence: `outputs/map-fix-qa/browser.json`,
`outputs/map-fix-fixture/browser.json`, `outputs/map-fix-editor/editor.json` and
their screenshots. Tests: `scripts/test-game-core.mjs`,
`scripts/test-map-runtime.mjs`, `scripts/map-studio/test.mjs`.

## Limits / use locally

This change does not certify stable mobile FPS, remove all allocation/CPU/GPU
risks, or replace a physical-device soak/10-character crowd benchmark. The
headless callback samples are noisy and do not demonstrate a controlled FPS
improvement. Arena Benteng 1 still has a substantial texture budget.

Refresh the local game. For an already-running Map Studio backend, save any open
draft first, stop that terminal with Ctrl+C, then run `npm run admin:maps` from
the game project and reload the panel. Existing server processes were not stopped
automatically. No GitHub Pages deployment was performed.
