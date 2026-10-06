# MODULE14–16 — P2P room transport and authoritative lobby

Implemented locally in the user-authorized 14/15/16 order. No publish, gameplay
synchronization, profile/reward writes, backend, accounts or main-menu redesign.

## 14 — Isolated WebRTC transport

`lib/multiplayer/transport.ts` exports createRoom, joinRoom, openRoom, browserDriver
and RoomTransport (send/broadcast/message/join/leave/error subscriptions/close).
Only the browserDriver knows Trystero APIs; the rest can use an injected wire
driver in deterministic tests. `@trystero-p2p/mqtt` is pinned to0.26.0. Its code
is imported lazily on explicit Host/Join, not while playing single-player.

The backend uses public MQTT signaling and WebRTC data channels. No camera,
microphone, custom signaling server, credentials or TURN service was configured.
Public signaling/ICE availability and restrictive NAT/firewall conditions can
prevent connections; connection success on every device/network is not promised.
The P2P network can expose network-address metadata as normal WebRTC behavior.

Source/API reference: [official Trystero documentation](https://github.com/dmotz/trystero).
The installed package's type declarations/source were checked for current API.

Every message is decoded/encoded through strict module13 validators; backend
receive-size limits and closed/unknown-peer guards apply. Close is idempotent;
callbacks/subscriptions stop and the backend leaves the room. No protocol object
is passed directly into gameplay.

## 15 — Host / join / leave

`session.ts` provides hostSession, joinSession and attachSession with observable
connecting/lobby/playing/ended state. Host creates a shareable code containing
a random nonce plus expected host connection ID. Keep its capitalization and
copy the entire code. This code and peer binding are NOT authentication.

Client binds HELLO_ACK to the actual expected connection, assigned local peer
and session ID; arbitrary claimed peer IDs cannot modify another participant.
Missing host times out after20s without displaying a successful empty lobby.
PING/PONG measures the local roundtrip; handlers/heartbeats/timeouts close when
leaving, unmounting, cancelling async creation or losing the host. No host
migration/reconnection mechanism is implemented.

## 16 — Host-owned lobby

Host owns revisioned LobbyState. Clients request their own team/character/ready;
host validates fixed roster membership and duplicate selections, then publishes
canonical state. Invalid requests show a warning. Selection changes clear ready.
Clients ignore stale states and states from other peer connections. Human limit
is4; remaining slots are shown as bots for5v5. Casual lobby does not validate
profile entitlements or write XP/DOI.

Added strict protocol variants LOBBY_STATE and SESSION_ERROR to the undeployed
v1 contract. The original twelve messages remain unchanged. Protocol version is
checked now; asset/map compatibility checks are explicitly pending later modules.
Host can lock the lobby with at least2 humans and everyone ready. Session phase
`playing` here means the preparation was approved, NOT that online gameplay is
running. UI prominently explains this; current single-player mode is untouched.

The lazy native dialog is reached via **MULTIPLAYER · LOBBY** on the splash menu.
It supports copy code, host/join status, roster, bot counts, team/character,
ready, host preparation start, leave and Escape. Pending ready has a local UI
indicator until host acknowledgment; it does not optimistically change authority.
Team switching picks an available character instead of always requesting the
already-occupied default. Mobile dialog scrolls; native dialog traps focus.

## Try locally

Use the existing local game server or start a Pages-compatible development server:

```powershell
npx vite --config vite.github.config.ts --host 127.0.0.1 --port 3024 --strictPort
```

Open `http://127.0.0.1:3024/bentengan-squad-tag/` in two tabs. Keep the host tab
open, choose Host, copy its code, then Join in the other tab. Select/ready there;
only host starts preparation. A second device needs an HTTPS-served build;
plain HTTP LAN IP is not equivalent to secure localhost. Pages publication is
not performed by this task. Room codes from test runs are closed and unusable.

## Verification and repeatable harness

-8 deterministic tests: typed transport exchange/drop/disconnect, missing/self
  join, identity/session binding, cleanup,20s timeout, host selection/ready/start,
  four-human capacity, forged/stale state and malformed roster rejection.
- Real Chrome headless test uses two isolated contexts, public MQTT signaling and
  actual WebRTC: HELLO/ACK/PING/PONG, both directions team switch, character sync,
  ready acknowledgment, host start lock and host-disconnect notice. PASS with no
  page errors. Desktop1000×800 and mobile390×844 screenshots inspected.
- This is a same-machine two-browser test, NOT cross-device/restrictive-NAT QA.
- Combined regression:144/144 tests PASS. TypeScript/focused lint/Pages build PASS;
  source assets/config/editors and existing locked package versions unchanged.
  Normal CSS/chunk warnings remain. npm audit reports21 dependency advisories
  across the project (including existing tooling); no automatic audit fix was
  applied and a clean security audit is NOT claimed.

Run deterministic tests: `npm run test:multiplayer`.
Optional real-browser test: start Vite above and run `npm run test:multiplayer-browser`.
Install/provide Playwright separately; it is not a production dependency. Its
module path can be supplied through BENTENG_PLAYWRIGHT_MODULE (file URL on Windows),
browser executable through BENTENG_CHROME_PATH, and server through BENTENG_TEST_URL.
Test fixture lives in scripts/fixtures and is not a Pages production entry.
Screenshots/diagnostics are generated under ignored outputs, contexts always close.

Next: next supplied module for actual host simulation / client input and snapshots.
Do not treat this lobby as a finished online match implementation.
