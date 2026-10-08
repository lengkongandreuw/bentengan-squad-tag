# Multiplayer preparation: modules 02–07

Implemented locally in the user-authorized document order. No networking,
deployment, balance changes, source asset regeneration, or editor changes.

| Module | Boundary | Integration |
| --- | --- | --- |
| 02 | `lib/game-core/types.ts`, `state.ts` | Detached, finite JSON canonical read adapter for current match truth. Explicit legacy blue/red to visible red/green mapping. |
| 03 | `entities.ts` | Match-scoped host-issued IDs for all ten actors, retained on round recreation. Controller/optional peer metadata; legacy IDs retained for tie ordering. |
| 04 | `input.ts` | Serializable, monotonically sequenced local input frames consumed by current update. Keyboard, mouse destination/right boost and existing mobile inputs preserved. |
| 05 | `tick.ts` | Logical 30 Hz clock accumulated from existing gameplay delta. Staged integration, not conversion of all simulation to fixed-step. |
| 06 | `movement.ts` | Motion, collision, flight obstacle rules, water fall transition, parkour landing and boost drain. World adapters provide map queries; effects stay in runtime. |
| 07 | `interactions.ts` | Central validity and transitions for tag, rescue, prison layout, base charge/capture and all-held objective. Returns facts; audio, progression and round effects stay in runtime. |

## Inspecting current state

In a development build, during an initialized match:

```js
const state = window.__bentengGameCore.readState();
JSON.stringify(state);
```

This bridge reads the actual match closure on demand, not every render frame.
The returned object is detached. It is not a replacement state writer or an
implemented network snapshot protocol. Production does not expose this probe.

## Deliberate remaining boundaries

- Movement still uses the original frame delta and deadline semantics. The new
  clock tracks logical ticks; full fixed-step simulation is not claimed. Pause,
  countdown and finished-match gates do not advance the gameplay clock.
- Old IDs remain internal compatibility keys for deterministic ties/stat stores.
  New entity IDs are independent of character names and lineup positions.
- Actor takeover metadata is available; no remote player or takeover workflow.
- Input targets reflect the existing local mouse route. Host-side remote route
  handling is not implemented. AI decisions, separation/recovery navigation and
  ultimate sequencing remain current runtime adapters for later extraction.
- Canonical idle heading is nullable; tag direction is copied. Current bot
  ultimate meters are zero because only the local actor owns the existing meter.
- Wall-clock deadlines are copied as finite values, not normalized to a future
  multiplayer epoch. Positive infinite phase deadlines become JSON null.
- UI/rendering, audio and profile/economy persistence remain outside pure core.
  There is no WebRTC, signaling server, lobby or live multiplayer yet.

## Regression harness

`npm run test:game-core` runs 14 tests. A frozen pre-extraction fixture from
commit `d576801` compares motion/collision, parkour, tag ordering, rescue/prison
geometry, charging and base transitions. Coverage includes 216 movement cases,
all flight phases, shield/parkour/LOS guards, the actual ten-actor factory,
4,096 key combinations, detached JSON state, and 240-second clock runs at
30/60/120/144 render rates. Existing economy/ultimate/audio/editor regressions
remain in the combined test run. These tests do not establish device FPS or
replace interactive browser testing.

Next development must follow the next supplied module document; do not infer
authorization to deploy or add networking from completion of this batch.
