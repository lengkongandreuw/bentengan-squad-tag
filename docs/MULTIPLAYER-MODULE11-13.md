# MODULE11–13 — Render reads, snapshots and protocol contract

Local-only implementation in the explicitly authorized 11/12/13 order.
No transport, WebRTC dependency, lobby, backend, deployment or balance changes.

## 11 — Canonical state → existing drawing code

The loop advances current gameplay first, then reads canonical truth and passes
a detached `RenderFrame` from `render-state.ts` to the existing canvas/3D actor,
refill, base, result, combo and ultimate drawing paths. The compatibility adapter
retains stable legacy visual IDs/names and explicit faction conversion, keeping
sprite-cache keys, animation data, geometry and source assets unchanged. Nested
flight/tag vectors/refills are detached; renderer cannot mutate live actors by
holding their references. Drawing still owns animation/asset/camera/VFX caches.

A graphics failure now records a presentation error; the outer runtime loop
handles pause instead of drawing writing match truth. Existing drawing code is
adapted, not rewritten. Local HUD/profile/scoreboard compatibility adapters and
pointer/camera glue remain incremental; this does not claim a completely new
standalone game runner. Pure core functions already advance without a renderer.

Canonical reading is per rendered frame so variable-delta movements are never
shown stale merely because the staged 30Hz tick has not changed. This adds data
projection work, not image/asset loading. There is no per-frame JSON encoding or
snapshot parsing. Device FPS and full browser image equivalence remain untested.

## 12 — Explicit dynamic snapshot allowlist

`lib/game-core/snapshot.ts` exports GameSnapshot, createSnapshot and parseSnapshot.
The snapshot carries version/match/arena/tick/time/phase/timer/round, dynamic
actors with position/velocity/direction/action/protection/flight, score/combo,
objective hold progress, ultimate effect deadlines, refills, rescue and result.
It deliberately excludes image/audio resources, static map geometry, local HUD
state, legacy IDs, profile, progression, wallet, purchase levels and stat stores.
`poseSeed` preserves existing visual phase offsets, not an AI decision payload.

Strict bounded exact-key schemas reject nonfinite/unsafe numbers, wrong enums,
unknown/missing fields, versions, accessors/classes/custom prototypes, oversized
or sparse arrays, duplicate identities/refills, missing entity references and
inconsistent result phases/scores. Parsed data is copied. Infinity phase deadlines
are represented by null; JSON round-trip and privacy exclusions are tested.

Development inspection:

```js
window.__bentengGameCore.readState();
window.__bentengGameCore.readSnapshot();
```

Snapshot reading is on demand, not per frame. Snapshot time is the host's current
millisecond domain plus simulationTimeMs; a future client must align clocks.
Idle non-flight direction may be null, matching current velocity-driven fallback;
animation caches can retain facing. Static character/map metadata stays local.
This is render-state data, not a full host-migration save or client apply engine.

## 13 — Protocol v1 before transport

`lib/multiplayer/protocol.ts` provides ProtocolMessage, parseProtocolMessage,
isProtocolMessage, encodeProtocolMessage and decodeProtocolMessage. Decode is
bounded to 128Ki characters before JSON parsing. Every type has exact required
keys and payload checks. SNAPSHOT uses module12 and checks match/tick agreement;
MATCH_START checks match/arena and starting phase agreement. INPUT carries
entityId/positive sequence plus movement/action/target flags; right-button boost
pulse remains represented separately from held keyboard sprint.

| Message | Data |
| --- | --- |
| HELLO | peerId, bounded display name |
| HELLO_ACK | hostPeerId, assignedPeerId, sessionId |
| READY | peerId, ready |
| PLAYER_SELECTION | peerId, characterId, canonical team |
| INPUT | matchId, entityId, sequence, validated input |
| SNAPSHOT | matchId, tick, validated snapshot |
| GAME_EVENT | matchId, tick, eventId, validated event |
| MATCH_START | matchId, arenaId, startAtMs, initial snapshot |
| MATCH_END | matchId, tick, winner, reason |
| PING / PONG | nonce, sentAtMs |
| PLAYER_LEFT | peerId, nullable entityId, known reason |

Network events use canonical red/green teams. Trusted internal core events use
legacy blue/red; `toNetworkGameEvent` converts explicitly, avoiding the ambiguous
internal red meaning visible green. Event variants are validated individually,
including nonempty unique rescue IDs and no self tag/capture.

Parsers validate structure, NOT permission. Future transport/session code must
bind peers to connections/entities, authorize host-only messages, reject stale
sequences/ticks, deduplicate events, reconcile clocks, check selections/content,
and rate-limit. Nothing accepts network messages into live gameplay yet. No
claim of online multiplayer, authentication, anti-cheat or replay protection.

## Validation

Nine added tests cover detached rendering and source boundary, strict snapshot
roundtrip/malformed/reference/privacy handling, all twelve protocol message
roundtrips, every event variant, hostile getters/prototypes, envelope mismatches,
bounded decoding, self/duplicate rescue rejection and 256 invalid input cases.
The combined regression suite:136/136 tests PASS. TypeScript, focused lint and
Pages build PASS using existing generated assets; old CSS/chunk warnings
remain. No interactive browser/device FPS test claimed. No commit/push/publish.

Next module requires the next supplied document/user instruction.
