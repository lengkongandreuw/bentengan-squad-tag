# BENTENG — Multiplayer Runtime Boundaries

Module 01: inventory only. Reviewed 2026-10-05 against `d576801` on `main`.
`app/prototype.tsx` has 8,936 lines at this checkpoint. Line anchors below refer
to that revision; symbol names are the durable reference after later refactors.

No gameplay was moved or changed. No network transport, canonical state model,
entity-ID replacement, UI changes, or publishing is included in this module.

## Current ownership

The main `useEffect` in `BentenganPrototype` owns a mutable match closure, the
canvas context, input routes, audio, timers, AI, HUD publication and cleanup.
Its dependencies are `mode`, `run`, `selected`, `selectedFaction`,
`selectedFieldId`, and `selectedId`. Reinitializing the effect creates a new
match ID; `resetRound` recreates actors within that match. Profile refresh uses
a ref and does not intentionally recreate the match.

`Player` represents both the human and bots. The local actor is assumed to be
`players[0]`; bots are updated through `players.slice(1)`. There is no separate
remote-controller or host/client authority boundary yet.

Classification used below:

- **DATA**: gameplay data or configuration; no presentation object required.
- **REUSE**: existing DOM-free helpers, with mutation/callback caveats listed below.
- **SIM**: simulation logic currently coupled to the effect closure.
- **INPUT**: keyboard/pointer/touch or local-actor coupling.
- **REACT**: hooks, setters, refs or component lifecycle coupling.
- **RENDER**: canvas, DOM, image decoding, camera or renderer caches.
- **FX**: audio, VFX, notices, logs or local profile writes.

## Responsibility inventory

Extraction targets are proposals for subsequent modules, not implemented files.
Dependencies imported by the prototype but outside Module 01's read list are
identified as call-site boundaries only; their internal implementation was not
audited for this inventory.

| Concern | Current Location | Reads | Writes | Side Effects | Extraction Target |
| --- | --- | --- | --- | --- | --- |
| Player state / actor fields (**DATA**, **SIM**) | `app/prototype.tsx:140` `Player`; `:3821` `makePlayer`; `:3868` `makePlayers` | Character catalog, selected faction/character, base/spawn data | Shared actor fields: position/velocity, base state, exit priority, boost/cooldowns, prison/action/flight state | None in builder; initialization belongs to React effect | `game-core/types.ts`, `state.ts`, `entities.ts` (02–03) |
| Bot state / controller identity (**SIM**, **INPUT**) | `app/prototype.tsx:3868` `makePlayers`; `:4630` `aiVector`; `update` bot loop near `:5409` | Shared `Player`, `aiSeed`, difficulty, threats/targets, refills, prisoners, local actor | Bot velocity/position/boost, route cache keyed by `p.id` | Navigation requests; movement can emit fall FX | `game-core/entities.ts`, `bots.ts` (03,09); same actor schema, explicit controller |
| Match-local state / lifecycle (**SIM**, **REACT**) | `app/prototype.tsx:3540` main effect; `:4095` `resetRound`; `:7066` cleanup | Selections, readiness, mode/run, profile-derived Ultimate snapshot | Phase/deadline, timer/round/score, actors, refills, combo, stats, requests, winner, flags | React reset calls, image listeners, audio/resource cleanup | `game-core/state.ts`, `simulation.ts`; browser lifecycle adapter (02,08,11) |
| Team / roster / arena rules (**DATA**) | `app/prototype.tsx:471` `BASES`; `:483` `FIXED_ROSTERS`; `:487` team/faction mapping; `:2547` normalization; `:2683` Studio merge/filter | Built-in configs, imported Studio maps/states, imported game rules | Normalized `FIELD_CONFIGS`, `FIELD_BY_ID`, geometry and selected lineup | Validation during module initialization | Immutable arena/rules context, separate adapter; do not edit map assets |
| Movement / speed / boost (**SIM**, **INPUT**) | `app/prototype.tsx:4392` `move`; `update` movement/boost sections `:5279` onward | Direction, dt/now, actor state, stats, combo, Raja effect, terrain speed, world bounds | `x/y/vx/vy`, boost, recharge deadline, burst/latch state | Collision-triggered fall FX; local mission flag | `game-core/movement.ts` + input adapter (04,06); preserve existing speed products |
| Collision / separation / line of sight (**SIM**, **REUSE**) | `app/prototype.tsx:4187` `segmentHitsRect`; `:4201` prison walls; `:4233` `hasLineOfSight`; `:4343` `blocked`; `:4438` `resolvePlayerSpacing`; `lib/collision-navigation.js:3` | Actors, fort occupancy, solid geometry, Studio exact queries, water, parkour/flight immunity | Depenetrated/separated actor positions; helper returns recovered positions/vectors | Fall can clear local input/play FX | `game-core/movement.ts` + geometry query context (06); retain exact mask/polygon tests |
| Water / slow terrain / fall reset (**SIM**, **RENDER**, **REUSE**) | `app/prototype.tsx:3681` water-mask canvas; `:3702` `cacheWaterMask`; `:4256` `isWaterAt`; `:4279` `beginKanal2WaterFall`; `:4576` `resetFallenPlayer`; `:4605` `riverFallCheck`; `lib/map-runtime-index.js:11` | Decoded mask bytes or Studio map queries, actor flight/parkour/protection, bounds | Water/fall timestamps, reset position/state/charge/action; cached mask pixels | Canvas image decoding, burst/beep/log; mouse cancellation | Predecoded immutable geometry adapter + movement/hazard rules (06); no DOM in truth |
| Click navigation / steering / route scheduling (**INPUT**, **SIM**, **REUSE**) | `app/prototype.tsx:4493` `navigateAroundHazards`; `:6987` `pointerDown`; `lib/click-navigation.js:2` `pointerWorld`, `:15` `clickRoute` | Mouse event, rendered camera/view, transform/rect, player, passability; AI target | Local `mouseRoute/mouseBoost/mouseStuckTime`; bot `studioRoutes` and imported scheduler | `preventDefault`, DOM listeners, unreachable-target log; route-cache clock read | Browser pointer-to-world input adapter (04); host navigation (06,09); scheduler not serialized |
| Keyboard / mobile / menu intents (**INPUT**, **REACT**) | `app/prototype.tsx:3488` key effect; `:7298` `touchKey`; `:7300` `tapKey`; `:7304` `touchControl`; `:7321` `requestNextRound` | DOM key/pointer events, mode/profile guards, HUD lock state | Shared `keys.current`, leaderboard state, `postRoundActionRef` | Key suppression, pointer capture, blur/visibility clearing, 120ms timeout | `game-core/input.ts` + local adapter (04); explicit per-actor intents |
| Tag eligibility / contact / capture (**SIM**, **FX**, **REUSE**) | `app/prototype.tsx:4780` `capture`; `:4834` `tagCheck`; `lib/tag-contact.js:1` `sweptContactDistance` | Exit priorities, teams, cooldown/range, swept/current distance, LOS, parkour/flight/rescue/Ultimate guards | Cooldown, captures/captured IDs, tag action/vector; target prison state; stats/combo/meter | Match notice, local profile counters, tag/caught/streak audio, VFX/log; sudden-death result | `game-core/interactions.ts` returns facts/events (07,10); retain sorting and one-contact-per-actor resolution |
| Prison placement / captured references (**SIM**) | `app/prototype.tsx:4696` `layoutPrisons`; `:4780` capture mutation | Prison owner, actor array order, arena prison geometry/variant | Prison index, prisoner `x/y/lastX/lastY`, capture links | Called by capture and after interactions | `game-core/interactions.ts`, identity adapter (03,07); preserve ordering |
| Rescue / protection / return-to-base (**SIM**, **FX**) | `app/prototype.tsx:4895` `rescueCheck`; `:4468` `baseVector`; `update` returning movement | Outermost teammate prisoner, rescue range, flight/water guards, team/base routes | Held actors become RETURNING, prison owner cleared, shield deadline/offset; rescuer action/stats | Rescue/release audio, VFX, match notice, local profile counter, combo/meter/mission | `game-core/interactions.ts` + movement adapter (06–07,10); returning human still auto-navigates |
| Rescue request / assigned bot (**SIM**, **INPUT**, **FX**) | `app/prototype.tsx:3933` `requestRescue`; `:5094` request expiry; `aiVector` assigned-rescuer branch | Local prisoner, existing request/cooldown, active allied bot candidates | Requester/team/assigned-rescuer IDs, expiry and cooldown | UI event/marker, sound, burst/log; request consumed with key `r` | Per-entity input + request state + bot decision (03–04,07,09–10) |
| Refills / RNG / pickup (**SIM**, **FX**) | `app/prototype.tsx:4047` `randomGrade`; `:4051` `spawnRefill`; `:4089` `seedRefills`; `:4944` `refillCheck`; `:5133` timed spawning | RNG, lanes, hazards, refill list, actor boost/max, distance | Incrementing refill ID, positions/grade/expiry, list and actor boost | Burst/beep/log, local mission | Host-owned spawn/pickup rules (07–08); snapshot refills and next-spawn truth (02,12) |
| Base charging / exit priority / objective (**SIM**, **FX**) | `app/prototype.tsx:4166` `fortOccupant`; `:4973` `baseCheck`; `:5477` exit-candidate processing | Base geometry, contest/defending actors, charge/cooldown, dt/now, `tieHash` | IN_BASE/ACTIVE state, charge/grace/recharge, global exit counter, order/last-exit, fort charge | Exit log/beep/mission; 1.5s uncontested enemy-base hold calls `winRound` | `game-core/interactions.ts`, match rules (07–08); occupancy remains authoritative |
| All-opponents-held objective (**SIM**) | `app/prototype.tsx:5496` end-of-update team checks | Enemy prison states/owner | `totalCapture[team]` accumulated with dt | 2s all-held condition calls `winRound` | Match rules (08); include hold accumulator in canonical state |
| Team combo / surge (**SIM**, **REUSE**, **FX**) | `lib/team-combo.js:4` state, `:11` `advanceTeamCombo`; `app/prototype.tsx:4727` `registerTeamAction` | Team combo, distinct actor ID, now, successful tag/rescue | Combo record; teammate boost; local mission/callout | Beep, burst, logs/callout | Reuse helper in `game-core/interactions.ts` (07–08); separate effects (10) |
| Ultimate meter / Raja / Kaka (**SIM**, **INPUT**, **FX**) | `app/prototype.tsx:3550` imported effective-stats snapshot; `:4029` `chargeUltimate`; `:5171` recharge and activation; `:5225` impact/effects | Local actor, meter, input, actor gates, match-start effective stats; base values for uncontrolled actors | Closure meter/impact flags and buff/shield deadlines; actor cast/action, team shield fields | Global movement freeze for non-flight cast, banners/timeouts/audio/log/VFX | `game-core/ultimate.ts`, per-actor Ultimate truth (02,08); current bot activation is not implemented |
| Bebe / Ciici flight controller (**SIM**, **REUSE**, **FX**) | `lib/flight-ultimate.js:13` `startFlight`, `:16` `advanceFlight`, `:27` `steerFlight`; `app/prototype.tsx:5143` hooks and phase update | Flight stage/elapsed, dt, authored clip duration/FPS, safe landing predicate, local input | Actor flight, steering heading/direction/remaining, safe ground, position | Hooks emit DOM `benteng-flight` events, beep/banner/audio/log; original asset timing influences phase completion | Reuse DOM-free controller with explicit hooks/events + rules adapter (08,10); preserve all-stage tag immunity |
| Timer / phase / pause / sudden death (**SIM**, **INPUT**) | `app/prototype.tsx:3566` closure; `:5060` `update`; `:6842` `loop` | RAF timestamp/dt, pause key, phase deadline, timer, held and unique-capture totals | Phase, pause, timer, sudden death, round transitions | Countdown audio, delayed announcement, beep/log | `game-core/tick.ts`, `simulation.ts`, match rules (05,08); no fixed authoritative tick exists yet |
| Round / match result / stats (**SIM**, **REACT**, **FX**) | `app/prototype.tsx:3891` stats stores; `:3987` `buildStatsBoard`; `:4095` `resetRound`; `:4130` `winRound` | Phase, score, winner/reason, stats, local team, now | Score/phase/deadline/result; round stats reset, match stats preserved | Announcement, audio, VFX; first two round wins end match | `game-core/state.ts`, rule transition + result facts (02,08,10–11) |
| Profile / XP / DOI / unlock handoff (**REACT**, **FX**) | `app/prototype.tsx:2944` refs; `:3014` profile refresh; `:4145` final-match branch | Stable effect-local `matchId`, arena, local KDA counter ref and win/loss | Imported `recordMatchProgression` result, pending counters, completed-match count/rotation flag | Local profile storage through service; React reward/error/unlock panels | Completed-match side-effect adapter (11,21), never run on snapshot render; imported service internals not reviewed here |
| Match notices / logs / event candidates (**FX**, **REACT**) | `app/prototype.tsx:280` notice types; `:3907` `addMatchEvent`; `:4026` `log`; `:4727` combo callouts | Tag/rescue/request facts, names/teams, time | Small priority notice list, notice ID/expiry, last-five log strings | HUD messages, transient UI timing | `game-core/events.ts` (10); existing `MatchEvent` is a UI notice, NOT a comprehensive network event stream |
| Canvas / character / map rendering (**RENDER**) | `app/prototype.tsx:2863` image caches; `:5513` drawing helpers; `:5636` `drawStaticMap`; `:5866` `drawMap`; `:6184` `drawPlayer`; `:6678` `draw` | Actors/phase, map/atlas/Studio imports, timestamp, camera/DPR, image readiness | Canvas pixels, static/cache dirtiness, visible bounds/view, imported sprite-resolver visual cache | DOM/canvas resources; renderer failure sets paused and React error | Renderer adapter consumes state/events (11,18); keep lossless atlas mappings and authored assets |
| Optional 3D renderer / debug tools (**RENDER**, **REACT**) | `app/prototype.tsx:3121` lazy warmup; `:3667` scene initialization; `:6720` 3D rendering; `:7022` development probes | Selected arena, renderer/module readiness, actor snapshots/geometry | Scene/cache objects, debug toggle and window probe interface | GPU allocation/disposal; render error pauses match | Presentation-only adapter (11); current selection may filter this arena, not permission to delete renderer |
| Audio / presentation timers / particles (**FX**, **REACT**, **RENDER**) | `app/prototype.tsx:3220` menu cues; `:3340` music effect; `:3366` ambience; `:3792` `GameplayAudio`; `:3801` `beep`; `:4034` `burst`; `:5462` movement audio | Input/audio unlock, volume settings, successful gameplay facts, proximity/local observer, time | Audio resource/cache state, streak/footstep guard flags; visual particles/banners | Web Audio, HTML Audio, event listeners, timeouts, random cosmetic bursts | Client event/audio/VFX adapter (10–11); never serialize audio/particles as gameplay truth |
| HUD snapshot publication / diagnostics (**REACT**, **RENDER**) | `app/prototype.tsx:330` `Snapshot`; `:6840` diagnostics; `:6852` throttled HUD block | Local actor/phase, scores, combo, notices, request, stats board, browser time | React `snapshot`, cached scoreboard, `canvas.dataset` diagnostics | ~100ms HUD cadence, React rerenders | Derived HUD selectors over canonical state (02,11); not network snapshot serialization |
| Start / restart / rematch / arena rotation (**INPUT**, **REACT**) | `app/prototype.tsx:7101` `start`; `:7115` `quit`; `:7133` rotation; `:7146` `rematch`; `:7203` `restartMatch` | Local profile/content gates, selection, completed-match count, readiness | Mode/run/selection, local input, HUD/menu/reset state | Audio cue, async readiness and effect teardown/recreation | Local lifecycle adapter; host lobby/match command boundary later (16–17); no lobby now |

## Existing reusable logic: pure versus merely DOM-free

| Helper | Reuse status | What must remain outside canonical truth |
| --- | --- | --- |
| `collision-navigation.js`: expanded rectangle test, depenetration, steering | Pure numeric geometry; returns positions/vectors without changing actors. Infinite default bounds are implementation parameters, not serializable match fields. | World-query context, rendering and effects |
| `click-navigation.js`: `pointerWorld` | Pure coordinate transform given numeric camera/rect inputs. Acquiring the real DOM rect/rotation remains browser work. | PointerEvent, DOMMatrix, canvas/viewport objects |
| `click-navigation.js`: `clearSegment`, `clickRoute` | DOM-free bounded A*; private heap/maps only. Determinism depends on the supplied passability function and same world data. | Passability callbacks, route scheduler jobs, viewport objects |
| `tag-contact.js`: `sweptContactDistance` | Pure relative swept-contact distance over previous/current positions. Eligibility and capture mutation remain in prototype. | Audio/VFX and presentation notices |
| `flight-ultimate.js`: config/predicates/slot/sequence checks/start/safe landing | DOM-free; config mixes gameplay constants with presentation icon/animation names. Safe landing needs an explicit world predicate. | Config asset paths and callbacks need not enter live gameplay state |
| `flight-ultimate.js`: `advanceFlight`, `steerFlight` | **Not immutable pure functions**: mutate the passed flight state; `advanceFlight` invokes optional hooks. Existing behavior can be reused by authoritative simulation, with effects adapted into events. | Hook functions, DOM/audio handlers; do not call them twice on a client render |
| `team-combo.js`: creation, advance, multipliers/countdown | DOM-free state transition; advance returns a new record or the unchanged current record for ignored actions. Uses actor identity and supplied timestamp. | Local callout strings/audio/VFX; future actor-ID change affects combo references |
| `map-runtime-index.js`: bounds/visibility | Pure numeric calculations; `visibleBounds` is presentation culling, not authoritative collision. | Camera/visible bounds |
| `map-runtime-index.js`: `createMapQueries` | DOM-free spatial index with private lazy `Map` caches and functions. Delegates exact geometry/mask tests to imported map model; no actor mutation. This is reusable **query infrastructure**, not a JSON-safe state object. | Bucket/view Maps, functions; reconstruct from immutable arena context, do not put the index in snapshots |

## Execution order and parity hazards

Current frame orchestration in `loop`:

1. Compute seconds `dt = min(0.033, (now-last)/1000)` from RAF milliseconds.
2. Run the imported route scheduler when unpaused/PLAYING, otherwise clear it.
3. Call `update(dt, now)`.
4. Draw the map/actors/UI overlays with the same timestamp.
5. Publish derived HUD state after >100ms; optionally publish diagnostic timings.
6. Schedule the next RAF.

Within the gameplay path of `update`, ordering is observable:

1. Consume pause, phase transitions and rescue request; advance timer/tiebreaks.
2. Expire/spawn refills; recover embedded actors and record previous positions.
3. Advance flight and Ultimate recharge/activation/impact; non-flight casting can
   return early after freezing all actor velocity, but timer already advanced.
4. Consume local direction/route, boost/parkour/flight steering/returning motion.
5. Update bots, actor spacing and water/fall checks; emit local movement audio.
6. Base checks, ordered exit assignments, pickup, tag, rescue, prison layout.
7. All-held objective check, then cosmetic particle update.

Preserve this order during extraction until behavior changes are separately
requested. In particular:

- Internal team `blue` means visible faction **red**; internal team `red` means
  visible faction **green** (`TEAM_FOR_FACTION`/`FACTION_FOR_TEAM`). Module 02
  must explicitly adapt labels, not reinterpret existing colors/score/prison owners.
- `Snapshot` is local HUD data: it lacks all actor positions, full cooldowns,
  refill contents, objective accumulators and full phase state. It is **not** the
  canonical gameplay state required in Module 02.
- Millisecond `now`/deadlines coexist with second `dt`, timer and flight durations.
  Pause stops the update path but not browser time; deadline handling must be
  documented in Module 05, not silently changed to fixed-time semantics.
- COUNTDOWN and MATCH_OVER return early. ROUND_OVER resets when due/requested;
  before that condition is reached, the code can fall through the rest of update.
  Do not assume a fully frozen round-result phase simply from its visual overlay.
- `phaseUntil` becomes positive infinity at MATCH_OVER; mouse arrival distance
  starts at infinity. Blind JSON serialization converts infinity to null. Module
  02 needs explicit finite values/null semantics rather than dumping the closure.
- `tieHash(id)` affects simultaneous exits, spacing and fallback respawn lanes;
  contact sorting uses actor IDs, and prison layout uses actor array order.
  Stable IDs in Module 03 must consider these parity seams, not rename IDs
  everywhere blindly. Current IDs are `you`, `ally2..5`, `enemy1..5` per match,
  created by slot, with no peer ownership/controller fields.
- Captured-ID lists, stats stores, combo `lastActorId`, rescue requester/rescuer,
  route caches, drawing/3D actors and sprite visual caches all refer to actor IDs.
  Array index/name/character identity must not become future network identity.
- Simulation RNG uses `Math.random` for refill grade/position/next-spawn timing;
  presentation RNG also creates particles/menu backgrounds. A host should own
  simulation outcomes; clients must not independently run refill/AI resolution.
- Flight phase completion consults authored sequence frame count/FPS. Content
  compatibility later must cover that timing, not only character catalog names.
- Actual tag immunity uses `flightBusy` for takeoff/fly/landing. Historical help
  text near `:7862` still says takeoff/landing are vulnerable; runtime is the
  evidence here. This mismatch is recorded, not changed by Module 01.
- Raja/Kaka effective stats are captured once at match start for the controlled
  actor. The meter/impact state is currently local-actor closure state, not a
  per-entity map. Module 02 must represent it explicitly without changing rules.
- Final-match profile handoff occurs only inside guarded `winRound`, not HUD
  publication. Future client result handoff must preserve duplicate protection;
  never replay rewards, audio or notices on every received snapshot.
- Renderer normally consumes gameplay state, but 3D failure writes `paused` and
  `setRendererError`. Separate that exceptional lifecycle command later; do not
  serialize the renderer or let client render errors mutate host truth directly.

## Extraction seams for the supplied next modules

### Module 02 — describe truth, do not replace simulation yet

Build types and a read-only adapter from the existing closure/actors. Represent
phase, match/round/tick/time, arena identity, explicit team mapping, entity state,
previous/current positions, facing/velocity, actions/deadlines, prison/rescue,
boost/base/exit state, per-entity Ultimate and team effects, refills, objective
holds, combo state, stats and completed result. Tick is not currently defined;
do not invent a fixed-step loop in Module 02.

Keep DOM/events/React setters, images/audio/renderer resources, field query
functions, route scheduler callbacks/Maps, cosmetics, HUD strings, local profile
objects and UI menu state outside canonical truth. Use copies rather than exposing
mutable live actor references. Keep finite numeric serialization explicit.

### Module 03 — assign identity independently of character/controller

Assign stable match-scoped `entityId` values and explicit controller/optional peer
ownership. Consider retaining legacy `id` for tie behavior initially, with an
adapter, so host entity assignment does not change existing single-player exit
ordering. Keep identity across round actor recreation and bot takeover; enumerate
all ID consumers above before converting references. No networking in this step.

### Later seams (not started)

04 input normalization -> 05 clock -> 06 movement/world queries -> 07
interactions -> 08 Ultimate/results -> 09 host-only AI -> 10 gameplay events ->
11 rendering/effects -> 12 snapshot serialization. Only then add P2P transport.
No backend, account, dedicated game server or host migration is introduced here.

## Module 01 acceptance / verification

- Major gameplay responsibilities mapped with read/write/side-effect boundaries.
- Reusable pure helpers distinguished from mutable/cached/hook-based helpers.
- Local input, React, canvas/render and profile/audio coupling identified.
- Single-player parity hazards and incremental extraction seams recorded.
- Source files, assets/configuration and runtime dependencies unchanged.
- Documentation anchors checked against current symbols; `git diff --check`.
- Checkpoint updated. No runtime/browser playtest or multiplayer capability is
  claimed: this module has no runtime changes. STOP after Module 01.
