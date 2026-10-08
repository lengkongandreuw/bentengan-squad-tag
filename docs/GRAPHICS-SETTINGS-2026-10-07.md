# Graphics settings

Local implementation; no deployment requested in this turn.

Access: GRAFIS next to audio in pregame, and Audio + GRAFIS in pause.
Native modal dialog provides keyboard focus containment and Escape dismissal.
Changes apply immediately; closing settings does not resume a paused match.

Presets: high retains original DPR cap 2 and all particles/water glints;
balanced caps DPR at 1.5 and draws alternate particles/glints;
low renders at 0.75 CSS pixels per pixel and draws one third of particles,
one quarter of canal glints. Waterfall readability is retained.
DOM HUD/menu text is unaffected. Source images, sprite frame timing, terrain,
objects, collision, movement, ultimate indicators, AI and network simulation
remain unchanged. Particle spawning and its random calls remain unchanged;
only decorative drawing is filtered so graphics preferences do not change RNG.

Browser key: benteng-graphics-v1. Invalid/missing storage defaults to high.
Unavailable persistence leaves session updates functional via a window event.
Listeners are disposed on match/menu lifecycle cleanup.

Validation: TypeScript, graphics model tests, core/multiplayer regression,
production Vite build and UI harness desktop/portrait/landscape.
No measured FPS promise: this reduces render pixel work, not simulation work
or source texture decoding footprint.
