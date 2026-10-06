# Multiplayer modules 20–23 — local integration

Date: 2026-10-06. Explicit batch scope: 20, 21, 22, 23. No publish.
Module 24 is not implemented. Earlier local modules 02–19 are preserved.

## 20 — Disconnect and bot takeover

The host freezes the ten-slot roster at match start. Departing clients lose their
input authority and queued input; their existing entity becomes a bot. Character,
entity ID, position, prison state, statistics and active flight are retained.
Subsequent rounds reuse the frozen roster instead of rebuilding from lobby peers.
Lobby departures remove the peer. Ten seconds of heartbeat silence, checked every
five seconds, also triggers departure. Host loss ends the client session with a
readable HOST DISCONNECTED message. No reconnect or host migration.

## 21 — Result/progression handoff

Only the host publishes a completed MATCH_RESULT with the canonical match/arena,
winner, complete snapshot, original human identities and individual statistics.
Clients validate sender, match, arena, entity, team and snapshot consistency before
calling the existing recordMatchProgression writer. XP, DOI, statistics and unlocks
therefore use existing rules and persistent processed-match duplicate protection.
Results are acknowledged; the host retries unacknowledged results. Failed local
storage writes can retry, including on the host. Duplicate delivery does not erase
the first reward UI or grant another reward.

Disconnected players are ineligible, even if their replacement bot earns stats.
An incomplete match or host loss before receiving a valid completed result grants
no rewards. A valid result already accepted before host loss remains valid.
This is casual P2P trust, not authenticated ranked results or tamper-proof storage.

## 22 — Two-human playable slice

Host-authoritative input now includes ultimate and rescue. One-shot input flags
are coalesced and consumed once; stale input neutralizes after 250 ms. Per-human
ultimate states reuse the existing skill/flight rules; ultimate meter survives
round reset. All takeoff/fly/landing stages retain flight tag protection. Remote
human movement uses human formulas, not bot speed/drain modifiers.

Host-only gameplay events drive deduplicated client presentation. MATCH_FRAME
adds scoreboard statistics, match start time and rescue cooldown to snapshots.
Client particle updates are presentation-only; clients do not simulate AI,
collisions, tagging, objectives or match outcomes. Host owns round transitions.
Online ultimate stats currently use base rules; remote profile upgrades are not
transmitted. No prediction, reconnect, shared pause or host migration is added.

## 23 — Three/four humans and telemetry

Two, three or four humans fill ten stable slots with eight, seven or six bots.
Each remote peer owns a separate entity/input buffer. Disconnecting one peer does
not revoke other peers. Metrics count UTF-8 JSON application payload bytes and
messages by type, peer counts and snapshot publications/rate. Broadcast traffic
counts once per actual recipient; receive counts valid decoded messages.
WebRTC/ICE/signaling overhead is excluded.

Measured on one PC with independent headless Chrome contexts:

| Humans | Bots | Host remote peers | Sample seconds | Host sent bytes | Frame publications/s | Mean frame bytes |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 7 | 2 | 6.731 | 897,684 | 8.47 | 7,893 |
| 4 | 6 | 3 | 7.403 | 1,156,485 | 6.48 | 8,051 |

The four-human sample has 141 frame sends across three recipients, 48 publications,
157 outgoing messages and 217 incoming messages. Configured snapshot rate is
12 Hz, but the observed startup-inclusive averages above are lower. These short
same-PC measurements are not a latency/FPS guarantee or a cross-network load test.
Artificial latency and the full module-24 regression matrix remain future work.

## Verification

- 163 combined automated regressions pass: core, multiplayer, progression,
  economy, flight, audio, sprite runtime and three local editor suites.
- TypeScript and focused multiplayer/core lint pass. Existing legacy monolith
  lint diagnostics remain; no globally clean lint or security claim.
- Pages production compilation passes, with existing CSS/chunk warnings.
- Real WebRTC two-browser complete match: initial built-in map2–0 and final editor
  replacement map2–1. Final run: green wins, client160 XP/15 DOI, host100 XP/10 DOI;
  both agree on winner and per-human statistics, no page errors. Final match has
  66 gameplay event sends, one result and one ACK across86.692 seconds.
  Result screenshots inspected: both scoreboards and progression panels render.
- Three-human session: seven bots, independent ownership, client takeover and
  host-loss termination pass without page errors.
- Four-human repeat: signed direction movement for every human, six bots, two
  individual takeovers preserving identities, and host-loss termination pass
  without page errors.

Harness: `scripts/test-multiplayer-slice-browser.mjs`, exposed as
`npm run test:multiplayer-slice-browser`. BENTENG_HUMANS selects 2/3/4;
BENTENG_COMPLETE_MATCH=1 runs the complete two-human match. It uses normal UI
controls and fresh isolated profiles, with read-only development state probes;
no user profile access or production state mutation hook.
Evidence is under ignored `outputs/multiplayer-*` logs, JSON and screenshots.
The harness accepts BENTENG_ARENA_ID and defaults to the editor replacement
`studio-edit-kampung` if the built-in `kampung` is replaced. A late rerun after
concurrent map saves failed before gameplay: the client could not find the host
within20 seconds through public signaling. A fresh permitted-network retry then
completed the editor replacement match successfully. Successful checks must not
be interpreted as guaranteed connectivity.

No balance, economy rules, visual assets or editor implementation were changed
by this batch. Concurrent map-editor saves/assets belong to their author and
must not be reverted or included in a multiplayer publish without review.
