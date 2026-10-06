# MODULE09–10 — Host bot decisions and game events

Implemented locally in order under the user's explicit request for both modules.
No networking, deployment, new UI, assets, map/editor changes or rebalancing.

## 09: Bot AI → intent → shared authority

`lib/game-core/bot-ai.ts` owns existing strategy priority and math: returning,
base exit, assigned rescue, outermost prisoner, refill, evade, predicted tag,
return and enemy fort. Existing navigation callbacks are reused unchanged.

`createBotAuthority().run(authority, world, now, consume)` only runs for `host`
and only selects `controller === 'bot'`. Client calls perform no decision,
navigation, consumption or sequence mutation. Per-entity input sequences survive
reordering/round resets within the initialized match. Intents contain the move
target/vector, sprint decision, objective and optional stable target entity ID.
They are data only, not successful tag/rescue claims.

Runtime consumes each intent immediately through the shared movement core.
Sequential order matters: later bots still observe earlier bots' updated position
and velocity. Drain/speed/combo/ultimate multipliers retain current values;
interaction core still validates contacts and rescue outcomes. The renderer does
not run AI. Current single-player initializes authority as host; this is a future
client boundary, not an implemented remote-client mode or bot takeover feature.

Frozen pre-extraction bot fixture checks exact decision/movement parity in 48
scenarios, including strategy branches and sprint timing. Controller/client
guard, no-side-effects client path and sequence/reorder tests are included.

## 10: Gameplay truth → typed facts → presentation

`lib/game-core/events.ts` defines a small GameEvent union and ordered presentation
dispatcher, not a global event bus. Event payloads use entity IDs, positions and
numeric/string data; no actor references, DOM, audio or storage. Internal result
deadlines (including Infinity) are deliberately omitted from result events.

- Tag emits PLAYER_TAGGED then PLAYER_CAPTURED after accepted state mutation.
- Rescue emits PLAYER_RESCUED with detached IDs and source position.
- Base emits FORCED_EXIT, BOOST_RECOVERED and FORT_CAPTURED. Capture notification
  is emitted on threshold crossing; legacy objective result remains compatible.
- Simulation occupancy memory emits FORT_ENTERED once until exit/reentry,
  excludes flight/prisoners, and retains local fort-entry sound behavior.
- Ultimate facts share GameEvent types for start and applied effect.
- Guarded match result becomes ROUND_ENDED or MATCH_ENDED without runtime-only
  deadline fields. Existing result adapter preserves once-only profile writes.

Legacy interaction return shapes remain compatibility results. Optional event
sinks collect the new facts; runtime dispatches them at the existing action
point. Presentation updates audio, feed, burst and logs for extracted paths.
Stats, combo gameplay, ultimate bonuses and reward writes stay in the logical
adapter, not in presentation subscriptions. UI dismissal/re-render cannot earn
rewards. Existing ultimate and match presentation now consume typed events.

This is not a network/replay protocol: no event transport IDs, acknowledgments,
global replay deduplication or client snapshot writer are implemented. Other
legacy paths (footsteps/refill/hazard/combo presentation) remain outside this
incremental extraction; no claim that every effect in the monolith is moved.
Flight hook facts keep their MODULE08 boundary. Fixed-step clock remains staged.

## Verification

Core parity, event validity/order/JSON detachment, fort-entry/capture edge
notifications and actual runtime tag/rescue audio routing are tested. Existing
ultimate/economy smoke and actual once-only match reward adapter remain active.
Combined suite:127/127 tests PASS. TypeScript, focused core lint and Pages
production build PASS without asset regeneration. Existing CSS/chunk warnings
remain. No interactive browser or device FPS test claimed.

Next module requires the next supplied document/user instruction. No publish.
