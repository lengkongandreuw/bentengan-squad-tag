# MODULE08 — Ultimate and match authority

Local-only extraction, following completion of MODULE02–07. Supplied MODULE09
and MODULE10 were read for ordering, not implemented: each document requires
STOP after the active module. No networking or deployment.

## Boundaries

- `lib/game-core/ultimate.ts`: eligibility, meter bonus/cap and timed recharge,
  cast startup/impact-once, Raja active-team speed scope, Kaka all-team shield
  scope, cast freeze, and flight lifecycle/safe landing. Four current ultimate
  characters retain existing balance and upgrade snapshot values.
- `lib/game-core/match-rules.ts`: countdown/next-round/end phase decisions,
  timer, held-prisoner then unique-capture timeout precedence, sudden death tag,
  best-of-three score and result guards. Non-playing results cannot score twice.
- `app/prototype.tsx`: supplies immutable numeric upgrade/rule values and map
  queries, delegates authority, then consumes returned ultimate/result facts.
  Audio, banners, particles, feeds and progression/economy writes remain here.
  Actual result adapter persists completed matches once after the core guard.

Flight retains the existing shared controller in `lib/flight-ultimate.js`.
The asset adapter provides authored sequence completion as a boolean; core
owns lifecycle transitions. Safe-landing failure returns a fact to the existing
water/fall-reset adapter. Flight presentation records stage/timing at each
transition, including the completion event before the flight state is cleared.
No sprite assets, source FPS, editor slots or durations were changed.

## Compatibility and limitations

The existing local match's scalar variables remain compatibility storage for
the canonical MODULE02 read adapter. Core receives a small UltimateState and
updates only simulation data; runtime copies it back. Match results include
the legacy Infinity deadline internally, still normalized by canonical state
serialization. This is not the network snapshot/event protocol of later modules.

The staged logical 30Hz clock remains staged: frame-delta gameplay and existing
wall-time deadlines are preserved. Bots still have the original base cast
duration in visual helpers; only the existing local actor activates ultimates.
No bot strategy, control scheme, timer duration, cooldown, effect multiplier,
shield scope, progression or economy balance changed.

## Validation

Six additional core tests cover frozen pre-extraction ultimate parity for
all four characters and base/upgraded values, eligibility/bonus/once-only
impact, flight hooks/sequence/safe landing, timeout precedence, best-of-three
phase guards, and the actual runtime reward/presentation adapter. The existing
economy ultimate smoke executes the new runtime block; the audio guard assertion
now follows its core boundary rather than requiring monolithic source text.

Combined regression: 120/120 tests PASS. TypeScript, focused lint and Pages
production build PASS without regenerating assets. Existing CSS/chunk warnings
remain; no interactive browser or device-performance verification claimed.

Next module on user continuation: MODULE09 Bot AI Authority Boundary, then
MODULE10 Game Event Boundary. No automatic publish.
