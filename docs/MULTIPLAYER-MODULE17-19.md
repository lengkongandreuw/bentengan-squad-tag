# Multiplayer 17–19 — local navigation MVP

Implemented in requested order. No commit/push/deployment. Existing02–16 work
is retained, and single-player continues to use the original authority path.

## 17 — remote input on host

`Client controls → INPUT → admitted/compatible peer gate → match/entity ownership
and increasing sequence → remote intent buffer → shared host movement`.

The host simulates local human, remote humans and remaining bots. Ten actors are
assigned in host roster order; selected reserve characters are included before
bot fill. Camera/HUD on each peer follows that peer's actor without changing IDs.
The adapter applies human movement/boost/parkour rules, not bot speed modifiers.
Invalid fields/nonfinite numbers, other entity/match, stale sequence, out-of-map
click targets and unsupported remote actions are rejected before mutation.
Intent expires after250ms without input; disconnect clears it. A received right
click boost pulse is consumed only once. This is not full anti-cheat.

## 18 — snapshot presentation

Rates live in `lib/multiplayer/rates.ts`: input30Hz, snapshot12Hz, interpolation
delay100ms. Rendering remains RAF; physics remains the existing variable-delta
runtime with its staged logical clock. This batch does not claim fixed-step
simulation or client prediction. Snapshot encoding runs only for online host and
at publication rate, not for every single-player render frame.

Clients accept snapshots only from their expected admitted host, for the current
match/arena and strictly increasing ticks. A maximum8-entry buffer uses local
arrival times, not assumptions about shared `performance.now()` origins. It
interpolates x/y and uses latest authoritative action/direction/prison/ultimate/
objective state. Status changes, rounds and large teleports snap. Loss/delay holds
the latest available position without extrapolation. Snapshots and projections
are detached; client update/collision simulation/bot AI are not run.

Only lobby→runtime ownership transfer starts networking gameplay; closing lobby
before start still cleans up. Leaving gameplay closes session/transport/listeners.
Host loss returns client to menu with an error. Heartbeat silence over10 seconds
(checked every5 seconds) closes a frozen client even before ICE reports leave.
Background-host throttling can therefore end an inactive room. No multiplayer XP/DOI rewards or
solo map rotation are written. Host still computes existing contacts, visible
state can appear in snapshots, but event/audio/FX/result synchronization is not
implemented by these modules. Remote ultimate/rescue-request/pause are excluded;
network mode ignores these controls on both peers for this navigation MVP.

## 19 — compatibility

`CONTENT_VERSION` exchanges protocol version, build version, arena ID and arena
revision before host admits HELLO into lobby. Both peers compare their own data;
host won't start with an unapproved participant. A changed revision revokes prior
approval. Incompatible protocol envelopes at handshake also receive a readable
compatibility error instead of silently joining.

The Pages Vite configuration hashes source/config bytes for build identity,
including uncommitted code. It separately hashes byte contents under public/field
and public/map-studio. The chosen arena's actual field/Studio definition plus map
asset digest creates its SHA-256 arena revision. Same ID alone is not sufficient.
Comparison is deliberately conservative: changing another map asset can also
require peers to reload. Hashes detect differences, not authenticity/security.
No automatic asset transfer, accounts, backend or dedicated game server added.

## Local use

```powershell
npx vite --config vite.github.config.ts --host 127.0.0.1 --port 3025 --strictPort
```

Open http://127.0.0.1:3025/bentengan-squad-tag/ in two browsers/devices (a second
device requires an explicitly accessible local host/HTTPS setup). Create a local
profile if the initial setup asks, then MULTIPLAYER · LOBBY. Select the same arena,
host, copy the entire code, join, choose team/character, ready, host starts.
Keys: WASD/arrows, Space boost, Shift parkour; mouse left target/right boost.
The existing responsive controls remain available.

Restart the Vite server after source/content edits so its embedded manifest is
regenerated. Reload both peers. Manifest generation is available through the
Pages Vite configuration; unsupported dev/build entry points fail with a clear
message instead of pretending compatibility. No new public editor links added.

## Validation

Deterministic tests cover ownership/staleness/timeout/pulses/movement, clock-origin
independent interpolation/latest discrete data/detachment, host-only snapshots,
protocol/build/arena/revision mismatch and revoking previously approved content.
Existing frozen single-player parity/reward tests retain their assertions; their
source harnesses account for the new explicit optional network branch.
154/154 combined tests, TypeScript, focused module lint and Pages build passed.
Full legacy monolith lint and2 unused bindings in the older progression harness
remain outside the focused clean result; existing CSS/chunk-size build warnings
remain. No global clean-lint or security-audit claim.

Optional real-browser harness: `npm run test:multiplayer-gameplay-browser` with
running local Vite and Playwright. BENTENG_TEST_URL, BENTENG_PLAYWRIGHT_MODULE and
BENTENG_CHROME_PATH allow configuration without a production browser dependency.
It uses two isolated contexts, creates temporary QA profiles through normal UI,
selects reserve Kodo, checks both humans, host bots and snapshot positions. The
host-tab closure path was verified, and desktop/mobile screenshots inspected. The
previous lobby-only harness remains `npm run test:multiplayer-browser`.

Public signaling/ICE/NAT connectivity remains a deployment dependency. Same-PC
browser QA is not proof of cross-network reliability or performance. Existing
dependency audit advisories were not automatically changed/fixed by this batch.
