# Bentengan Squad Tag — Memori Proyek

Dokumen ini adalah ringkasan keputusan proyek yang masih berlaku. Gunakan dokumen ini pada task baru agar tidak perlu membaca riwayat percakapan lama.
2026-10-08 USER CONSTRAINT: Do not create a god module. Keep modules small with narrow ownership; split by behavior, never merge unrelated rules into one owner.

## Cara memakai dokumen ini

2026-10-08 MERGE origin/main d75b0ed INTO Refactor-Clio LOCAL ONLY. Resolved
app/prototype.tsx through module owners (progression panels, gated cycleArena,
modules/audio, water-mask RLE helper, lib/multiplayer/pump.ts, contrast HUD +
2 small UI components); no opponentSquad restore. tsc 0, build:pages PASS,
game-core 40/40, audio 10/10, multiplayer 28/28. audit-game GAGAL on merge
AND tip (21 pre-existing baseline asserts); lint 92 vs tip 296, no new
blocker. snapshot-write.ts reconciliation and ultimate central descriptor
deferred. Browser smoke via npm run dev :3000: profile→match live, zero page
errors; multiplayer session unverified. Committed locally on Refactor-Clio;
no push, PR, or deploy.

2026-10-06 PUBLISH BATCH COMPLETE: user requests all current local changes.
Multiplayer02–23 + map editor identity/preview improvements + user local maps and
4 WebP uploads included. Native game/editor data preserved, draft enable status
unchanged.165 combined tests/TS/Pages build PASS. Fetched GitHub main equal to
base d576801. Push via Windows Git credentials; restricted shell credentials and
default GH CLI token unavailable. Feature ef7c972 pushed fast-forward; Pages
workflow37461007037 SUCCESS, public build-info exact feature commit/map revision
verified. Public two-profile UI Host/Join/Ready/Start/countdown PASS, no page errors,
screenshots inspected. URL https://lengkongandreuw.github.io/bentengan-squad-tag/?build=ef7c9729c201
Final documentation-only [skip ci] commit does not change deployed runtime.
Local editor backend remains local; GitHub Pages hosts game + multiplayer entry.
Historical LOCAL ONLY entries below describe earlier
development stages and do not revoke this explicit publish authorization.

2026-10-06 MAP EDITOR LOCAL: edited native maps keep original unlock/tier identity
via arena-identity.ts; runtime gates/requirements/stats agree across studio-edit
and native IDs. Historical alias stats combine on read, fold once on next match
write; no read-time storage mutation, no extra prerequisites or threshold changes.
Map selection image editing is prominent: PNG/GIF/WebP, first frame still,
lossless640x360 contain; save/reload tested in isolated fixture. Replacement maps
without custom thumbnail inherit original arena artwork. Templates keep visible
underlays; Taman combined native terrain matches game, clean preview hides guides,
no duplicate generic structures on already-baked Taman/Kanal terrain. Current
native Taman has no independent warung asset; do not invent obsolete-layout props.
165 combined tests, TS/focused lint, Pages build PASS; browser checks exact source,
thumbnail round-trip and collider preservation, screenshots inspected. Existing
legacy lint/build warnings remain. Local editor4341/session3303;4320 occupied,
not interrupted. Actual config/map assets preserved; no publish.

2026-10-06 MODULE20–23 LOCAL ONLY, supersedes navigation-only restrictions in
historical17–19 below. Frozen10-actor roster; disconnected remote humans become
bots without identity/character/prison/stat reset, input authority revoked. Host
loss ends clients; no reconnect/migration. Host-owned completed MATCH_RESULT and
per-human eligibility/KDA feed existing local progression writer, XP/DOI/unlocks;
ACK/retry, storage failure retry and existing persistent match-ID dedup. Departed
humans/incomplete matches get no rewards. Casual P2P trust, not ranked security.
Host authoritative ultimate/rescue input, independent human skill states using
existing core, all flight-stage tag protection, per-round meter preservation.
Base ultimate stats online, no remote profile upgrade transfer. MATCH_FRAME syncs
scoreboards/cooldown; deduplicated host events drive client presentation only.
2–4 humans +8/7/6 host bots.163 regression tests, TS/focused lint and Pages compile
PASS. Actual2-browser full match same2–0 winner,160XP/15DOI vs100XP/10DOI; result
screenshots inspected. Actual3/4-human ownership/takeover/host-loss QA PASS;4-human
repeat checks signed movement directions, no page errors.4-human sample7.403s,
1,156,485 host application bytes,6.48Hz snapshots observed vs12Hz configured;
same-PC/startup-inclusive, not latency/FPS guarantee.24 not implemented.
See docs/MULTIPLAYER-MODULE20-23.md. Review3026; restart after source/content changes
to refresh compatibility manifest. No publish. Concurrent map editor config/WebP
saves observed during verification belong to their author; preserve untouched.
Final retry with network permission on editor replacement studio-edit-kampung
also PASS:green2–1 red, client160XP/15DOI and host100XP/10DOI,66 gameplay events,
one result/ACK,86.692s,no page errors. Earlier host-not-found signaling attempts
failed before gameplay; no guaranteed connectivity claim. Review session90824.

2026-10-06 MODULE17–19 LOCAL ONLY explicit batch. Actual lobby→game session
ownership transfer; host simulates local+remote humans+existing bots with stable
IDs/reserve choices, remote INPUT ownership/shape/sequence/bounds gates and250ms
neutral timeout. Shared human move/boost/parkour, no bot multipliers for humans.
Client has no authoritative update/AI/collision;12Hz host snapshots,30Hz client
input,100ms bounded receive-clock interpolation of x/y with latest discrete data.
No prediction; legacy variable-delta physics retained. Online profile/reward/XP/
DOI/rotation writes disabled. Navigation MVP only, not complete online match FX.
CONTENT_VERSION gates admission/start; SHA-256 source/config build + selected
arena definition/Studio/map asset bytes detect same-ID changed maps; mismatch
readable and approval revoked. Pages Vite manifest required; restart server after
source edits. No automatic assets/auth/server/reconnect/host migration.
154 regression tests,TypeScript,focused module lint,Pages build passed; actual
two isolated browser runtime QA PASS (remote reserve Kodo, host local,8 bots,
snapshots, host-tab disconnect, no page errors). Heartbeat silence10s/scanned5s
ends frozen clients even before ICE leave detection. Full legacy monolith lint
diagnostics remain. Current local review3025. Details
docs/MULTIPLAYER-MODULE17-19.md. No publish.

2026-10-06 MODULE14–16 LOCAL ONLY in requested order. Lazy pinned MQTT/Trystero
WebRTC adapter isolated from gameplay; no dedicated server/TURN/media permission.
Public signaling/ICE dependency and NAT failure caveats; full room code embeds
expected host peer ID plus nonce, not authentication.20s missing-host failure.
Host canonical revisioned lobby validates peer-bound team/character/ready and
duplicates, max4 humans,5v5 bot preview; only host can start2+ all-ready prep.
Native minimal multiplayer dialog on splash, leave closes transport/timers, host
loss ends room. LOBBY_STATE/SESSION_ERROR added to local v1 protocol. Lobby start
does not run online gameplay; compatibility/assets and live sync pending later.
8 deterministic tests + real two isolated Chrome contexts WebRTC team/character/
ready/start/disconnect PASS, desktop/mobile inspected.144/144 tests, TS/lint/Pages
build PASS; npm audit21 advisories not auto-fixed/clean security not claimed.
Existing locked versions/assets/config/editor/solo behavior preserved; no publish.
See docs/MULTIPLAYER-MODULE14-16.md. Prior02–13 uncommitted work retained.

2026-10-06 MODULE11–13 LOCAL ONLY under explicit batch instruction. Drawing reads
detached canonical RenderFrame; keeps sprite/cache legacy visual IDs and names,
no actor mutation authority; 3D error pause handled by runtime loop. Canonical
projection runs each render frame for current variable-delta truth; snapshot
JSON encoding only on demand. No measured device FPS/browser visual QA claim.
Snapshot v1 dynamic allowlist excludes assets/static geometry/profile/stat stores;
strict finite exact-key bounded parser, identity/reference/phase checks.
Dev probe readSnapshot() added. Protocol v1 validates all12 messages and events,
canonical team conversion and envelope consistency; no WebRTC/transport/network
apply, authentication or sequence/ownership authorization yet. See
docs/MULTIPLAYER-MODULE11-13.md.136/136 tests, TypeScript/lint/Pages build PASS;
existing CSS/chunk warnings remain. Source assets,
configs/editors/economy/balance untouched; no publish. Prior02–10 work preserved.

2026-10-06 MODULE09+10 LOCAL ONLY, explicitly authorized together. Bot strategy
and sequenced intents extracted to game-core/bot-ai.ts; host-only/controller=bot
selection, sequential shared movement, old routing and balance retained. Client
guard does no AI/navigation/consume. Current single-player remains host; no P2P.
game-core/events.ts defines finite data-only event boundary: accepted tag/rescue,
fort entry/capture edges, ultimate and guarded results. Runtime presentation
consumes audio/feed/VFX events; stats/rewards remain outside subscriptions.
Legacy return shapes retained; footsteps/refill/hazard/combo effect paths still
incremental, not a claim of fully decoupled monolith. Staged clock unchanged.
127/127 combined tests, TypeScript/core lint/Pages build PASS; see
docs/MULTIPLAYER-MODULE09-10.md. No asset/editor/config changes
or publish. Prior STOP09 is superseded by this explicit batch request.

2026-10-06 MODULE08 LOCAL ONLY: ultimate + match authority extracted into
lib/game-core/ultimate.ts and match-rules.ts. Current balance and upgrade snapshot
preserved; cast/impact, flight sequence, bonus/recharge, scope, timer precedence,
sudden death and best-of-three guarded by core. Audio/banners/reward storage stay
runtime-side. Frozen parity and actual once-only result adapter tests added.
Combined120/120 tests, TypeScript/core lint/Pages build PASS; details
docs/MULTIPLAYER-MODULE08.md. Staged clock unchanged.
Supplied08–10 require per-module STOP, so09/10 not implemented yet. No publish;
continue09 only on user instruction. Prior02–07 work retained uncommitted.

2026-10-06 MODULE02–07 implemented LOCAL ONLY after explicit user batch approval,
superseding the earlier one-module STOP. lib/game-core provides canonical JSON
read state, stable IDs, sequenced input, staged 30Hz clock, extracted motion and
interaction rules. Runtime delegates without asset/balance/editor changes.
Clock does NOT yet replace the original variable-delta simulation. Legacy IDs
retained for ties/stats; all ten new entity IDs persist across rounds. Dev-only
window.__bentengGameCore.readState() reads detached actual match truth on demand.
No remote input, WebRTC, full state writer or takeover workflow. Audio/profile,
AI decisions and ultimate timing remain runtime-owned pending later modules.
114/114 combined tests PASS including 14 core frozen legacy parity tests;
TypeScript/core lint/Pages build PASS with existing CSS/chunk warnings. See
docs/MULTIPLAYER-PHASE-A-02-07.md for boundaries and validation. No commit/push;
next development follows the next supplied document, not inferred deployment.

2026-10-05 Multiplayer MODULE01 COMPLETE LOCAL ONLY. Supplied00–03 require STOP
after active module, so inventory only: docs/MULTIPLAYER-RUNTIME-BOUNDARIES.md.
Main runtime8936lines; mutable effect truth, players[0]/slice(1) controller
assumptions, internal blue=visible red and red=green. Existing Snapshot is HUD,
not canonical truth. Flight advance/steer mutate; map index owns caches/functions.
Preserve tieHash/ID ordering, dt vs deadline clock semantics, finite JSON values,
authored flight timing, progression handoff once per completed match. No runtime/
asset/editor changes or publish. Next on continuation02, then03; no P2P yet.

2026-10-05 user subsequently requested publish optimization. Fresh fetch showed
HEAD==github/main e508b11; no merge or force push. Implementation065bdf5 published,
Pages run37280025918 build+deploy SUCCESS; TypeScript/100 tests PASS. Source Studio
assets/config and map config unchanged; Refactor-Clio branch not merged/modified.
LOCAL ONLY optimization entry below is historical and superseded for publish.

2026-10-05 LOCAL ONLY optimization: custom sprites use separate lossless packed
runtime assets (config/sprite-runtime.json, public/sprite-runtime). Originals and
Sprite Studio config untouched. 47 atlases/1213 frames decoded RGBA area proxy
731.8 ->392.8MiB; compressed size31.05 ->30.51MiB. Not measured RAM/FPS. Original
logical placement/FPS/frames preserved, actor states and flight views cached.
New editor assets/frames fallback to originals until npm run sprites:runtime or
build:pages regenerates. 100 regression/packing tests PASS, TypeScript/lint/Pages
build PASS with existing warnings; live/browser FPS QA pending. No publish.

2026-10-05 user explicitly requested publish ALL local changes without disturbing
other programmers. Prior LOCAL ONLY constraint revoked for this publish. Fetch
confirmed HEAD==github/main c742c25 before staging; non-force push only. Economy,
DOI UI,Back art,Workshop entry removal and saved Studio map/sprite edits included.
Separate editor files preserved. Implementation9adf32c pushed non-force; Pages
run37249937717 completed SUCCESS.96 regression tests/TS/Pages build passed.
Published:https://lengkongandreuw.github.io/bentengan-squad-tag/

2026-10-05 LOCAL ONLY: currency display renamed TOKEN→DOI,central config label DOI
but internal token id and all stored keys preserved. Wallet uses supplied coin;
Ultimate modal follows supplied maroon/graffiti/purple/yellow visual reference
with label/close/accent PNGs in public/ui-v2/economy. Confirmation,stats,purchase
guards untouched.83 tests/TS/focused UI lint/Pages build PASS; browser visual QA
not performed (browser control tool unavailable). No publish/balance changes.

2026-10-05 Economy MODULE10–13 complete LOCAL ONLY. Wallet shown in Profile and
Character Selection,refreshed from saved profile events. Catalog-supported Raja/
Kaka get modal current/next stats and confirmed purchase,shortage/max/storage/
stale feedback,unique quote ID and one-shot click guard. Unsupported characters
only show wallet. Existing result summary renders engine TOKEN breakdown,total
and resulting balance; duplicate/incomplete never replay reward. No new shop/key.
83 tests/TS/focused new UI lint/Pages build PASS; tests include actual component
handlers and persisted18-TOKEN synthetic journey reaching levels after7/23/52
matches,totalcost920. NOT player telemetry; real playtest average unknown,config
unchanged. No manual browser/mobile visual walkthrough. Existing unrelated lint
issues remain. Studio drafts/assets preserved. No publish; STOP after13.
Earlier07–09 notes about no purchase UI superseded by10–13.

2026-10-05 Economy MODULE07–09 complete LOCAL ONLY. Pure purchase engine debits
TOKEN and increments one level atomically; duplicate/insufficient/max/invalid/
stale quote rejected. Service saves once; failed storage reports no durable success.
getUltimateUpgradeConfig reads catalog rows; getUltimateUpgradeLevel reads profile.
Frozen effective stats fall back to level0 for missing/invalid state; unsupportednull.
Raja/Kaka gameplay snapshots stats at match start (recharge/cast/duration/Raja speed),
bots retain base activation stats; existing allied effect scope and tag20/rescue30
bonuses preserved. Bebe/Ciici unchanged. Custom/built-in Ultimate frame timelines
fit cast duration without asset changes.80 tests/TS/focused lint/Pages build PASS;
runtime smoke via actual-code harness,not manual browser gameplay validation.
No purchasing UI,no publish. STOP before10. Editor drafts/assets untouched.
Earlier04–06 notes about no purchasing/runtime modifiers superseded by07–09.

2026-10-05 Economy MODULE04–06 complete LOCAL ONLY (user supplied all3).
Match resolver now returns TOKEN breakdown/balances alongsideXP,uses existing
incomplete/dedup guard and one service save. Formula10 completion+5 win+tag max5
+rescue2 max6 TOKEN; max26 win/21 loss. No parallel processed-match history.
Storage migration repairs missing economy to0,no retroactive grants; preserves
safe counters/valid ledger and unrelated profile/progression,one migration write,
blocked write retains source/retries. New catalog Raja/Kaka Lv0–3 costs120/280/520
incremental,independent ultimateUpgrades state; missinglevel0,unsupportednull.
No purchasing/gameplay modifiers/UI. Existing Raja/Kaka base timings preserved.
53 tests (16economy+37progression)/TS/lint/Pages build PASS; old CSS warnings.
STOP before07/no publish per economic docs. Editor drafts/assets remain untouched.
Earlier01–03 notes about no rewards/migration now superseded by04–06.

2026-10-05 Economy MODULE01–03 complete LOCAL ONLY. User supplied01–03 together;
02 centralized config/economy.json strict frozen parser (malformed throws),03
creditTokens/spendTokens/getTokenBalance immutable operations, explicit failures,
safe-integer overflow/no negative balance, bounded50 ledger idempotency only.
Input amount positive; spend negative ledger. No storage/events/match/UI/upgrades
or legacy migration/reset.10 economy+37 progression tests/TS/lint PASS.
STOP before04 and no publish per active specs. Editor drafts/assets untouched.

2026-10-05 published runtime scheduling c742c25 (Pages37215005019 SUCCESS):
exact-parity priority-queue A*,one queued AI route/frame,hidden scoreboard avoids
row rebuild,optional ?performance=1 diagnostics. Contributor carousel f3f7a7e
merged. No asset/FPS reduction; realtime game FPS not measured.033af27 immunity
now covers Bebe/Ciici takeoff+flying+landing,overrides older flying-only notes.

2026-10-04 user revision: Ultimate Bebe/Ciici now default+8 optional directions
for all3 Flight phases,overrides original default-only brief. Default fallback
stays; phase facing matches sequence completion. Performance optimization:
exact broad-phase Studio collider queries,range-first tag LOS,active-lineup sprite
preload,offscreen rotated-object culling and cached terrain patterns. Original
assets/FPS/quality untouched. Running4319/4331 editor servers old; restart needed
after saving user drafts. Do not kill them automatically. Published180e5d3;
Pages37210568540 SUCCESS; public commit verified. See checkpoint.

2026-10-04 Ultimate Flight Batch01: Bebe/Ciici shared controller,4sec actual
FLYING only tag immunity,locked interactions,takeoff/landing vulnerable,selective
colliders and safe landing. Bebe speed1.25 turn0.85; Ciici1.20/1.15. Existing
Raja/Kaka unchanged. Sprite Studio adds exactly3 default-only slots for these
two: ultimate_takeoff,ultimate_fly,ultimate_land. Canonical artwork missing,
generic ultimate/idle fallback temporary. Icons use user's originals. Preserve
user local map/sprite drafts; Economy01 still LOCAL ONLY. Published7763061,
Pages37192971785 SUCCESS and public commit/icons verified. Complete realtime
browser flight walkthrough remains unverified; automated tests pass. See checkpoint.

2026-10-04 Economy MODULE01 complete LOCAL ONLY. economy.ts version1 wallet/
signed transactions/default0/strict safe parsing/latest50 ledger. Optional
profile.economy for legacy, new profile factory initializes wallet; malformed
economy does not discard profile/progression. Reuse profile storage key; no
economy migration or grants yet.4 wallet+37 progression tests, TS/lint PASS.
STOP before02; index explicitly prohibits publish until requested. Preserve
user Map/Sprite Studio configs and Bebe uploads. No UI/gameplay/economy awards yet.

2026-10-04 MODULE17 PUBLISHED d1d15fd. Actions37177521084 SUCCESS; public build
commit/map revision, hashed JS and seven unchanged PNG hashes verified. Draft
USER config/map-studio.json untouched and excluded. Publication complete.

2026-10-04 MODULE17 publication now explicitly authorized by user. Supersedes
local-only instruction below; publish audio UI/typography/assets/docs only.
Unrelated USER config/map-studio.json must remain local and unstaged.

2026-10-04 MODULE17 UI audio/typography implemented LOCAL ONLY. Full brief read;
explicit do-not-publish/STOP overrides standing auto-publish for this task. Seven
original PNGs preserved and copied to public/ui-v2/audio-settings/. Impact400
display/H1, Poppins headings/body/controls; next/font/google and Pages official
Google Fonts loading aligned (network required, sans fallback). No font binaries.
Existing live-save remains; snapshot on open, SAVE keeps, CANCEL/Escape restores.
Native range overlay on art, calibrated endpoints,0/100, collapsible previews,
cleanup/hotkey isolation. Native dialog/portal prevents transformed menu clipping.
Mobile scroll and reachable SAVE/CANCEL, no artwork distortion. TS/lint/Pages
build +10 audio tests passed; browser desktop/portrait/landscape/pointer/keyboard
checked; physical touchscreen pending. No audio/gameplay/editor/map/sprite changes.
Preview local3008/bentengan-squad-tag/. Do not publish until user explicitly asks;
preserve/exclude unrelated dirty config/map-studio.json when publishing later.

2026-10-04 MODULE16 implemented; user explicitly authorized publish after brief
implementation. Supersedes preparation-only note below. Reuse GameplayAudio/SFX
master with20 custom MP3s/cache/procedural fallback,4 tag impacts and10s local
player announcer1–5. Cancel/reset on captured/end/restart/exit/timeout;6+ no replay.
Special BENTENG capture -> generic -> procedural. Countdown playbackRate fits
existing2.8s; no gameplay changes. Ultimate and results guarded event hooks,
successful rescue uses release. Samples compensate procedural3x gain.10 audio+
37 progression tests/TypeScript/build PASS; actual browser20 decodes and mute
PASS. Keep unrelated current Map Studio draft config LOCAL, not in this commit.
PUBLISHED:61bf0e9+c6bcac5, Actions37158045886 build/deploy SUCCESS. Public bundle
HTTP200 and all20 MP3 hashes verified at GitHub Pages. Unrelated local Map Studio
config preserved/unpublished. No subjective mix sign-off; user should review mix.

2026-10-04 PREPARATION ONLY: user supplied20 MP3s + Custom In-Game SFX/Tag Counter
brief for saving/study, not implementation. Masters/full brief/notes preserved
at audio-sources/custom-gameplay-sfx/ outside public/. All copied hashes match.
Future scope: replace selected procedural cues with sample fallback;4 tag impacts,
local-player10s streak announcer1–5; special BENTENG confirmed capture sample,
generic/procedural fallback. Reuse SFX master, retain step/prison. Existing3x
SFX boost needs mixing validation; audio not yet auditioned/decoded. No code or
deployment changes. Read README + brief on next explicit implementation request.

2026-10-03 user explicitly requested publishing ALL local features/changes,
overriding earlier LOCAL ONLY progression instructions. Publish01–15 and local
Kaka Studio animations/assets plus inactive map editor drafts. Keep kampung3d
deleted (restore missing draft marker), don't activate drafts automatically.
Read newest CHECKPOINT publish status before relying on older local-only notes.

PUBLISHED2026-10-03: progression01–15 and all validated local Studio changes
are live at https://lengkongandreuw.github.io/bentengan-squad-tag/ . Code commit
6f97ce4; Actions run37131424947 build/deploy SUCCESS. Public bundle exactly matches
validated build; public Kaka atlas200.49 tests/TypeScript/build PASS. Editor map
drafts remain inactive; kampung3d remains deleted. Prior LOCAL ONLY/STOP publishing
notes below are historical and superseded by this explicit user publication.

MODULE14–15 lokal (2026-10-03): Progression Core01–15 COMPLETE. Satu panel result
nonblocking menampilkan resolver newlyUnlockedCharacters/newlyUnlockedArenaIds,
nama dari katalog, dismiss button. Transient notice/result reset per match dan
tidak direhydrate dari profil; reload tidak replay, unlock tetap persisted.
Duplicate/incomplete tidak memberi notice/reward. 37 tests PASS (full persisted
journey all14chars/Lv13/six arena tiers, migration/gates/random/rotation/wiring,
no render awards, multiunlock incl20 entries). TypeScript/lint/build PASS.
Real isolated3006: loss100XP lalu win168XP =>268/Lv2, Bebe+Pasar notified together;
dismiss keeps reward; reload retains stats/unlocks, rematch resets result. UI
fixture tests duplicate/reload/mobile390x844, no overflow/errors. Hash kedua
Studio configs unchanged; user drafts/upload Kaka not staged; no assets rebuilt.
Test command npm run test:progression. Coverage/limits in PROGRESSION_REGRESSION.md.
Known limits: localStorage only;50-ID duplicate window/no multi-tab transactions;
reload can skip unread notice; aggregate legacy migration not per-arena wins;
new custom maps need rules. Three-completed-match rotation unchanged.
STOP after15; no achievement/daily mission/cloud save; do not publish until asked.
Earlier STOP notes01–13 below are historical and superseded by completion01–15.

MODULE12–13 lokal (2026-10-03): panel persyaratan semua arena menggunakan checks
engine+nama katalog, inspect dropdown tidak memilih locked map. Carousel/gates
tetap. Final result menambah XP breakdown, level/next-level progress dan target
karakter dari snapshot ProgressionResult resolver (tidak award di render).
33 tes termasuk repeated UI render PASS, TypeScript/lint/build PASS. Browser
real match+rematch PASS, desktop/mobile tanpa overflow tambahan, console0.
Perubahan tetap lokal; STOP sebelum14, jangan publish tanpa permintaan eksplisit.
Draft Map/Sprite Studio dan upload Kaka user tidak diubah/di-stage.

MODULE11 lokal (2026-10-03): locked character tetap terlihat, native disabled,
badge LOCKED/UNLOCK AT LV.N +XP tooltip dari selector central. Baris status roster
kecil scrollable menjaga semua nama/level terbaca tanpa mengubah portrait/layout.
Confirm/keyboard/pointer tidak bisa memilih locked. Gate10 memakai storage latest
saat launch dan mendengar storage event. 31 tes +TypeScript/scoped lint/build
PASS; desktop/mobile smoke, live finish/rematch, clean reload console0.
User aktif mengedit map/sprite Kaka di Studio; semua draft/upload tidak di-stage.
Semua10–11 lokal, STOP sebelum12/publish. Preview uji localhost3005 (Vite),
panel Map4320/Sprite4319 tidak di-restart atau diubah.

MODULE10 lokal: content-gates.ts central player-only filters/validation/fallback,
prototype guards all selection/launch/rematch/restart/rotation/loading/init paths.
Faction starter first unlocked (Kaka for green); full bot rosters unchanged.
Runtime now replaces legacy match writer with recordMatchProgression, stable ID
per initialized match. Profile refresh avoids restarting gameplay. 30 tests,
TypeScript/build +browser smoke PASS. User requested10+11, no publish/12 yet.
Earlier09 note that runtime was not hooked is superseded by10.

MODULE09 lokal (2026-10-03): storage load kini migrasi progression missing/
outdated/malformed satu kali. Profil current/new/future valid tidak migrasi ulang.
XP historis agregat dari config, saturasi safe integer via BigInt; levelmax13.
Identitas/stats valid/extra fields dipertahankan, optional progression diselamatkan
per-entry (unlocks, arena stats, bounded match IDs), starter selalu tersedia.
Tidak menebak wins per-arena dari total wins. Migration timestamp+version disimpan
sekali; storage failure tidak menghapus legacy, retry pada load berikutnya.
29 tes progression +TypeScript +scoped lint +diff check PASS. Semua06–09 lokal,
draft Map Studio tidak ikut commit. STOP sebelum10, tidak publish otomatis.
PENTING: runtime app/prototype masih writer legacy; recordMatchProgression API
belum dihook. Integrasi berikutnya mengganti writer, bukan memanggil dua writer.
Catatan01–05 tentang belum adanya migration adalah histori sebelum09.

MODULE08 lokal: satu matchId stabil, UUID/fallback shared, processedMatchIds50
terakhir. Duplicate no-op reason duplicate termasuk setelah reload; service
load authoritative sebelum reward dan simpan ID+reward satu write. Window bounded,
bukan proteksi replay histori >50 atau transaksi multi-tab. 24 tes/TypeScript PASS.

MODULE07 lokal: applyMatchProgression pure + recordMatchProgression storage entry
memperbarui XP/arena stats/aggregate totals lalu character+arena unlock, satu save.
Result membawa profil dan delta XP/level/unlocks; incomplete no-op. Writer ini
menggantikan, bukan melengkapi recordCompletedMatch saat integrasi runtime nanti.
Belum disambungkan app/prototype atau notifikasi. 22 tes +TypeScript PASS.

MODULE06 lokal (2026-10-03): config campaign6 tier dengan kanal2 sebagai tier5
dan studio-kampung-2420b8cf tier6. arena-unlocks.ts mengevaluasi ALL syarat dan
mempertahankan unlock historis, memakai tier metadata. Tidak UI/gates/bot changes.
19 tes +TypeScript PASS. User meminta06–09 bersama, tidak publish.

Progression MODULE05 (2026-10-03, lokal belum publish): arena-stats.ts API pure
getArenaStats/applyArenaMatchStat, ID custom/dinamis, played tiap apply dan wins
hanya kemenangan. Return profil baru tanpa mutasi atau storage write. Getter
legacy0, apply menunggu migration09 bila progression belum ada. Tidak arena
unlock/match integration/dedup;07/08 akan mengatur pemanggilan tepat satu kali.
17 tes progression dan TypeScript PASS. STOP setelah05, jangan publish/lanjut06
otomatis. Draft Map Studio pengguna tidak ikut commit.

Progression MODULE04 (2026-10-03, lokal belum publish): character-unlocks.ts
menyediakan requirement/eligibility/progress dan resolver immutable dari config.
Historical unlock NEVER RELOCK; starter selalu terbuka. Resolver menghasilkan
profil baru dan daftar unlock baru, bukan otomatis menyimpan. Legacy tanpa
progression aman dibaca level1, write resolver menunggu migration09. Bot/UI/match
tidak berubah. 14 tes dan TypeScript PASS. User meminta04+05 sekaligus.

Progression MODULE03 (2026-10-03, lokal belum publish): xp-engine.ts memiliki
helper XP/level pure dari config02, tanpa integrasi match/storage/UI. XP summary
completed/result/tags/rescues; incomplete0, loss tetap completion100, cap terpisah
64tag/60rescue. Level13 maksimal; XP ekstra dipertahankan, next threshold null,
sisa0, progress1. Level didapat dari XP, tidak disimpan. Input malformed ditolak.
11 tes progression +TypeScript lulus. STOP, jangan lanjut04/publish otomatis.

Progression MODULE02 (2026-10-03, lokal belum publish): aturan terpusat di
config/progression.json; typed loader/parser di lib/player-profile/progression-rules.ts.
Seed profil01 sekarang berasal dari config. XP reward/cap, 13 level kumulatif,
14 karakter mengikuti dokumen02. Arena tiers/unlockRequirements sengaja kosong
karena aturan belum diberikan; schema siap untuk ID arena stabil dan statistik
prasyarat. Tidak ada engine/gates/UI, jangan lanjut03 otomatis. Pengguna menahan
semua fitur progression di lokal sampai meminta publish.

Progression MODULE01 (2026-10-03, lokal belum publish): lib/player-profile/
progression.ts menyediakan type versi1, factory default baru XP0 / raja+kaka /
kampung, validasi read-only dan koleksi independen. Profil legacy tetap boleh
tanpa progression; parser storage menjaga progression yang valid, tanpa migrasi
atau write-on-read. Belum ada reward/level/unlock/gates atau integrasi match
progression. Dokumen modul01 meminta STOP dan tidak publish tanpa request eksplisit.

Map Studio guard katalog (2026-10-03): katalog bawaan wajib berisi lima arena
2D dan template replacement; server lama/tidak lengkap tidak lagi diam-diam
menghasilkan daftar kosong. Jalankan test:map-studio untuk HTTP contract + model.
Sesudah perubahan server harus restart proses Node; refresh browser saja tidak
memuat ulang modul server. Port4320 telah direstart dan dibuktikan lewat browser.

Map Studio lifecycle: daftar bawaan/custom, edit versi pengganti 5 arena 2D,
Arsip/Sampah/Pulihkan, Pulihkan versi asli. Sampah recoverable, aset tidak dihapus.
Manifest builtinStates mengatur visibilitas bawaan; map.replaces memilih sumber
yang diganti setelah Aktifkan. archived/deleted tidak ditampilkan game.
Import kanal membawa mask RLE air; tombol hapus mask tersedia, bridge menutup air.
3D hanya lifecycle, bukan edit visual. Grafik baked-in tetap menyatu di terrain.

Map Studio (2026-10-02): `npm run admin:maps`, localhost 4320. Editor lokal
terpisah dari UI game, dengan map kosong/salin Kampung, PNG/GIF/WebP, collider
rect/ellipse/polygon, layer/z/Y, terrain/icon, FPS, base/prison anchors,
undo/redo, uji cepat, save/build/publish. Manifest config/map-studio.json;
upload public/map-studio/*.webp, backup .preview-admin/. Map asli/sprite tidak
diubah. Map aktif ditambahkan ke pilihan arena; mekanik shared collider, air,
jembatan dan slow untuk pemain/bot. Publish menolak dirty non-map serta commit
belum sinkron, tidak auto-merge/force-push. Salin Kampung memakai latar dengan
beberapa dekorasi baked-in; terrain bersih diperlukan untuk memisahkannya.

Kecepatan Sprite Studio: FPS 1–60 di preview editor, diterapkan per movement
melalui tombol Terapkan atau batch. Pengali 0,25×–4× di panel perbandingan hanya
mengubah playback preview bersama, bukan konfigurasi game atau skala karakter.

Panel perbandingan Sprite Studio: `http://127.0.0.1:4319/comparison`, menampilkan
semua slot custom yang sudah diterapkan lokal (bukan draft / verifikasi GitHub).
Zoom bersama, garis pijakan, skala karakter × slot, filter, pause, dan link Edit.
Ukuran frame termasuk area transparan; tidak ada auto-fit yang menyamakan gambar.

2026-10-02 Sprite Studio: bebas menerapkan movement aktif saja atau draft yang
dicentang. Draft lain tidak memblokir; Publish hanya slot yang sudah diterapkan.
Setiap movement mendukung Default + 8 arah, prioritas override arah > default >
sprite lama. PNG tunggal/sheet/kumpulan frame, GIF/WebP didukung; validasi file
dekat upload sebelum proses, lalu validasi grid/crop/atlas saat proses.

Alur Sprite Studio sederhana: pilih seri/arah, proses upload, tandai sudah sesuai,
lalu Simpan & update karakter atau Simpan & publish ke GitHub. Batch atomik hanya
mengubah arah yang dipilih. Draft hasil proses tersimpan di memori tab sampai
diterapkan, bukan disk; refresh/close memberi peringatan. Opsi teknis di Advanced options.

Sprite Studio memiliki preview upload langsung dan crop visual drag/resize.
Crop diterapkan sama setelah grid dipisahkan; Proses upload & preview wajib
sebelum menyimpan perubahan sumber/crop. File sumber dan karakter lain tetap utuh.

Sprite Studio ingame (2026-10-01): `npm run admin:sprites`, port 4319, terpisah
dari panel selection 4318. Manifest `config/sprite-studio.json` override per slot
dan karakter; slot kosong tetap memakai renderer lama. Custom hanya visual:
30 slot, 8 arah run/tag/parkour + idle/prisoner/ready/ultimate/victory/defeat.
Loading pertandingan preload atlas custom. Editor tidak bergantung pada UI
publik; petunjuk lengkap `scripts/sprite-studio/README.md`.

Kontrol terbaru (2026-09-26): klik kiri menentukan tujuan tanpa boost; klik kanan
memicu boost tanpa mengubah tujuan; WASD mengambil alih navigasi, Shift parkour.
Navigasi klik memakai A* menghindari collider dan sungai. Tombol mobile hanya
tampil pada viewport <=1024px, dengan D-pad kiri dan aksi kanan, pointer capture
untuk menahan tombol. Konversi koordinat mendukung shell portrait yang diputar.
Tes regresi: `node scripts/test-click-navigation.mjs`.

Urutan sumber kebenaran:

1. Instruksi eksplisit pada task yang sedang aktif.
2. `CHECKPOINT.md` untuk progres task yang belum selesai.
3. Dokumen ini untuk keputusan proyek yang masih berlaku.
4. Kode, konfigurasi, dan riwayat Git di repository.
5. Riwayat percakapan lama hanya jika pengguna secara khusus memintanya.

Instruksi baru yang menyatakan **menggantikan**, **membatalkan**, atau **mengabaikan** keputusan sebelumnya harus diprioritaskan dan kemudian diringkas kembali ke dokumen ini.

Pada awal task implementasi, baca `memori.md`, `TASK_TEMPLATE.md`, dan
`CHECKPOINT.md`. Jika checkpoint berstatus `ACTIVE`, lanjutkan dari bagian
`Next action`; jangan mengulang tahap yang sudah tercatat selesai dan lulus.

Setelah setiap tahap penting, perbarui `CHECKPOINT.md` sebelum melanjutkan.
Checkpoint minimal harus menyimpan tujuan aktif, pekerjaan selesai, file yang
diubah, hasil validasi, masalah tersisa, dan tindakan berikutnya. Jika proses
berhenti karena limit, error eksternal, atau interupsi, checkpoint harus cukup
lengkap agar task dapat diteruskan hanya dengan membaca repository.

## Ringkasan proyek

- Publikasi diminta 2026-10-02: override enam arah lari Jago dan map aktif
  Arena Benteng 1. Kampung Merdeka 3D dikeluarkan dari game lewat status deleted
  pada builtinStates; kode/aset tetap tersimpan untuk pemulihan di Map Studio.
- Rilis `c796cde` sudah di github/main; Pages run `37027823960` build/deploy
  SUCCESS. Fitur profil upstream dan editor lifecycle ikut terpublikasi.

### Sinkronisasi upstream yang diperiksa 2026-10-02

- Remote `github/main` terakhir diperiksa: `a199b80`. PR #6 / commit `1a73c74`
  menambahkan profil pemain lokal: setup username, panel profil di landing/HUD,
  karakter unggulan, menang/kalah, tag musuh, masuk penjara, rescue dan radar
  attack/support/survival. Data memakai localStorage, bukan akun/login server
  atau sinkronisasi lintas perangkat. Statistik dicatat saat MATCH_OVER.
- Modul baru: `lib/player-profile/`, `components/player-profile/`, dokumentasi
  `FEATURE_USER_PROFILE_RADAR_CHART.md`. Panel profil dimuat lazy. Upstream juga
  membersihkan opsi .npmrc deprecated dan meregenerasi package-lock.json.
- Saat publikasi Jago/map berikutnya, upstream a199b80 sudah digabung ke lokal
  tanpa konflik; tes 11 editor, typecheck dan build Pages lulus. Browser build
  produksi berhasil setup profil dan masuk pertandingan map custom tanpa error.
- Enam arena bawaan saat ini mencakup lima 2D (`kampung`, `pasar`, `taman`,
  `kanal`, `kanal2`) dan satu eksperimental `kampung3d`; uraian empat/lima arena
  di bagian historis di bawah bukan jumlah roster arena terbaru.
- Prioritas verifikasi terbaru mengikuti CHECKPOINT.md; klaim audit lengkap
  lulus di bagian historis tidak berlaku pada baseline sekarang (7 assertion
  legacy diketahui gagal; jangan mengubah baseline/sprite untuk menyamarkannya).

### Map buatan pengguna dan rencana optimasi (diskusi, belum diterapkan)

- Manifest lokal kini berisi map aktif `studio-kampung-2420b8cf`, nama
  `Arena Benteng 1`, ukuran 1969x1560, 84 objek: 46 visual dan 11 animasi
  masing-masing 54 frame; perilaku 19 parkour / 45 decoration / 20 solid.
  Ini perubahan pengguna, jangan ditimpa oleh manifest kosong dari checkpoint lama.
- 13 file gambar unik yang dirujuk map: total sekitar 14,68 MiB di disk;
  estimasi satu buffer RGBA dari dimensi atlas sekitar 109,48 MiB (bukan hasil
  pengukuran memori browser/GPU; belum termasuk sprite, canvas dan buffer lain).
- GIF upload diproses menjadi atlas WebP; runtime berbagi cache berdasarkan
  path aset. Duplikat objek dengan aset sama tidak otomatis menggandakan download.
  FPS lebih rendah mengubah playback, bukan jumlah frame/ukuran atlas atau
  frekuensi render canvas. Mengecilkan w/h objek saja juga tidak mengecilkan atlas.
- Saran awal: kurangi jumlah frame animasi sumber, resize/crop sebelum upload,
  pakai ulang aset, batasi animasi dekorasi, sederhanakan collider tanpa menutup
  jalur. Angka target merupakan anggaran awal untuk diuji, bukan jaminan FPS.
- Optimasi kode opsional berikutnya: culling visual di luar kamera, cache layer
  statis dan urutan layer; collider seluruh dunia tetap berlaku untuk AI/pemain.
  Belum diterapkan dan belum ada pengukuran FPS pada perangkat pengguna.

- Game web 2.5D Bentengan 5 lawan 5 melawan bot.
- Framework: React 19, TypeScript, Vinext/Vite.
- Node minimum: 22.13.0.
- Empat arena asli: `kampung`, `pasar`, `taman`, dan `kanal`; satu arena
  tambahan eksperimental `kampung3d` (Kampung Merdeka 3D).
- Empat belas karakter dibagi tetap menjadi Tim Merah dan Tim Hijau.
- Entry gameplay utama dan konfigurasi arena: `app/prototype.tsx`.
- Aturan tim dan spawn: `config/game-rules.json`.

## Status rilis dan pekerjaan aktif

- Branch publik `main` sudah memuat penggantian lengkap animasi Jago dan koreksi
  orientasi samping melalui commit implementasi `3ba81d3`.
- Proporsi visual roster diperbarui 2026-09-14; status publikasi terbaru ada di CHECKPOINT.md.
- Map 4 memperbesar dunia arena 15% menjadi 1954×1065 dengan ukuran karakter dan komposisi grafis tetap.
- Lebar efektif dua jembatan Map 4 setelah pembesaran adalah sekitar 75,9 px dan 92 px; keduanya melewati kebutuhan minimum 64 px untuk dua karakter berdampingan.
- Rilis terakhir sudah lulus pemeriksaan TypeScript, audit gameplay lengkap, `build:pages`, uji runtime lokal, serta workflow GitHub Pages.

## Kontrol gameplay final

- Pengaturan AUDIO tersedia di menu dan HUD ingame: slider Musik/SFX 0–100%,
  default musik 16%, SFX 85%. Tersimpan pada benteng-audio-levels-v1 di browser.
- Volume berubah langsung tanpa restart pertandingan atau musik. SFX mencakup
  efek interaksi, beep/UI, cue kemenangan/kalah, serta ambience (lebih pelan).
- Preview musik ingame 5 detik meredam musik normal sementara; preview sembilan
  efek dapat dipilih. Preview berhenti ketika panel ditutup atau pindah layar.
- Rencana pemisahan repo privat/publik DITAHAN atas instruksi pengguna; jangan
  mengubah visibilitas, remote, atau riwayat tanpa instruksi baru.

- Efek gameplay prosedural (Web Audio) di lib/gameplay-audio.ts: langkah, dash,
  tag, tertangkap, suasana penjara, membebaskan, dibebaskan, masuk benteng lawan,
  dan benteng direbut. Tidak memerlukan file/audio pihak ketiga.
- Efek terpisah dari mute musik; langkah mengikuti perpindahan nyata, dash saat
  mulai, penjara berjeda 3,5 detik. Efek bot sekitar lebih pelan; resource audio
  ditutup ketika pertandingan dibongkar. Kebijakan autoplay browser tetap berlaku.

- Gerak: `WASD` atau tombol panah.
- Sprint: `Space`, durasi dasar 1,4 detik.
- Parkour: `Shift` ketika berada di dekat rintangan.
- Ultimate Raja: `Caps Lock` setelah meter mencapai 100%.
- Ultimate Kaka: `Caps Lock` setelah meter mencapai 100%.
- Jeda: `P`.
- Meter ultimate Raja terisi otomatis dan mendapat bonus dari tag serta rescue.
- Meter ultimate Kaka mengikuti pengisian Raja: otomatis 45 detik, tag +20, dan rescue +30.
- Tombol musik tersedia di menu, HUD pertandingan, dan layar jeda. Opsi ini hanya mematikan musik latar, mempertahankan ambience serta seluruh sound effect, dan tersimpan di browser untuk kunjungan berikutnya.

## Ultimate karakter

- Raja dan Kaka menghentikan gerakan seluruh karakter selama animasi ultimate satu kali berlangsung; timer pertandingan tetap berjalan.
- Efek ultimate baru diterapkan setelah animasi selesai dan gerakan permainan kembali normal.
- Raja memberi seluruh rekan ACTIVE bonus kecepatan +40% selama 5 detik.
- Kaka memberi seluruh anggota timnya, termasuk dirinya sendiri, perisai hijau yang mencegah tag selama 5 detik.
- Sprite Ultimate Kaka disimpan terpisah dari atlas gerak utamanya di `sprite-sources/kaka ultimate sprites.png`.

## Aturan visual dan gameplay arena

- Benteng Merah berada di sisi kiri; Benteng Hijau berada di sisi kanan.
- Margin, pagar, vegetasi tepi, dan latar dekoratif berada di layer bawah.
- Margin tidak boleh menutupi benteng, penjara, pemain, item, atau objek gameplay penting.
- Objek dekoratif tidak boleh menghasilkan collider tanpa alasan gameplay.
- Bangunan, penjara, barrier, planter, kanal, dan rintangan fisik harus memiliki collider yang mengikuti bagian padat objek, bukan seluruh gambar transparannya.
- Jalur dari spawn, benteng, penjara, dan area tengah harus tetap dapat dilalui.
- Susunan objek boleh non-simetris jika mengikuti referensi, tetapi tidak boleh memberi keuntungan jalur yang besar kepada salah satu tim.
- Aset yang sudah ada harus digunakan kembali sebelum membuat aset baru.

## Status arena saat ini

### Eksperimental — Kampung Merdeka 3D (2026-09-21)

- Map kelima `kampung3d` merupakan deep clone Kampung setelah normalisasi.
  Ukuran, base, penjara, collider, dekorasi dan AI identik; sprite tetap 2D.
- `lib/kampung-3d.ts` adalah renderer Three.js WebGL2 terpisah, dimuat lazy
  hanya saat memulai map eksperimental. Loading memeriksa shader/WebGL lebih
  dulu; kegagalan menawarkan kembali ke menu, tidak layar hitam tanpa respons.
- Terrain menggunakan tekstur asli, bagian border bunga 2D dicrop runtime
  agar tidak bertumpuk dengan margin 3D. Aset sumber tidak diubah.
- Semua scenery map: low-poly prosedural (bangunan/gerobak, pohon, barrier,
  benteng, penjara, bunting, planter dan komposisi pagar bunga Kampung).
  Ini interpretasi low-poly tahap awal, bukan konversi artistik identik piksel.
- Kamera ortografik tetap; mapping tanah mempertahankan koordinat gameplay.
  Sprite dirender pada bidang di scene dengan depth terhadap objek 3D;
  lantai tidak menulis depth agar kaki dan nameplate tidak terpotong.
- Geometri statis dibatch per material, DPR WebGL dibatasi 1.5, tanpa dynamic
  shadow mahal. Resource GPU dilepas saat keluar/restart.
- Rotasi empat map asli tidak memasukkan map eksperimental secara otomatis;
  map eksperimental tetap terpilih ketika rematch. Preview/loading memakai
  aset Kampung asli dan kartu diberi label EKSPERIMENTAL.
- Test `scripts/test-kampung3d.mjs` memverifikasi clone independen, lima ID unik,
  kesetaraan seluruh data gameplay dan proyeksi tanah di tiga tingkat zoom.
  Termasuk dalam `npm run audit`. Detail hasil uji/publikasi di CHECKPOINT.md.

### Map 1 — Kampung Merdeka

- ID: `kampung`.
- Kesulitan: easy.
- Terrain berasal dari satu kuadran yang dimirroring ke empat kuadran.
- Ukuran dunia diperbesar 15% dari basis arena.
- Mayoritas objek diperkecil menjadi skala 90%.
- Background runtime: `public/field/kampung-map.webp`.
- Susunan objek sengaja non-simetris dan menyediakan ruang lari terbuka di tengah.

### Map 2 — Pasar Senggol

- ID: `pasar`.
- Kesulitan: normal.
- Empat tile terrain dalam `Assets/map/map2/` disusun menjadi satu kuadran, kemudian dimirroring.
- Lima fragmen border pasar dipasang pada background sebelum arena diperbesar 15%.
- Objek gameplay menggunakan skala 90%.
- Background runtime: `public/field/pasar-map.webp`.
- Penjara dan kelompok barrier berasal dari `Assets/map/map2/objects-layout.png`.

### Map 3 — Taman Kota

- ID: `taman`.
- Kesulitan: hard.
- Sumber final terrain: `Assets/map/map3/terrain.png`.
- Sumber final seluruh susunan objek: `Assets/map/map3/objects-layout.png`.
- Kedua sumber berukuran 1672×941 dan dikomposit tanpa mengubah susunan relatifnya, lalu dunia runtime diperbesar 15%.
- Visual benteng, penjara, barrier, fountain, planter, lampu, dan margin berasal langsung dari sheet objek final; aset Map 3 lama tidak digambar di atasnya.
- Collider terpisah mengikuti bagian padat setiap objek, sedangkan margin memakai collider batas dan tetap berada pada layer background.
- Background runtime: `public/field/taman-map.webp`.
- Arena mempertahankan lapangan tengah terbuka, empat barrier pendek, fountain tengah, benteng kiri/kanan, dan penjara diagonal sesuai sheet final.

### Map 4 — Alun Kanal Nusantara

- ID: `kanal`.
- Kesulitan: hard.
- Sumber panduan final: `Assets/map/map4/guide-final.png` pada ukuran asli 1699×926.
- Sumber terrain/sungai: `Assets/map/map4/terrain.png`; sumber margin, objek/penjara, dan barrier tengah tersimpan bersama di `Assets/map/map4/`.
- Background runtime `public/field/kanal-map.webp` mempertahankan susunan panduan asli, sementara dunia Map 4 dirender 15% lebih besar secara proporsional agar arena lebih luas dibanding karakter tanpa mengubah komposisi grafis.
- Collider tersembunyi mengikuti footprint pagar margin, planter, barrier tengah, dan objek padat; visual tersebut tidak digambar ulang di atas background.
- `public/field/kanal-water-mask.png` dibangun dari terrain. Pemain maupun bot yang masuk sungai di luar jembatan kembali ke bentengnya dan menampilkan `OOOPSS... HATI-HATI` selama 1,5 detik.
- Jembatan merupakan area aman dengan lebar efektif yang cukup untuk dua karakter menyeberang berdampingan. Parkour dari tepi sungai mencari titik pendaratan darat secara adaptif sampai 132 unit dan hanya memindahkan pemain jika titik tersebut aman.

## Kondisi gameplay dan UI terbaru

- Landing memiliki menu ABOUT DEVELOPER. Komponen DeveloperCredits memakai
  dialog modal native, latar upload pengguna dan kredit sesuai teks final.
  Scroll otomatis 18px/detik, Back/Escape, Jeda/Lanjut dan Ulangi. Scroll manual
  menjeda animasi; reduced-motion mulai dalam keadaan diam. Fokus kembali ke
  tombol pembuka. Generator latar scripts/build-credits.mjs ikut ui:build.

- UI arena 2026-09-15 mengikuti referensi carousel: kartu aktif besar di tengah,
  panah kiri/kanan, lima portrait skuad sendiri, Back dan Mulai Match.
- PNG arena menjadi background pilihan map; MP4 sesuai map menjadi latar loading
  pertandingan. Landing memakai video arena acak bergantian; poster WebP menjadi
  cadangan. Loading seleksi karakter memakai gambar sesuai warna tim.
- Generator khusus: `node scripts/build-arena-ui.mjs`; output `public/arena-ui/`.
  Sumber tetap di `Assets/Video and GIFs/`. Gameplay tidak berubah.
- TypeScript dan build produksi UI ini lulus. Uji browser mencapai loading Tim
  Merah; pemeriksaan visual carousel/mobile belum selesai karena batas akses.

- Loading seleksi karakter menunggu decode portrait/ikon, kontrol, thumbnail
  arena, font, dan frame awal video tim; ganti tim memeriksa aset tim baru.
- Loading pertandingan menunggu atlas karakter, VFX, banner, atlas field,
  background arena rotasi dan water mask sebelum countdown. Audio tetap opsional.
- Batch 4 aset; timeout gambar/video 30 detik; progres, Coba Lagi, dan Kembali
  ke Pilih Tim. Aset gagal tidak dianggap siap.

- Tampilan ponsel portrait otomatis diputar menjadi landscape melalui layout responsif. Tampilan landscape fisik juga memakai kontrol sentuh yang sama.
- Layar pilih tim ponsel memiliki dua area klik yang eksplisit dan sama besar; Tim Hijau tidak lagi mewarisi inset yang membuat tingginya nol.
- D-pad berada di kiri dengan target sentuh minimum 48×52 px. Sprint menjadi tombol utama di kanan, didampingi Parkour dan Ultimate.
- Ketika pemain berada di penjara, semua tombol mekanik (gerak, sprint, parkour, Ultimate) nonaktif. Menu, mute musik, restart, dan keluar tetap dapat dipakai. Peringatan berbunyi `MENUNGGU DIBEBASKAN · Lain kali hati-hati!`.
- AI kawan dan lawan memakai pengali kecepatan, konsumsi boost, dan bias target pemain yang setara. Tingkat kesulitan hanya membedakan kecerdasan prediksi, jarak membaca jalur, ancaman, dan keputusan rescue.
- Navigasi bot dan perjalanan pulang otomatis setelah dibebaskan menilai collider dan water mask sepanjang jalur. Jika arah langsung tertutup, karakter mencoba beberapa sudut alternatif dan tidak menerobos sungai.
- Seleksi karakter menampilkan badge `ULTIMATE` untuk Raja dan Kaka.
- HUD menampilkan countdown keluar base, status kunci benteng, jumlah refill aktif, dan progres rotasi arena. Nilai yang sama tersedia di panel misi.
- Aturan permainan menjelaskan prioritas keluar, rescue, syarat kemenangan ronde/match, sudden death, rotasi arena, sungai Map 4, Ultimate Raja/Kaka, serta mapping kontrol desktop dan ponsel.

## Pipeline aset

### Panel lokal preview karakter (2026-09-24)

- `npm run admin:characters` -> http://127.0.0.1:4318/ (loopback saja).
- Upload GIF aktif/gambar statis, preview, drag/slider posisi dan skala, simpan,
  publish GitHub dengan pemeriksaan build dan penolakan perubahan di luar preview.
- Konfigurasi versioned `config/selection-previews.json`, aset hash immutable di
  `public/selection-previews/`. Backup lokal `.preview-admin/` diabaikan Git.
- UI seleksi memakai `SelectionPortrait` dan kontrak `lib/selection-preview-model.js`.
  UI baru harus mempertahankan adapter ini; panel tidak bergantung pada CSS/page.
  X/Y persentase area gambar; skala berjangkar bawah-tengah. Gameplay tidak diubah.
- Server/editor di `scripts/character-admin/` tidak termasuk situs Pages. Ini bukan
  admin online: akses dibatasi komputer, bukan autentikasi antar-pengguna komputer.
- Cara pakai, batas upload, keamanan, dan kontrak UI: `scripts/character-admin/README.md`.
- Panel juga mengelola logo landing (branding.logo); gambar PNG/WebP/JPG disimpan
  dengan hash di selection-previews/brand. Logo tim/HUD tidak ikut diganti.
- Loading character selection menunggu semua GIF/custom static tim terpilih;
  `lib/selection-preview-assets.ts` menyimpan cache readiness + decoded image
  bersama komponen preview. Tidak menambah jeda tetap; timeout GIF 90 detik/retry.
- Favicon memakai upload BST pengguna: public/favicon-bst.png, pada Pages dan dev.

- Preview seleksi Boke/Kodo memakai upload 2026-09-20 di
  `asset-inbox/2026-09-20-preview-refresh/`. Preview saja diperbesar 1.05/1.17,
  mengikuti proporsi roster; sprite dan ukuran gameplay tidak diubah.
- `scripts/build-preview-refresh.mjs` dijalankan sesudah generator UI utama
  lewat `npm run ui:build`. Memperbarui dua portrait dan logo Tim Merah dengan
  batas state y=466 (bukan separuh sheet yang memotong mahkota state aktif).
  Cache portrait Boke/Kodo dan kontrol Tim Merah memakai v9.

- Maria/Boke memakai atlas tambahan `public/characters/{id}/series-runtime.webp`
  dan `series.json`, dibuat lewat `npm run sprites:series` dari folder sumber
  masing-masing. 49 pose Maria, 50 Boke; delapan arah lari/sprint, idle, tag,
  penjara, menang/kalah. Renderer: `lib/series-animation.js`.
- Tag mengikuti posisi target saat tangkapan; Maria tag kiri memakai mirror.
  Dua pose diagonal Maria yang terpotong pada sumber tidak digunakan. Parkour
  dan rescue tetap memakai atlas lama sampai ada aset khusus penggantinya.
- Skala roster dan collider tidak berubah. Loading pertandingan menunggu atlas
  tambahan. Audit mencakup arah/state, mirror, dan gutter setiap frame series.

- Sumber objek dan terrain umum: `field-sources/`.
- Sumber khusus map: `Assets/map/`.
- Generator arena: `scripts/build-field-assets.mjs`.
- Output runtime arena: `public/field/`.
- Manifest TypeScript hasil generator: `lib/field-assets.generated.ts` — jangan diedit manual.
- Baseline arena: `config/field-baseline.json`.
- Build GitHub Pages memakai entry stabil `assets/app.js` dan mempertahankan alias bundle deployment lama. Ini mencegah HTML yang masih tersimpan dalam cache GitHub Pages selama 10 menit menunjuk JavaScript yang sudah terhapus dan menghasilkan layar hitam.
- Sumber sprite karakter: `sprite-sources/`.
- Jago memakai sembilan sumber terpisah di `sprite-sources/jago-parts/` yang
  disusun deterministik oleh `scripts/build-jago-source.mjs` menjadi atlas 7×6;
  jangan menggantinya dengan sheet Jago lama atau mengubah karakter lain saat
  merevisi Jago.
- Generator sprite: `scripts/build-sprites.mjs`, `scripts/build-vfx.mjs`, dan `scripts/build-web-assets.mjs`.

## Status sprite Jago

### Proporsi roster (2026-09-14)

- Skala visual memakai Kaka = 1: Raja .86, Tui .94, Kumis 1.30, Jago 1.20,
  Robot 1.04, Lala 1.16, Bebe .96, Ciici .95, Maria .99, Buto .90,
  Boke 1.05, Kodo 1.17, Lui .93.
- Angka mengikuti perkiraan dua referensi roster pengguna dengan asumsi skala
  kedua gambar sama. Rasio asli sprite dipertahankan, bukan diregangkan.
- Skala berlaku seragam pada seluruh frame; pijakan kaki dan mirror Jago tetap.
- Penanda kepala menyesuaikan tinggi. Collider, tag/rescue, gerak, AI, parkour,
  sungai, dan skill tidak berubah. Atlas tidak dibangun ulang.

### Animasi Jago

- Jago Tim Merah memakai koleksi visual baru untuk idle, lari depan, lari
  samping, lari belakang, serta parkour depan/samping/belakang. Strip samping
  sumber menghadap kanan: gerak kanan memakai frame asli dan gerak kiri memakai
  frame yang dimirror.
- Pose tertangkap di penjara, menang, dan kalah memakai frame khusus dari sumber
  pengguna, bukan frame gerak generik.
- Aksi tag dan rescue tetap tersedia memakai frame Jago baru agar mekanik lama
  tidak berubah.
- Cache runtime Jago memakai revisi aset 10; karakter lain tetap pada revisi 9.

## Anggaran verifikasi

Pilih pemeriksaan paling kecil yang cukup untuk perubahan tersebut.

### Perubahan map atau collider saja

1. `npm run fields:build`
2. `npm run audit`
3. `npm run build:pages`

Jangan menjalankan `sprites:build` jika sumber sprite, animasi karakter, portrait, dan VFX tidak berubah.

### Perubahan UI saja

1. Jalankan generator UI hanya jika sumber aset UI berubah: `npm run ui:build`.
2. `npm run build:pages`

### Perubahan sprite atau animasi karakter

1. `npm run sprites:build`
2. `npm run audit`
3. Build runtime yang relevan.

### Rilis penuh atau perubahan lintas sistem

Gunakan `npm run verify` hanya ketika perubahan menyentuh beberapa subsistem atau pengguna secara khusus meminta audit penuh. Perintah ini membangun ulang UI, field, seluruh sprite/VFX, audit, runtime, dan GitHub Pages sehingga jauh lebih lambat.

Baseline hanya boleh diperbarui setelah perubahan aset memang disengaja dan sudah diperiksa. Jangan menggunakan pembaruan baseline untuk menyembunyikan regresi.

## Deployment

- Branch publik: `main`.
- Remote GitHub: `github` → `https://github.com/lengkongandreuw/bentengan-squad-tag.git`.
- GitHub Actions menjalankan `.github/workflows/pages.yml` pada push ke `main`.
- URL publik: <https://lengkongandreuw.github.io/bentengan-squad-tag/>.
- Konfigurasi Sites tersimpan di `.openai/hosting.json`, tetapi publikasi ke Sites adalah tujuan terpisah dari GitHub Pages.
- Setiap implementasi yang selesai dan lolos pemeriksaan harus langsung di-commit, di-push ke remote `github` branch `main`, dan ditunggu sampai workflow GitHub Pages selesai.
- Jangan publish hanya jika task aktif secara eksplisit mengatakan `jangan publish`, atau jika task hanya meminta diskusi/inspeksi tanpa perubahan implementasi.

## Batas perubahan default

Jika task hanya menyebut satu map atau satu fitur:

- Jangan mengubah map atau fitur lain.
- Jangan membangun ulang sprite atau audio yang tidak terkait.
- Jangan mengganti aset final dengan versi lama dari percakapan.
- Jangan menambah bangunan atau collider di luar referensi tanpa kebutuhan gameplay yang jelas.
- Jangan melakukan full audit berulang kali; kumpulkan perubahan lalu validasi satu kali, dan ulangi hanya jika ada kegagalan nyata.

## Kapan harus bertanya

Tanyakan hanya jika informasi yang hilang akan mengubah hasil secara material, misalnya aset mana yang final, apakah bangunan tertentu memiliki collider, atau apakah publikasi eksternal diizinkan. Untuk detail kecil yang aman dan mudah dibalik, gunakan keputusan terbaik lalu laporkan asumsi tersebut.

## Refactor bentengan-squad-tag (berjalan, branch `Refactor-Clio`)

- Alur kerja per seam: analisis → approval → 1 seam → direct test + 4 suite
  R1 + `tsc` + `lint` + `audit` + `build:pages` (+ in-match bila runtime) →
  catat CHECKPOINT (+ revert note) → baru analisis seam berikut. Jangan
  mengganti approved seam yang sedang berjalan dengan kandidat baru; kandidat
  baru dicatat sebagai backlog.
- Arah Design G (loop-back L1): lifecycle = peta analisis, bukan pindah tiga
  region; strangler seam sempit; `game-core/` hanya orkestrasi runtime (tanpa
  rules gameplay); tanpa god object publik; modul final terima input/output
  domain sempit.
- Q2 freeze: angka ultimate Kaka/Raja dipindah verbatim, tanpa tuning. Tuning
  butuh sign-off eksplisit terpisah.
- Selesai tervalidasi: G0 safety net; G1 storage/audio-port/workshop-screen;
  G2 map-data + character JSON; G3 awal: loop driver (`match-runtime.ts`),
  `chargeUltimateMeter` (P1.1), stats-store (P1.2), `layoutPrisons`,
  `pushMatchEvent` → `match-state.ts` (2026-10-05; 8/8 verifikasi backlog
  PASS; revert = hapus modul + test, kembalikan body 17 baris).
- Selesai tervalidasi (2026-10-05): `roundedOn` → `modules/ui/canvas-shapes.ts`
  (murni, 0 deps, 6 situs; revert = hapus modul + test, kembalikan def 11
  baris). Prototype 6024 → 6014. Gates: tsc bersih, lint 119 (= baseline),
  audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-05): `boardRows` → `bars-score.ts` (+`BoardRow`
  types; pure filter+projection, 2 situs; revert = hapus blok + test,
  kembalikan def 16 baris). Prototype 6014 → 5999. Gates: tsc bersih
  (setelah `BoardRow=Omit<facet,'team'>`), lint 119, audit 21 pre-existing,
  build PASS.
- Selesai tervalidasi (2026-10-05): `formatTime` + `statPercent` →
  `modules/ui/format.ts` (murni, 8 situs; revert = hapus modul + test,
  kembalikan 2 def). Prototype 5999 → 5994. Gates: tsc bersih, lint 119,
  audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-05): `hitsObstacle` →
  `modules/gameplay/collision-navigation.ts` (+`ObstacleWorld`; murni
  two-source OR, 5 situs via 1 objek dunia bersama; revert = hapus blok +
  test, kembalikan def 4 baris). Prototype 5994 → 5996 (+2: objek eksplisit
  lebih mahal dari def yang dihapus — biaya jujur kontrak eksplisit).
  Gates: tsc bersih, lint 119, audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-05): `spacingPositionAllowed` →
  `collision-navigation.ts` (+`SpacingWorld`; predikat 3-guard murni, 2 situs
  via `spacingWorldFor`; revert = hapus blok + test, kembalikan def 13
  baris). Prototype 5996 → 6006 (+10: konstruksi dunia eksplisit). Gates:
  tsc bersih (setelah facet dipangkas lalu x/y dikembalikan untuk read
  fort-core), lint 120 (drift pre-existing terverifikasi, 0 di file seam),
  audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-05): `drawPrisonOverlays` → `draw-base.ts`
  (+`PrisonAssets`; loop overlay murni, 1 situs; revert = hapus blok + test,
  kembalikan def 16 baris). Prototype 6006 → 5994. Gates: tsc bersih
  (setelah param opsional dipindah terakhir), lint 119, audit 21
  pre-existing (setelah 1 asersi audit di-repoint ke lokasi baru —
  cek sama, lokasi baru), build PASS.
- Selesai tervalidasi (2026-10-05): `baseVector` → `collision-navigation.ts`
  (murni 4 baris, 3 situs via forwarder 1 baris; revert = hapus blok + test,
  kembalikan def 4 baris). Prototype 5994 → 5991. Gates: tsc bersih, lint
  119, audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-05): tim/faksi/roster tables →
  `modules/world/team-tables.ts` (7 helpers config-derived; ~25 situs tak
  berubah teks; revert = hapus modul + test, kembalikan blok 7 def).
  Prototype 5991 → 5971. Gates: tsc bersih (setelah JSON import attribute),
  lint 119, audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-05): `findParkourLanding` →
  `collision-navigation.ts` (+`ParkourProbe`; probe murni 2-predikat, 1 situs;
  revert = hapus blok + test, kembalikan def 31 baris). Prototype 5971 →
  5952. Gates: tsc bersih, lint 119, audit 21 pre-existing (setelah 1 asersi
  audit di-repoint — cek sama, lokasi baru), build PASS.
- Selesai tervalidasi (2026-10-05): `blocked` → `collision-navigation.ts`
  (+`BlockedWorld`; predikat 6-guard murni, 5 situs via 1 `blockedWorld`;
  revert = hapus blok + test, kembalikan def 40 baris). Prototype 5952 →
  5934. Gates: tsc bersih, lint 119, audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-05): `move` → `collision-navigation.ts`
  (+`MoveWorld`; stepper 2-sumbu murni, 4 situs via adapter tipis; revert =
  hapus blok + test, kembalikan def 24 baris). Prototype 5934 → 5925.
  Gates: tsc bersih, lint 119, audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-05): `directionIsTraversable` →
  `collision-navigation.ts` (+`TraverseProbe`; raycast murni 2-predikat, 3
  situs; revert = hapus blok + test, kembalikan def 19 baris). Prototype
  5925 → 5916. Gates: tsc bersih, lint 119, audit 21 pre-existing
  (setelah 1 asersi audit di-repoint — cek sama, lokasi baru), build PASS.
- P1.1 aktual: `chargeUltimateMeter(meter, controlled, id, amount)` murni di
  `modules/gameplay/bars-score.ts`; 2 situs tag/rescue; konstanta bonus 20/30
  beku; revert = kembalikan definisi lokal + 2 situs.
- Selesai tervalidasi (2026-10-06): `navigateAroundHazards` wrapper →
  `collision-navigation.ts` (`navigateAroundHazardsForPlayer` +
  `NavigationWorld`; import duplikat di-header dirapikan; adapter dunia
  eksplisit di situs panggil). Prototype 5916 → 5893. Gates: tsc bersih,
  lint 119, audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-06): `beep` → `modules/audio/audio-tone.ts`
  (`playTone` + `closeToneAudio`; AudioContext milik modul; 12 situs
  diganti; teardown panggil `closeToneAudio`). Prototype 5893 → 5874.
  Gates: tsc bersih, lint 119, audit 21 pre-existing, build PASS.
- Selesai tervalidasi (2026-10-06): `aiVector` →
  `modules/gameplay/ai-vector.ts` (file baru; `AiProfile` dimuluskan ke 4
  field yang dibaca fungsi; `PlayerFacet` subset struktural `Player`;
  body verbatim; 1 situs). Audit: 2 asersi di-repoint (kesulitan +
  navigasi AI — cek sama, pin pindah ke `ai-vector.ts`), 21 gagal
  pre-existing tetap. Test: `scripts/test-ai-vector.mjs` (8 cabang).
  Prototype 5874 → 5808 (−66). Gates: tsc bersih, lint 117 (≤119), audit
  21 pre-existing, build PASS. Revert = hapus `ai-vector.ts` +
  test-nya, pulihkan def lokal + import, revert 2 asersi audit.
- Batch otonom 2026-10-06 (keputusan pengguna): (1) modul UI terpisah
  `effects-log.ts`/`effects-particles.ts`, bukan gabungan; buat file hanya
  saat ekstraksi nyata. (2) `AiVectorWorld` kontrak paling sempit;
  `rescueRequest` nullable, jangan optional. (3) `TeamActionWorld` wajib
  callback sempit (`onComboCallout`, `onPlayerBoost`) untuk efek milik
  domain lain; mutasi langsung hanya untuk state milik subsistem itu
  sendiri. (4) capture/tagCheck/rescueCheck boleh dalam batch yang sama
  sebagai 3 seam terpisah; nilai ultimate Kaka/Raja hanya boleh
  dipindahkan verbatim (Q2 hard stop). (5) Setiap seam wajib direct test
  assert-based; audit bukan pengganti.
- Batch 2026-10-06 SELESAI (8 seam dibangun, 2 ditunda): `aiVector` →
  `ai-vector.ts`, `registerTeamAction` → `team-combo-actions.ts`,
  `capture` → `capture.ts`, `tagCheck` → `tag-check.ts`, `rescueCheck` →
  `rescue-check.ts`, `refillCheck` → `refill-check.ts`, `applyFallReset` →
  `fall-reset.ts`, `riverFallCheck` → `river-fall.ts`. Prototype 5808 →
  5661 (−147). Semua punya test direct sendiri; 6 asersi audit di-repoint
  (cek sama, lokasi baru — tidak pernah disembunyikan). Q2:
  `RAJA_ULTIMATE_TAG_BONUS=20` pindah verbatim ke `capture.ts`,
  `RAJA_ULTIMATE_RESCUE_BONUS=30` verbatim ke `rescue-check.ts`;
  `KANAL2_FALL_RESET_MS=3000` verbatim ke `river-fall.ts`. `riverFallCheck`
  memanggil `applyFallReset` modul langsung — forwarder lokal sudah
  dihapus (nol pemanggil). `onTeamAction(rescuer,...)` di rescue: cast
  `as Player` aman (objek Player asli). Batch record: CHECKPOINT 8 entri
  + entri batch; revert notes per seam.
- `log`/`burst` SELESAI di batch 2 (2026-10-06) dengan desain kontrak
  PURE berbeda dari yang pernah ditolak: `pushLog(logs, text) => string[]`
  (`effects-log.ts`) dan `burst(...) => Particle[]`
  (`effects-particles.ts`) — modul murni, mutasi tetap di forwarder
  prototype (`logs = pushLog(...)`, `particles.push(...)`); 14 situs
  burst + 18 situs log tidak berubah. Bila keputusan lama dianggap
  berlaku, revert dua file kecil ini saja.
- Batch 2 SELESAI (2026-10-06, 10 seam: 27-36): `burst` ->
  `effects-particles.ts`, `log` -> `effects-log.ts`, `baseCheck` ->
  `base-check.ts`, `resolvePlayerSpacing`+`spacingWorldFor` ->
  `collision-navigation.ts`, `makePlayer`/`makePlayers` -> `roster.ts`,
  `kanalPrisonWalls` -> `prison.ts`, `isWaterAt` -> `water.ts`
  (`createWaterAt`, pixels via getter karena load async), 
  `beginKanal2WaterFall` -> `water.ts`, `cacheWaterMask` ->
  `world/water-mask.ts` (`extractWaterMask` return-based), `applyExitOrder`
  -> `base-check.ts`. Prototype 5661 -> 5372 (-289). 10 test direct baru
  semua PASS; audit pins batch2 di-repoint: spacing, floorAsset, jitter
  (2 klausul), plus `test-audio-port.mjs` (situs pindah ke rumah modul
  sebagai literal `onAudio(...)`; 9 referensi prototype = 6 direct + 3
  forwarder). `tieHash`/`Obstacle`/`studioWaterAt`/`TEAM_FOR_FACTION`
  import dibersihkan setelah kepindahan.
- Batch 3 SELESAI (2026-10-06, 10 seam: 37-46): P1 finish (`stepParticles`,
  `updateCaptureHold`) + P2 render (`field-assets.ts` blitters+anim,
  `draw-refill`, `ground-tiles`, `collider-debug`, `static-map-layer.ts`
  −262 baris, `draw-kanal-water`, `draw-nearby-details`). Prototype 5372 →
  4806 (−566). Total dari awal: 8570 → 4806 (−44%). 10 test direct baru.
  5 audit pin di-repoint (STATIC_MAP_SCALE/cache/scenery, radius/overview,
  hidden/underlay). `ctx` di root itu `let` (di-swap saat pre-render
  player) — factory yang baca ctx per-frame pakai getter `getContext()`;
  yang cuma dipakai top-level draw boleh capture nilai. import lib chain
  (map-studio.ts → characters extensionless) membuat test gagal load →
  inject fungsi lib (`drawMapTerrain`, `drawMapObject`) sebagai world param
  (type-only import OK, runtime import tidak).
- Batch 4 SELESAI (2026-10-06, 3 seam: 47-49; draw() SISA KEMBALI KE
  DESIGN): inline forwarder `drawPrisonOverlays` (−5); `drawPlayer` (468
  baris) → `modules/ui/draw-player.ts` (factory16 field: getter live
  `getContext`/phase/meters/teamCombos, 4 image-getter callback,
  `studioResolve` di-inject via type-only import agar rantai lib tidak
  ikut load; `spriteFrame` pindah verbatim; ekstraksi via skrip
  substitusi sistematis bukan salin-tangan;7 audit pin di-repoint)
  (−478); camera/view/letterbox `draw()` → `modules/ui/frame-view.ts`
  (`computeFrameView`,9 input sempit, `setView` callback untuk assignment
  `view` root, `clamp` di-import bukan diulang) (−24). Prototype 4806 →
  4304. Sisa `draw()` (135 baris) DITOLAK diekstrak dengan bukti:
  38 dependensi + mutasi root state di dalam badan (`ctx = target/previous`
  saat pre-render 3D, `paused=`, `scene3d=`, setState React) → melewati
  ambang ~28 binding dan lintas domain (canvas/React/scene3d/input/match
  display) → kembali ke Design sesuai Option B.5 pengguna. Kandidat
  sub-slice untuk Design: blok scene3d, world-layer pass, edge markers,
  phase dim.
- PENTING INCIDENT + POLA SPLICE (2026-10-06): splice berbasis marker
  HAPUS 1.130 baris karena marker `const { drawFieldAsset...` terjadi 2×
  (findIndex ambil yang pertama). Pemulihan dari snapshot opencode:
  `~/.local/share/opencode/snapshot/<repo>/<session>/objects/` (format git
  loose object: zlib(`blob <size>\0<content>`) — WAJIB strip header + cek
  ukuran). Simpan salinan ke %TEMP% segera. POLA WAJIB ke depan: hitung
  jumlah kemunculan marker dulu, `assert(hits.length === N)` SEBELUM
  splice; jangan pernah pakai findIndex pada marker non-unik.
- PENTING suite: `test-kampung3d.mjs` dan `test-kanal2-layout.mjs` gagal
  SEJAK HEAD (dibuktikan: slice `const DESIGN_W =` kosong di HEAD;
  `kanalGuide` sudah di guide-fields.ts di HEAD) = 2 kegagalan map-suite
  pre-existing; jangan biarkan ini terbaca sebagai regresi batch. Semua
  51 test file lain PASS. `npm run audit` chain berhenti di kampung3d
  (&& ) — hitung kegagalan audit-game saja untuk gate.
- Diundur dengan alasan: `winRound`/`resetRound`/`buildStatsBoard`/
  `addMatchEvent` -> P3 (plan: buildStatsBoard "stays for P3"; winRound
  sentuh ~10 state closure); `playUiTone`/`playUiSample` -> `uiAudio`
  dipakai guard hover (coupled); key handlers -> P4 (urutan terkunci);
  draw helpers -> P2; `prepare()` -> P6.
- Backlog kandidat batch berikut: `stepParticles` (ekor fisika
  effects-particles), `staticMapScale`/`invalidateStaticMap` (P2),
  akumulator `allHeld` capture-win (perlu coupling winRound), P3
  snapshot/write, lalu urutan P2-P6 sesuai plan.
- Baseline verifikasi: `tsc` bersih, lint 119, audit 21 gagal pre-existing
  (7 game + 14 metadata sprite; file di luar diff, isu asset-pipeline),
  `build:pages` PASS. Jangan sentuh baseline untuk menutupi regresi.
- Pengguna yang merge ke `main`; asisten tidak pernah merge/push ke `main`.
- Shell default pwsh 7.6.6; dilarang `npm run format` telanjang (pernah
  memformat 316 file; sudah di-revert).
- Aturan import modul/test Node (2026-10-06): JANGAN runtime-import path lib
  tanpa ekstensi (`lib/field-assets.generated`, `lib/audio-settings`,
  `lib/map-studio`) — gagal `ERR_MODULE_NOT_FOUND` pada
  `node --experimental-strip-types`. Selalu pakai ekstensi `.ts` eksplisit
  (`lib/characters.ts` terbukti loadable via `roster.ts`) atau inject
  dependency sebagai parameter (pola `UiAssetSources`/resolver).
  `import type` selalu aman (terhapus saat load). `lib/characters.ts`
  runtime juga menarik `react`/`lucide-react` — hindari bila modul harus
  ringan; `CHARACTER_VOICE_FILES`-style table + injected resolver adalah
  pola default untuk kasus itu.

## Naming rules refactor (2026-10-06, berlaku untuk semua seam tersisa)

Berlaku SAAT INI tanpa batch rename kosmetik — hanya dipakai ketika membuat
atau memodifikasi module. Rename dicatat di CHECKPOINT.md + memori.md.

- Folder top-level tetap: `audio`, `game-core`, `gameplay`, `storage`, `ui`,
  `world`. Tanpa subfolder baru kecuali folder datar benar-benar membingungkan.
- Nama: bahasa domain sehari-hari, file = responsibility yang dimiliki,
  istilah game > detail implementasi; hindari nama ambigu (`base.ts`,
  `water.ts`, `format.ts`, `roster.ts`, `effects.ts`, `util.ts`, `helpers.ts`).
- Jangan pakai akhiran `*-check.ts` bila file berisi transisi state, mutasi,
  side effects, atau orkestrasi — pakai `*-rules.ts` / `*-control.ts` /
  `*-actions.ts` / `*-layout.ts` / nama domain langsung.
- Jangan membuat `effects.ts` gabungan; log dan particle tetap terpisah
  (`arena-effects-log.ts`, `arena-particles.ts`).
- Rename HANYA bila: (a) file sedang disentuh seam aktif, (b) pindah ke owner
  final, (c) nama menyebabkan kesalahan ownership/import nyata, (d) nama
  materially salah melaporkan responsibility. Jangan rename hanya karena
  terdengar lebih bagus. Jangan campur rename kosmetik dengan ekstraksi
  gameplay yang tak terkait. Pertahankan behavior/exports/imports/test paths.
- Validasi setiap rename: direct test modul + R1 + `npx tsc --noEmit` +
  `npm run lint` + `npm run audit` + `npm run build:pages` (+ verifikasi
  in-match/browser bila menyentuh render).
- `collision-navigation.ts` JANGAN di-rename otomatis; `format.ts` hanya
  setelah responsibility-nya diinspeksi.
- Output wajib di akhir tiap batch: file yang di-rename (old/new/reason/
  perubahan exports/validasi), nama ambigu yang ditunda, mismatch ownership.
- Nama yang berhasil hanya bila cocok dengan responsibility nyata — refactor
  TIDAK dianggap lebih baik hanya karena file berganti nama.

## Perilaku autonomous refactor (2026-10-06)

Per seam: analisis seam+dependensi langsung → 1 seam reversible → direct test
+ karakterisasi → semua gate → verifikasi in-match/browser bila perlu →
update CHECKPOINT/memori → lanjut. Tanpa izin per seam biasa.

DILARANG: global event bus; storage backend kedua tanpa kebutuhan nyata;
global singleton; public runtime god object; framework DI; layer utility
generik spekulatif; dependency runtime baru; repo split/monorepo.

STOP + minta keputusan hanya bila: mengubah gameplay/balance/aset/map/UI-UX;
mengubah nilai ultimate Kaka/Raja (Q2); bertentangan Design G/amandemen L1;
cross-domain move luas; keputusan arsitektur baru; membuat `prototype.tsx`
atau module lain jadi god module; mengubah arah ownership/dependency yang
disetujui; gagal validasi di luar seam aktif; operasi Git tak diminta.

Target akhir: kode modular yang sehat — bukan sekadar angka baris rendah
atau banyak file ganti nama. `prototype.tsx` = composition/wiring saja;
selesaikan G3, R10 (tanpa game rules di `lib/`), R11 (`components/`+`hooks/`
→ screens `modules/ui/`), lalu G4 verify vs baseline G0.

G4 FORMAL + PUSH (2026-10-06): tabel §17 di Review Plan.MD diisi hasil
re-score terukur (teks plan utuh, hasil di-append bertanggal). Commit
`d7f77b8` di branch `Refactor-Clio` (242 file, +24325/−12114; scan
secret/junk bersih, tsc 0) lalu `git push origin Refactor-Clio` sukses
(210a404→d7f77b8). TIDAK merge ke main (tunda per user). CATATAN:
remote aktual bernama `origin`, bukan `github` seperti tertulis di
AGENTS.md (URL sama); AGENTS.md tidak disentuh (frozen) — push
berikutnya pakai `origin`.

G4-PRECURSOR (2026-10-06): metrik vs baseline G0 (e0c5921) — tsc 0=sama,
lint 122→110 (−12), audit gagal 8→21 (7 persist + roster-sync DIPERBAIKI
+14 sprite-metadata pre-existing tersingkap oleh fix G2 — disclosure,
bukan regresi), build PASS, test 4 suite→90 file/88 PASS, prototype
8570→2567 (−70%), R10 7→0 file rules di lib, R11 2→0 orphan dir,
R6 `characterId ===` 12→0. 7 safeguards pasca-G3 SEMUA LULUS (S5
parsial — lihat variance). §17: 6 PASS, 2 REMOVED-DEFERRED, 2
DEFERRED/PENDING, 1 VARIANCE. VARIANCE 500-line: ownership komposisi
TERBUKTI; sisa 2567 = wiring/effects/tick-shell + 2 blok Design-
excluded (phase-gate, draw()) + navigate — 500 TETAP target bukan
gate (amendmen 1); tanpa splitting kosmetik; kejar 500 butuh ruling
Design untuk 3 blok itu.

Batch 16 SELESAI (2026-10-06): **R10 + R11 tuntas dengan bukti.**
R10: 7 file rule-bearing pindah dari lib/ (field-cycle→match-control,
tag-contact→tag-check, team-combo→gameplay/team-combo.ts,
click-navigation→gameplay/, collision-navigation.js→merge module,
kanal-footprints→world/, gameplay-audio→audio/) — sprite-motion +
character-animation TETAP di lib (data/mapping, bukan rules). Proof:
7 path hilang + nol residual import. R11: components/ DAN hooks/ TIDAK
ADA LAGI — leaf4 → modules/ui/, player-profile/ → modules/ui/, 61
primitif → modules/ui/primitives/ (alias @/components/ui/* →
@/modules/ui/primitives/*), use-mobile → modules/ui/. Depth fix
wajib saat pindah 1 tingkat: components/X → modules/ui/X = '../lib'
harus jadi '../../lib' (parent chain berbeda!). package.json: audit
chain + test:map-studio + admin:maps kini pakai
--experimental-strip-types (Node 22.13 min). Kesimpulan: audit 21,
lint 110, tsc 0, sweep 88/90, build PASS, browser nol error.
PRE-EXISTING ditemukan: test:map-studio 2 gagal sejak G2 (templates()
men-slice `const DESIGN_W =` dari prototype yang sudah pindah) —
backlog terpisah, jangan dikaitkan batch ini.

Batch 15 SELESAI (2026-10-06): 5 chrome menu → `modules/ui/`
(asset-loading-screen, menu-actions-row, back-button,
profile-trigger-button, workshop-link). Prototype 2608 → 2571 (−37).
Browser sweep all-green nol error (loading screen terlihat live saat
start, actions row/back/profile/workshop berfungsi). Gates: tsc 0,
lint 110, audit 21 (0 pin tersentuh), sweep 88/90, build PASS.
INVENTARIS WIRING (penting): sisa prototype = state + effects +
factory wiring + navigate/draw excluded — wiring adalah TARGET G3
("composition and wiring only"), BUKAN cacat; jangan ekstraksi wiring.

Batch 14 SELESAI (2026-10-06): 6 layar menu/result → `modules/ui/`
(round-result-announcement, splash, team, rules, field-select,
character-select 161 baris). Prototype 2748 → 2608 (−140). Browser
sweep menu-flow all-green nol error (carousel cycle RAJA→ROBOT, swap
tim, ULT badge, 3 stat bar, step + start wiring). Gates: tsc 0, lint
110 (prune import mati incl. opponentSquad peninggalan dead-JSX B9),
audit 21 (2 pin repoint), sweep 88/90, build PASS. Aturan: string aset
sensitif pin (logo) diinjeksi via props agar pin tak patah — JANGAN
tulis raw string di komponen.

Batch 13 SELESAI (2026-10-06): 14 widget HUD diekstrak ke `modules/ui/`
(renderer-error, status-ribbon, combo-callout, control-ribbon, camera,
boost-stack, ultimate-meter-hud, character-hud, ultimate-banner,
prisoner-notice, active-objective, team-combo-hud, mobile-controls,
action-dock). Prototype 2960 → 2748 (−212). Browser sweep desktop +
mobile all-green nol error: semua widget render, prisoner notice muncul
alami + tombol rescue berfungsi, touch dpad 4 + aksi 3. Gates: tsc 0,
lint 110 (prune ikon mati), audit 21 (5 klausa repoint), sweep 88/90,
build PASS. Aturan pin audit: `disabled={playerMechanicsLocked}`
sekarang dicocokkan di mobile-controls (prop dinamai sama persis);
submenu: jangan normalisasi template `${selectedFaction}` ("null"
verbatim). Sisa shell: menu return + character-select + wiring canvas.

Batch 12 SELESAI (2026-10-06): 4 komponen playing-shell — `arena-intel`
(DEDUPE: blok kembar ×2 jadi 1 komponen + className override),
`stage-hud`, `playing-topbar`, `pause-overlay`. Prototype 3078 → 2960
(−118). Browser sweep all-green nol error (topbar, stage-hud click→
stats, intel 2 instance, pause buka/tutup). Gates: tsc 0, lint 117,
audit 21 (3 klausa pin repoint: arena-intel, pause-overlay, Keluar ke
menu), sweep 88/90, build PASS. Pola: guard di owner, callback sempit,
AudioSettings onOpen ≠ profile open (keys-clear saja — jangan disatukan).

Batch 11 SELESAI (2026-10-06): 5 layar menu/result diekstrak ke
`modules/ui/` — `round-result-announcement`, `splash-screen`,
`team-screen`, `rules-overlay`, `field-select-screen`. Prototype
3256 → 3078 (−178). Semua diverifikasi browser Playwright (splash/
rules/team/field flow penuh sampai in-match, carousel step + start
wiring teruji, nol error); round-result card structural-only (trigger
butuh ronde selesai — dinyatakan). Gates: tsc 0, lint 117, audit 21
(1 pin repoint: `Ultimate Raja dan Kaka` → rules-overlay), sweep 88/90,
build PASS. Pola konsisten: guard di owner, state/callback diinjeksi,
string aset sensitif pin (logo) tetap di prototype via props.

Batch 10 SELESAI (2026-10-06): 3 komponen layar JSX diekstrak ke
`modules/ui/` — `match-event-feed.tsx`, `round-stats-overlay.tsx`,
`mission-panel.tsx` — masing-masing diverifikasi browser Playwright
(toast tag live dari aksi bot; leaderboard hold-Tab buka/tutup;
mission panel play-branch 5 member + close). Prototype 3551 → 3256.
Gates: tsc 0, lint 117 (di bawah baseline setelah pembersihan import
mati), audit 21 (2 pin repoint), sweep 88/90, build PASS, nol error
browser. Verifikasi JSX = gates + Playwright (bukan node test — JSX
tidak bisa load di strip-types).

Batch 9 SELESAI (2026-10-06): hapus dead-JSX `{false && …}` (−219 baris,
splice ber-assert kemunculan marker unik + copy ke %TEMP%) + 4 seam P1:
`tickUltimateMeter`+`beginUltimateCast`, `tryParkourJump`, `stepBots`,
`stepBoost`. RENAME pertama & tercatat: `ai-vector.ts` → `ai-movement.ts`
(file kini punya vector decisions + bot stepping; exports `aiVector` tetap,
test file name dipertahankan, 3 importer diupdate: prototype/audit/test).
Prototype 3846 → 3551 (−295). Gate live: tsc 0, lint 119, audit 21 (3 pin
di-repoint), sweep 88/90 (2 pre-existing), build PASS. R10 survey: inventory
7+ file `lib/` berisi game rules + tujuan modul ada di CHECKPOINT Batch 9 —
dieksekusi batch khusus setelah Batch 10 (JSX screens + Playwright).

Ponytail review fixes (2026-10-08, uncommitted): tag-combat 3 pola kompak
dipulihkan agar literal-assert test-flight-ultimate lolos (perilaku sama,
test tak diubah); persist() profile-service kini throw saat save gagal
dengan window ada (konvensi recordMatchProgression), tanpa notify sukses
palsu. Test baru di test-economy-wallet (sukses notify sekali, blocked
throw + nol event + storage utuh). Gates: flight 5/6 (sisa pre-existing
playerMovementLocked), economy 23/26 + test baru pass, game-core 40/40,
tsc 0. Tanpa commit/push/deploy; origin/main utuh.

Crash-safety + dead-code slice (2026-10-08, uncommitted on Refactor-Clio):
panel try/catch + inline role=alert (picker stays open on failure) +
`.profile-selection-error` style; `GameErrorBoundary` baru di
`modules/ui/error-boundary.tsx` dipasang di `github-pages/main.tsx`
(fallback `.renderer-error`, COBA LAGI/MUAT ULANG); `createWinRound` +
`WinRoundWorld` dihapus (−121 baris, live site = prototype winRound);
`distance`/`other`/`clamp` didedupe ke `lib/math.ts`; 2 pin audio-port
di-repoint ke prototype. Gates: tsc 0, game-core 40/40, service test baru
pass. Pre-existing (stale rescueEffects pin, wallet components/ path, flight
test 6) dibuktikan sama di HEAD via stash. Panel UI test tidak ditambah
(harness vm tak muat portal+document+CSS+JSON-with; service path covered).
Manual browser verify pending. Tanpa commit/push/deploy.
