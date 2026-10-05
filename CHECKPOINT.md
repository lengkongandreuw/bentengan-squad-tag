# Bentengan Squad Tag — Checkpoint Pekerjaan

Dokumen ini menyimpan kondisi task yang sedang berjalan. Perbarui setelah setiap
tahap penting agar pekerjaan dapat dilanjutkan tanpa membaca ulang percakapan.

## Status

### COMPLETE — Publish lossless runtime optimization (2026-10-05, PUBLISHED)

- User explicitly requested publish. Fresh fetch confirmed HEAD==github/main
  e508b11; other contributor branch Refactor-Clio fetched but not merged/modified.
  Only scoped optimization files and generated runtime assets will be committed.
- Prior LOCAL ONLY optimization note below is superseded for this publish.
  Commit065bdf5 pushed non-force e508b11->065bdf5. TypeScript/100 tests PASS.
  GitHub Pages run37280025918 build/deploy completed SUCCESS. Original Studio
  assets/config and map config unchanged; other contributor branch untouched.

### COMPLETE — Lossless custom sprite runtime optimization (2026-10-05, LOCAL ONLY)

- User authorized optimization without changing visual quality/gameplay. Added
  separate runtime atlases: trim transparent margins, pack with 2px sampling
  gutters, lossless WebP. Original Sprite Studio assets/config remain unchanged.
- 47 atlases / 1,213 unique frame rectangles: theoretical decoded RGBA area
  731.8 -> 392.8 MiB (-46.3%). Compressed bytes only 31.05 -> 30.51 MiB;
  principal benefit is texture area, NOT a claim of equivalent FPS improvement
  or measured device RAM. Only active-lineup resources preload as before.
- Original logical frame sizes/pivots/scale/FPS/order/loop/mirroring preserved;
  draw offsets compensate trims. Runtime mappings and flight clip views cache;
  per-actor visual state reused rather than allocated every frame.
- New/stale editor assets or unmapped frames automatically use originals.
  npm run sprites:runtime regenerates; build:pages runs it automatically.
- 96 existing regression tests plus 4 new tests PASS; visible RGB/alpha checked
  across EVERY packed source frame, synthetic partial-alpha/empty frames tested,
  actual resolver flight timing checked. TypeScript/focused lint/Pages build PASS.
  Existing CSS/chunk build warnings remain. Full legacy audit not claimed green.
- No publish, balancing/control/physics/map/editor mutations. Browser/FPS and
  filtered rendering on actual hardware still need testing; no browser QA claim.

### COMPLETE — Ultimate roster label artwork (2026-10-05, PUBLISHED)

- Supplied ultimate_label.png copied to controls/ultimate-label.png and preloaded.
  Replaced old pill for all existing Ultimate IDs Raja/Kaka/Bebe/Ciici. Label is
  left shoulder-height behind portrait (z1 artwork,z2 portrait,z3 name),allowing
  a small occlusion at the right edge while keeping text primarily outside it.
  Responsive sizing follows character card; existing unlock styling preserved.
- No gameplay/preview manifest edits. TypeScript checked; no visual browser QA.
  User subsequently requested publish: commit f4c8737 pushed non-force,Pages
  run37257613234 completed SUCCESS. TypeScript/Pages build passed.

### COMPLETE — Publish all local updates (2026-10-05)

- User explicitly authorizes publishing all local changes. Fetched github/main:
  HEAD and remote identical c742c25,no contributor commits to merge at this check.
- Includes economy01–13/DOI UI,centered Ultimate panel,Back art,removed in-game
  Workshop entry,and saved Map/Sprite Studio configurations+Bebe/Ciici assets.
  All referenced Studio assets exist. Preserve separate editor sources.
-96 regression tests,TypeScript and production Pages build passed before commit.
  Implementation commit9adf32c pushed normally c742c25→9adf32c,no force/overwrite.
- Earlier LOCAL ONLY/no-publish notes are historical and superseded by this
  explicit request. Pages run37249937717 confirmed completed/success via GitHub.
  Site:https://lengkongandreuw.github.io/bentengan-squad-tag/
  No manual live-browser visual QA claimed; existing CSS/chunk warnings remain.

### COMPLETE — Center Ultimate upgrade modal (2026-10-05, LOCAL ONLY)

- Explicit fixed inset0/auto margins/fit-content height center the skill upgrade
  panel horizontally and vertically. Existing viewport limit/scroll retained.
- No purchase,content or asset changes; no publish.

### COMPLETE — Remove in-game Character Workshop entry (2026-10-05, LOCAL ONLY)

- Removed Workshop button,component import and workshop screen state/branch from
  app/prototype.tsx. Game navigation remains; local editor files/assets preserved.
- TypeScript checked. No publish.

### COMPLETE — DOI branding + Ultimate panel artwork (2026-10-05, LOCAL ONLY)

- Currency display label is now DOI via config/economy.json. Internal id token,
  tokenBalance,transaction history and upgrade state unchanged for compatibility.
  Wallet/profile/selection/result/confirmation/failure messages use DOI.
- Supplied original PNGs copied to public/ui-v2/economy: doi-coin,label,close,
  accent. Ultimate modal restyled to reference: maroon card,overhanging graffiti
  title,level+coin row,two-column stats,purple action,art close with accessible
  label,yellow corner accent. Short/mobile viewport scrolls with stacked content.
  Existing native dialog/confirmation/purchase guards retained; artwork preloads.
-83 regression tests,TypeScript,focused UI lint and Pages build PASS (existing
  CSS/chunk warnings). Render/click harness used; browser tooling unavailable in
  this session,so no manual visual/mobile walkthrough claimed. No gameplay,
  balancing,Studio data or stored-wallet migration changes. No publish.

### COMPLETE — Back button artwork (2026-10-05, LOCAL ONLY)

- Replaced menu Back art with supplied back inactive.png and back button.png;
  separate public/ui-v2/controls/back-inactive.png and back-hover.png preserve
  original user files and avoid old UI generator overwriting these assets.
- Normal/hover+keyboard focus switch artwork; both preload,goBack unchanged.
  Square footprint72–100px desktop,68px mobile,72–96px map selector.
- No publish. TypeScript and asset dimensions checked; no browser visual QA.

### COMPLETE — Economy MODULE10–13 (2026-10-05, LOCAL ONLY)

- User supplied10–13 together: wallet/profile display, Raja/Kaka upgrade UI,
  result TOKEN breakdown and final regression/balance report. No publish.
- Preserve Studio drafts/assets; use existing profile event/service/result only.
-10: TokenWallet reads the existing wallet balance; visible on Profile and
  Character Selection. Existing saved-profile/storage events refresh it.
-11: native modal dialog for catalog-supported Raja/Kaka only; current/next
  duration,recharge,cast,Raja speed,cost,shortage,max state. Explicit confirmation
  shows cost/remaining balance. Unique quote ID,expected previous level,one-shot
  click guard and authoritative purchase service. Failed saves/stale quotes show
  feedback; no local UI debit. Escape closes modal; keyboard stays out of menu
  navigation. Scrollable small-screen dialog,44px button targets.
-12: result TOKEN total/breakdown/balance comes from existing ProgressionResult.
  Duplicate/incomplete result suppresses reward replay; loss completion visible.
-13 validation:83 tests PASS (25 economy,37 progression,6 flight,10 audio,5 Sprite
  Studio),TypeScript and focused new UI/economy test lint PASS,Pages build PASS
  with existing CSS/chunk warnings. Existing profile component lint and progression
  test unused-variable warnings remain out of scope. Actual component handler
  harness covers confirm/cancel/double click/failed save/stale quote/max/shortage;
  server-rendered UI covers labels/catalog/rewards. Runtime Ultimate harness from
 09 retained. No manual browser/mobile visual walkthrough performed.
- Balance unchanged: synthetic persisted service journey at18 TOKEN per match
  reaches Lv1/Lv2/Lv3 after7/23/52 cumulative matches for each character. Total
  cost920,earned936,remaining16. This is NOT observed player telemetry or an
  average reward claim. Real playtest average remains unmeasured; completed-match
  bounds10–26 (win) /10–21 (loss),depending on action rewards. No silent tuning.
- Files: components/token-wallet.tsx,ultimate-upgrade-panel.tsx,
  match-token-summary.tsx; profile panel,result summary,app/prototype.tsx,
  app/globals.css; economy tests and progression test TSX dependency loader.
- Studio manifests/user assets unchanged (map hash B2738BD2...539C615 retained).
  No new storage key/shop/backend. All economy01–13 still LOCAL ONLY;
  no commit,push or deploy. STOP at13.

### COMPLETE — Economy MODULE07–09 (2026-10-05, LOCAL ONLY)

-07 purchase module and service implemented: pure debit+level increment,
  duplicate/max/invalid/insufficient/stale-quote failures,save failure reported.
-08 frozen effective-stats resolver and snapshot helper implemented; unsupported
  has no invented config,invalid/missing levels use base. Existing catalog lookup
  renamed getUltimateUpgradeConfig; getUltimateUpgradeLevel now reads profile.
-09: Raja/Kaka runtime uses immutable match-start effective stats for recharge,
  cast, duration and Raja speed. Level0 parity, tag20/rescue30 bonuses and existing
  allied effect scope retained. Bots use base activation stats; Bebe/Ciici unchanged.
  Built-in/custom Ultimate frames follow cast progress without changing assets.
- Validation:22 economy,37 progression,6 flight,10 audio and5 Sprite Studio tests;
  TypeScript,focused lint,diff check and Pages build PASS (existing CSS warnings).
  Runtime smoke executes actual activation code through a harness,not a manual
  browser/game walkthrough. User editor manifests/assets preserved.
- No purchasing UI,no commit/push/publish. STOP before MODULE10.

### COMPLETE — Economy MODULE04–06 (2026-10-05, LOCAL ONLY)

- User supplied04–06 together. Reward integration uses existing incomplete/
  processedMatchIds guard; TOKEN+XP+stats+unlocks persisted once by existing service.
- Wallet migration on load recovers safe fields without retroactive grants;
  progression+economy migration share one write. Catalog Raja/Kaka config and
  independent upgrade state implemented; no purchasing or runtime modifiers/UI.
-04: match-token-rewards.ts config formula completion10/win5/tag capped5/
  rescue2 capped6 TOKEN. Safe BigInt multiplication; result carries tokenEarned,
  tokenBreakdown,previous/current balances. Ledger match:${matchId},referenceId;
  zero reward for duplicate/incomplete, existing processedMatchIds only. Wallet
  credit overflow/invalid raises before returning/saving any partial XP/stats.
-05: economy-migration.ts supplies zero wallet for missing data; malformed wallet
  preserves safe counters and valid unique recent ledger entries, never infers
  historical rewards or erases unrelated data. Storage loads raw data for repair,
  saves progression+economy migrations once; blocked writes keep source and
  return repaired memory state, retry next load. Valid wallets do not write.
-06: ultimate-upgrades.json Raja/Kaka Lv0–3,incremental120/280/520 costs;
  ultimate-upgrades.ts strict frozen catalog and independent version1 state,
  default Raja/Kaka0,missing levels0,unsupported returnsnull. New profile defaults
  and profile parser roundtrip; no purchase/runtime modifiers/UI. Base runtime
 45s,3200/3600ms cast,5000ms duration,Raja1.4 unchanged and regression checked.
- Files: config/ultimate-upgrades.json; lib/player-profile/match-token-rewards.ts,
  economy-migration.ts,ultimate-upgrades.ts,match-progression.ts,storage.ts,
  types.ts,migrations.ts,profile-service.ts,index.ts; scripts/test-economy-wallet.mjs;
  CHECKPOINT.md,memori.md. Modules01–03 still local and preserved.
- Validation:53 tests PASS (16 economy+37 progression),npx tsc --noEmit PASS,
  scoped oxlint/diff check PASS,npm run build:pages PASS. Existing CSS/chunk-size
  warnings only. No browser visual test needed/performed: no UI change. No
  sprites/maps/audio rebuilt; user Studio drafts and Bebe/Ciici assets untouched.
- Next: STOP before07; request/spec needed. No commit/push/deploy per brief.
  Economy01–06 all LOCAL ONLY, despite earlier runtime optimizations published.

### COMPLETE — Economy MODULE02–03 (2026-10-05, LOCAL ONLY)

- User supplied01–03 together. Existing01 wallet retained;02 config/parser
  implemented;03 transaction operations validated. STOP before04.
- config/economy.json uses specified rewards/caps, latest50 transactions.
  economy-rules.ts strict safe-integer/version/currency/limit validation,
  frozen economyRules; malformed config throws, no balancing fallback.
- Parser ledger bound now uses central rules. No match integration, migration,
  storage writer, UI, upgrade state or gameplay changes. No publication allowed
  by active economic specs. User Map/Sprite Studio drafts left untouched.
- creditTokens/spendTokens/getTokenBalance return immutable profile results;
  positive input magnitude, signed ledger entries, safe integer overflow guards,
  insufficient_balance/duplicate/invalid no-op results. Legacy wallet missing/
  malformed remains untouched and write returns invalid until later migration.
  No storage/event access. Duplicate protection only retained transaction IDs;
  no second processed-match history. Omitted createdAt uses current ISO date;
  callers supply timestamp for deterministic replay.
- Files: config/economy.json, lib/player-profile/economy-rules.ts,economy.ts,
  scripts/test-economy-wallet.mjs, memori.md,CHECKPOINT.md. Existing01 integration
  files types/migrations/profile-service still LOCAL ONLY, not rebuilt/reset.
- Tests:10 economy +37 progression PASS; TypeScript and scoped lint PASS.
  No asset rebuild, no git commit/push/deploy. Config reward values10/5/1/5/2/6,
  ledger limit50 (parser accepts1–1000 explicit safety cap).
- Next action: user review; MODULE04 only after request/spec. Keep economy local
  until explicit publish. User editor drafts/uploads continue to be preserved.

### PUBLISHED — Runtime scheduling and full Flight immunity (2026-10-05)

-033af27: Bebe/Ciici cannot be tagged during takeoff/flying/landing, overrides
  historical flying-only notes below; tests/build/deploy37213590144 SUCCESS.
-c742c25: priority-queue A* exact route parity, FIFO one-AI-route/frame,
  closed scoreboard skips row rebuild, optional ?performance=1 instrumentation.
  Includes latest contributor carousel f3f7a7e without overwriting local drafts.
 29 tests/TS/build passed; Pages37215005019 SUCCESS and public commit verified.
  Route benchmark improved, actual game FPS not measured. No pixels/FPS reduced.

### PUBLISHED — Directional Flight + runtime efficiency (2026-10-04)

- User revision overrides original default-only spec: all3 flight actions now
  support default+8 optional directions for Bebe/Ciici only. Default/legacy
  fallbacks retained; one-shot timing and renderer resolve same phase direction.
- Editor/server JSON/Save/compile all accept directional keys, force correct
  loop modes. Capability list + useful old-server warning. User GIF rejected on
 4319 because running pre-Flight server;4331 old default-only Flight server.
  Confirmed via empty compile probe (no assets created); do not kill servers
  while user drafts/uploads are open. Save/restart npm run admin:sprites needed.
- Runtime broad-phase collider index retains exact rotated/polygon/mask/bridge/
  slow/jump tests. No global collider disable; tag LOS only after range/eligibility.
- Preload active10-character lineup only,release unused custom image references;
  map layer lists sorted once,offscreen objects culled by rotated visual bounds;
  terrain patterns cached by context. Original pixels/FPS/high smoothing unchanged.
- Tests:25 Flight/Studio/Map/performance,37 progression,10 audio PASS; TS,
  scoped lint and Pages build PASS. Benchmark1600 colliders/2000 queries ~99.64%
  fewer candidates; NOT an FPS measurement or proof of eliminating every lag.
- Preserve user config/map-studio.json,config/sprite-studio.json and untracked
  Bebe/Ciici atlases; Economy01 LOCAL ONLY. Implementation180e5d3 pushed;
  Pages37210568540 SUCCESS; public build-info matches180e5d3. Browser/FPS
  walkthrough not measured; API harness/benchmark/tests/build verified.

### PUBLISHED — Ultimate Flight Batch01 Bebe/Ciici (2026-10-04)

- Shared lib/flight-ultimate.js controller: complete takeoff sequence,4 seconds
  actual flight,complete landing sequence. Bebe speed1.25/turn0.85; Ciici1.20/1.15.
- Tag immunity only FLYING. All busy phases block tag/rescue/capture/pickup/
  boost/parkour; takeoff/landing vulnerable. Direction controls remain available
  in flight, including mouse/mobile. Low/parkour/water bypass only; structures,
  fort core and bounds stay solid. Nearest-safe-ground landing and reset cleanup.
- Uploaded icons copied unchanged to public/ui-v2/ultimate/bebe.png,ciici.png.
- Sprite Studio: three non-directional slots only Bebe/Ciici; forced one-shot/
  loop/one-shot, preview/FPS/pivot/crop, JSON metadata import/export, warnings.
- Canonical sequences NOT supplied yet: generic ultimate/idle compatibility
  fallback only. User local configs/assets preserved and not included in publish.
- Tests:11 Flight/Studio,37 progression,10 audio PASS; TS/build Pages PASS.
  Scoped publication excludes local-only Economy Module01 and user Studio drafts.
  Implementation d31316d; reliable one-shot desktop/mobile button fix7763061.
- Pages Actions37192971785 SUCCESS; public build-info commit7763061 confirmed.
  Both public PNGs match original SHA256; public hashed JS contains Flight states
  and both character ultimate names. User configs remain unchanged/unstaged.
- Browser QA used isolated profiles and static test builds; test-only fast recharge
  never committed. Observed Bebe takeoff/elevation and action lock. Full realtime
  flight/landing browser walkthrough not completed (background RAF throttling,
  then usage-limit approval review failure). Automated stage/4s/collision tests
  PASS. Do not describe this as a complete manual regression of every arena.

### COMPLETE — Economy MODULE01 Wallet Model (2026-10-04, LOCAL ONLY)

- Read economic system fase1/00-INDEX.md and01-ECONOMY-WALLET-MODEL.md.
  One active module only; explicit STOP/no publish applies to this feature.
- economy.ts supplies version1 PlayerEconomy, signed EconomyTransaction,
  independent default wallet0 and strict read-only parsers. Counters/amounts
  safe integers, nonnegative totals, nonempty IDs, valid date, credit/spend signs.
  Ledger validates every entry, retains latest50 without changing totals/input.
- LocalPlayerProfile.economy optional for legacy; new profiles default0 using
  existing profile service/storage key. Profile parser omits invalid economy
  without deleting identity/progression. No new migration/write-on-read added.
- Changed: lib/player-profile/economy.ts, types.ts, migrations.ts,
  profile-service.ts; scripts/test-economy-wallet.mjs; checkpoint/memori.
- Validation:4 wallet tests PASS (isolation/invalid data/bound/storage/update/
  legacy);37 progression tests PASS; TypeScript, scoped lint, diff check PASS.
  Test harness uses existing TypeScript, test-only Vite BASE_URL substitution;
  no dependency change. Initial esbuild/VM harness errors fixed, final tests pass.
- No rewards/spending/upgrades/UI/gameplay or retroactive grants. No publish,
  no asset rebuild. User map/sprite config and public/sprite-studio/bebe preserved.
- STOP after01. Next: MODULE02 Economy Rules Config only on next request.

### PUBLISHED — MODULE17 (2026-10-04)

- Implementation commit d1d15fdf7efdc16b3a5abf28aba0362b3beb7381 pushed to main.
- GitHub Pages Actions run37177521084 completed SUCCESS. Public build-info.json
  matches implementation commit and committed map revision; hashed JS serves
  PREVIEW AUDIO and all seven public PNGs match local/reference bytes exactly.
- Unrelated USER config/map-studio.json remains unstaged, unchanged SHA256
  b2738bd2c43d0396fc8a4b02222f39b2326e65ba1e715986c6ed6d31d539c615.
- No new public interactive browser test; prior local responsive/audio tests pass.

### Publication authorization — MODULE17 (2026-10-04)

- User now explicitly requests implementation on GitHub Pages, overriding the
  earlier brief's local-only STOP. Publish only reviewed audio UI/typography,
  seven runtime PNGs, original reference masters and relevant documentation.
- Exclude unrelated USER config/map-studio.json. No other contributor commits
  pending at preflight (HEAD and github/main aligned at187fe16).

### IMPLEMENTED — MODULE17 Audio Settings UI + typography (2026-10-04, LOCAL ONLY)

- Read full17-BENTENG-AUDIO-SETTINGS-UI-TYPOGRAPHY-CODEX.md. User requested
  implementation according to brief; its explicit final STOP/do-not-publish
  instruction applies. No commit/push/deployment in this turn.
- Seven supplied transparent PNGs copied unchanged to public/ui-v2/audio-settings/
  with normalized filenames; original masters remain asset-inbox/2026-10-04-audio-settings-ui/.
  No artwork cropping, recolor, generation or font binaries added.
- AudioSettings uses existing details trigger plus native dialog in body portal
  (avoids pregame transforms/overflow), header/card PNGs, reusable art sliders,
  SAVE/CANCEL and collapsed Preview Audio. Header Impact400, labels/values and
  buttons Poppins700; keyboard/pointer native ranges remain transparent above
  calibrated track. Fill clips without image stretching;0 hidden,100 complete.
- Live saveAudioLevels/events/storage remain unchanged; opening snapshots levels,
  SAVE retains values, CANCEL/Escape restores snapshot. Close stops music timer
  and GameplayAudio sources; late SFX unlock does not play after closing.
  Summary/dialog keyboard events isolated from gameplay; native modal focus.
- Controlled font variables + major H1 selectors, targeted explicit H2/paragraph
  overrides. Existing next/font/google method now loads Poppins; standalone Pages
  index loads same weights from official Google Fonts (network-dependent, sans
  fallback). Pages' old Impact/Arial override removed. No Bungee/Creato/benteng
  activated. app/layout.tsx + index.html + github-pages/pages.css required for
  actual entrypoint/font availability, not unrelated UI redesign.
- Browser dedicated local3008:0/100 visual state, Home/End/arrows, pointer50%,
  SAVE/reopen retention, CANCEL/Escape rollback, music preview state + SFX preview,
  console clean. Viewports1024x768,390x844,844x390 checked; mobile artwork keeps
  ratio, scrollable control/preview content and external button row; short screens
  whole panel scrolls within85dvh. Actual physical touchscreen not tested.
- TypeScript/targeted lint/Pages build +10 audio regression tests pass; pre-existing
  Tailwind/CSS and chunk-size build warnings only. No sprites/fields/ui generators.
- No edits to audio engine/settings storage, gameplay/progression/character data,
  sprites, editor code, arena config or audio files. USER config/map-studio.json
  remains local/unpublished; never include it in this feature's future commit.
- Preview http://127.0.0.1:3008/bentengan-squad-tag/ (Vite session15157).
  Browser screenshot .preview-admin/module17-audio-settings.png ignored/local.

### PREPARED — Sound Settings UI artwork (2026-10-04, LOCAL ONLY)

- User requested analysis/storage only for the next UI revision. No runtime
  implementation or publication authorized for this turn.
- Seven original PNGs copied byte-identically to
  asset-inbox/2026-10-04-audio-settings-ui/; README records dimensions, hashes,
  visual roles, existing audio behavior, responsive/accessibility constraints.
  Total1,285,988 bytes; all have transparency, black outlines must be retained.
- Header/card, secondary gray button, primary purple button, filled/empty
  slider and knob. Filled1742x238 vs empty1738x198 need track/anchor alignment,
  not direct100% stacking or horizontal stretch. Review export edge fragments
  before making future cropped runtime derivatives; masters unchanged.
- Existing live-save16% music /85% SFX,5s music preview, SFX selection/preview,
  cleanup/mute/gameplay event isolation must survive presentation changes.
- No game/map changes, no commit/push. Existing USER map config left untouched.

### IMPLEMENTED — Map Editor polygons, structures, dummy test and deployment readiness (2026-10-04)

- User requested visual empty colliders with more than4 nodes, dummy traversal,
  visible forts/prisons, and investigation of slow/missing published edits.
- Free polygon drawing and numbered node editor support3–64 points, midpoint
  insertion, drag/delete, undo; solid empty collider tools and self-intersection
  checks. Original existing map configs and art are preserved.
- Editor renders fort sprites, prison floor/overlay with editable gameplay
  markers and a visibility toggle. Dummy humanoid uses shared solid/parkour,
  slow/water/bridge predicates, world margins, movement substeps; WASD/arrows,
  jump/boost/reset controls and status. This is traversal/overlay testing,
  NOT a complete match/capture simulator.
- Saved/unsaved/disabled draft status is explicit. Publish waits for Pages Actions
  success AND public build-info commit/canonical map revision; push alone is no
  longer reported as deployed. Content-hashed bundles/CSS with legacy aliases
  avoid stable-filename cache; public result link has build query cache buster.
-10 Map Studio harness tests,37 progression tests and10 audio tests pass.
  TypeScript, targeted lint, Pages build checked; existing CSS/chunk warnings.
- Browser verifies existing Arena Benteng1 structures, dummy safe relocation,
  and arbitrary nodes beyond4 in an UNSAVED disposable browser draft. No saves,
  uploads, activations or actual map publication during browser tests.
- Dedicated updated local editor http://127.0.0.1:4330/ (old4320 process left
  untouched to preserve user's open work); normal start remains npm run admin:maps.
  Restart old server after saving work to use new module route/deployment backend.
- IMPORTANT: config/map-studio.json is pre-existing USER local work. Five edited
  builtins are disabled drafts; do not activate or include in this code commit.
  That file must remain modified locally, absent from this publication.
- Screenshot evidence .preview-admin/map-editor-dummy.png (ignored, not shipped).
- Published code d7f2f1e to github/main. Pages run37174063423 succeeded;
  public build-info commit and canonical map revision verified, hashed entry
  assets/app-mR9RvKaA.js responds200. Targeted lint/TS/Pages build pass, cache
  harness verifies aliases+hashed HTML+canonical metadata. Only remaining dirty
  file is USER config/map-studio.json (SHA256 b2738bd2c43d0396fc8a4b02222f39b2326e65ba1e715986c6ed6d31d539c615).

### COMPLETE — MODULE16 Custom SFX, validated and published (2026-10-04)

- User authorized implementation from16-BENTENG-CUSTOM-INGAME-SFX-CODEX.md,
  then explicitly requested continue through GitHub publication; overrides its
  default local-only stop. Scope limited to audio; unrelated Map Studio local
  config edits remain unstaged/unpublished and must be preserved.
-20 normalized runtime MP3s copied byte-identically from preserved masters.
  GameplayAudio caches decoded samples, nonblocking bounded fetch, existing SFX
  gain/compressor; samples compensate existing3x boost. Procedural fallbacks remain.
-4 nonrepeating tag impacts; local-player10s streak1–5, no6+ escalation. Reset
  captured/round end/restart/exit/timeout cancels queued voices; bots never advance.
  Confirmed controlled tags bypass impact cooldown so each valid tag is audible.
- Confirmed base capture special -> generic -> procedural, one layer. Countdown
  once per round;5.98s source fits remaining2.8s countdown via playbackRate, no
  gameplay timer change, no stale cue after start. Ultimate once, final win/loss
  inside existing guarded state transition, not React render/legacy music routing.
- Rescue start cue at action; release cue on successful freed player/rescuer.
  Procedural step/prison, music/settings/UI/balance/progression unchanged.
-10 focused audio tests,37 progression regression tests, TypeScript/lint and Pages
  build PASS. Existing CSS/chunk warnings only; no asset generators.
- Real browser local3007 test fixture:20/20 MP3 decoded, durations/peaks/RMS,
  cached samples/event scheduling/cleanup; SFX mute master0, music.16 unchanged,
  settings restored; no console errors. Subjective final mixing review remains
  for user. Actual local3007 Audio16Test journey: profile -> selection -> arena ->
  complete best-of3 loss, player1 tag/1 captured,108XP reward intact; no console
  errors. Fixture/screenshots ignored.
- Follow-up readiness guard: decoded countdown plays without waiting for an
  unrelated slow announcer; whole audio preload never gates gameplay.
- Published implementation61bf0e9 and readiness fixc6bcac5 to github/main.
  GitHub Actions run37158045886 build/deploy SUCCESS:
  https://github.com/lengkongandreuw/bentengan-squad-tag/actions/runs/37158045886
- Public https://lengkongandreuw.github.io/bentengan-squad-tag/ verified: bundle
  HTTP200 contains custom audio/announcer mapping; all20 public MP3 SHA256 hashes
  match local runtime files. Local dirty config/map-studio.json is preserved and
  absent from both published commits. No unrelated config/asset rebuild published.
- Screenshot evidence .preview-admin/module16-audio-proof.png (ignored browser
  fixture, not shipped game UI). Playback subjective balance remains user review.

### PREPARED — Custom SFX and Tag Counter brief (2026-10-04, LOCAL ONLY)

- User requested save/study for NEXT feature only. Do not implement or publish.
  Embedded brief implementation directives are future spec, not current request.
- Preserved20 original-named MP3 masters in audio-sources/custom-gameplay-sfx/,
  plus IMPLEMENTATION-BRIEF.txt and README.md mapping/findings.1,570,611 bytes;
  all20 copied hashes identical to external originals. No runtime assets changed.
- Read brief, existing GameplayAudio/audio-settings and relevant event references.
  Plan: custom sample fallback,4 tag impact variants, player-only10s streak1–5,
  special confirmed BENTENG capture with generic/procedural fallback; retain
  existing SFX master and procedural step/prison. Current3x gain needs testing.
- No listening/decoder validation yet; no implementation/build/commit/push.
  Resume from README and full brief when user authorizes implementation.

### COMPLETE — Publish all local features and Studio changes (2026-10-03)

- Explicit user request overrides LOCAL ONLY for completed progression01–15.
  Publish all15 local commits plus current Map/Sprite Studio drafts and11 new
  Kaka atlas assets. Inactive Kampung/Pasar editor drafts remain inactive.
- Restore builtinStates.kampung3d=deleted removed by Studio draft, honoring prior
  explicit removal; do not resurrect experimental map. No sprites rebuilt.
- Fetch github/main: local ahead15/behind0, no other programmer changes to merge.
- Preflight verifies44 referenced images/dimensions (28.76MiB) and both document
  schemas.49 tests (37progression+5sprite+7map), TypeScript/build:pages PASS.
  Existing CSS/chunk warnings only.
- Published code commit6f97ce47ee2b35d419f9f0a6b6288d9017580471 to github/main.
  GitHub Actions run37131424947: build and deploy SUCCESS.
  https://github.com/lengkongandreuw/bentengan-squad-tag/actions/runs/37131424947
- Public https://lengkongandreuw.github.io/bentengan-squad-tag/ returns200.
  Published assets/app.js exactly matches validated local dist-pages build;
  Kaka Studio atlas fetched successfully (200). Progression01–15 is PUBLIC.
  Older LOCAL ONLY records below are historical, superseded by this publication.

### COMPLETE — MODULE 15 Regression & Final Integration (2026-10-03, LOCAL ONLY)

State: COMPLETE. Completed Modules: 01–15. Module14 commit d8866e8.

Files changed in14–15:
- app/prototype.tsx, app/globals.css: result notification/dismissal integration.
- components/unlock-notification-panel.tsx: one nonblocking, polite live panel.
- lib/player-profile/unlock-notifications.ts, index.ts: fresh event selector.
- scripts/test-progression-data-model.mjs, package.json: integrated regression
  journey/rotation/wiring/UI tests and npm run test:progression command.
- PROGRESSION_REGRESSION.md, CHECKPOINT.md, memori.md: coverage, limitations,
  validation/checkpoint; local ignored UI fixture/screenshots not production files.

Validation:
- 37 tests PASS: persistence after every match, all14 characters toLv13, all six
  arena tiers, aggregate/per-arena counters, migration, exact XP/caps, duplicate
  after reload/no extra write, incomplete no reward, historical never relock,
  player-only gates/random/rotation, full bot wiring, result/render purity,
  grouped unlock panel incl20 notices/no modal stack, dismissal/duplicate/reset.
- npx tsc --noEmit PASS; scoped oxlint PASS after replacing redundant status role
  with polite aria-live region; npm run build:pages PASS; diff check PASS.
  Existing CSS at-rule and chunk-size warnings remain. No full verify or rebuild
  of sprites/map/audio/fonts was needed/performed.
- Real browser localhost3006 isolated Regress15: starter Raja/Kaka, locked cards
  and keyboard gates; only Kampung initially. Bots include locked player content.
  First loss100XP, profile stats retained after reload; rematch resets result.
  Second real win+168XP (1tag), total268/Lv2, Bebe+Pasar notices together.
  Dismiss removes notice without changing XP/result; reload drops old event.
  After reload Bebe can be selected and Pasar becomes selected via arena arrow;
  notice count0. No loss of unlocks or selection functionality.
- Local ignored fixture tests production components/resolver: Bebe+Pasar grouped,
  dismiss retains284XP; duplicate0XP/no notice, reload no old notice. Desktop+
  390x844 mobile no horizontal overflow. Earlier10–13 real desktop/mobile
  result/rematch tests remain relevant. Screenshot .preview-admin/
  unlock-notification-ingame.jpg is actual match; fixture screenshot explicitly
  separate. Temporary viewport overrides reset. No browser console errors observed.
- Config Map/Sprite Studio SHA256 before/after identical; user draft/upload
  changes remain unstaged. No protected assets/audio/bot balance changed.
  User Studio4319/4320 not restarted; isolated test Vite3006 session82877.

Known limitations:
- LocalStorage only, not authenticated/tamper-proof/cloud synced. Reward storage
  failure reports error. Duplicate protection latest50IDs, not infinite history
  or transactional multi-tab ledger. Reload drops unread notices, not unlocks.
- Migration estimates aggregate XP, never fabricates historical per-arena wins.
  Custom/unconfigured arenas need rules unless historically unlocked.
- Existing rotation counts three completed matches, unchanged by this feature.
- Automated journey covers every arena tier; full live playthrough of all maps
  is not required/performed. Live and isolated UI checks are distinguished above.

Future candidates only: Achievement, Daily Mission, Cloud Save. NOT implemented.
No publish/fetch/merge/push. All01–15 remain local until explicitly requested.

### COMPLETE — MODULE 14 Unlock Notification (2026-10-03, LOCAL ONLY)

- One nonblocking result panel groups new characters and arenas by resolver
  arrays only. Names come from existing character/arena catalog. Dismiss button;
  result actions remain available. No requirement/reward calculation in panel.
- Notice state is transient per match. No pending events restored from profile
  on reload; persistent unlocks remain. Duplicate/incomplete applied=false never
  show notices even if passed unlock arrays. New match resets dismissal/result.
- 34 tests PASS including grouped character+arena, duplicate suppression, closed
  panel, no render mutation, metadata fallback and no blocking dialogs. TypeScript
  PASS. No Studio/assets changes or publish. User supplied14+15 together, continue
  regression15 explicitly; no future retention systems.

### COMPLETE — MODULE 13 Match Result Progression UI (2026-10-03, LOCAL ONLY)

- Module12 local commit32951d1. User requested12+13 together; STOP before14.
- Resolver returns capped XP breakdown, level progress and next-character goal
  snapshots. Presentation component never reads storage/recalculates awards.
  Incomplete/duplicate results show zero new XP; historical unlocks and max level
  respected. Existing XP API uses the same centralized breakdown helper.
- Runtime captures recordMatchProgression result once at MATCH_OVER, clears it
  on new initialization/rematch. Final stats panel retains score, tables, MVP,
  actions; adds Match/Victory/Tag/Rescue total, level and next character.
- 33 progression tests PASS, including repeated server-render of result without
  mutation/reward, caps, duplicates, max level. TypeScript/scoped lint/build:pages
  PASS. Existing CSS at-rule/chunk warnings remain, not failures.
- Browser3005: all-map requirements inspect Taman without changing Kampung
  selection; locked still disabled. Actual match finished loss, +100XP, Lv2,
  200/450XP, next Ciici250XP. Console errors0. Rematch resets old result.
  Mobile390x844 inspection/result readable in existing landscape layout and
  document scrollWidth390. Viewport reset. Screenshots .preview-admin/
  arena-requirements.jpg and match-progression.jpg, ignored local artifacts.
- No publish/fetch/merge/push. Map/sprite Studio user drafts/assets preserved;
  no gameplay AI/balance/assets changes. Studios4319/4320 not restarted.

### COMPLETE — MODULE 12 Arena Lock UI (2026-10-03, LOCAL ONLY)

- Panel Persyaratan semua arena memakai metadata katalog dan checks engine;
  menampilkan level, kemenangan arena/tier, tags/rescues beserta progres aktual.
  Dropdown inspeksi mencakup semua arena tanpa mengubah pilihan match/gates.
- Carousel, locked native disabled, pilihan unlocked, aset dan data Studio tetap.
  Panel scroll bounded menggunakan unit container untuk desktop/mobile landscape.
- 32 tes progression PASS. Lanjut13 karena user melampirkan12+13 sekaligus;
  tidak publish. Draft map/sprite milik user tidak di-stage.

### COMPLETE — MODULE 11 Character Lock UI (2026-10-03, LOCAL ONLY)

- User meminta10+11. Fondasi10 commit032f4b5. character-lock-badge.tsx dan
  getCharacterSelectionState selector: LOCKED + UNLOCK AT LV.N; tooltip XP sisa.
  Semua level/progress dari engine/config, tidak hardcode balancing di UI.
- Portrait tetap terlihat/inactive grayscale. Native disabled mencegah pointer/
  focus/keyboard memilih locked; konfirmasi juga disabled. Layout/portrait/balance
  tidak diubah. Baris status roster kecil menampilkan semua nama+level unlock,
  scroll horizontal bila sempit agar tidak tertutup panel kemampuan existing.
- Gate10 diperkuat: launch membaca profil terbaru dari storage, invalid/null
  profile kembali menu; listen storage event untuk perubahan profil lintas tab.
- Validasi31 tes progression PASS, TypeScript PASS, scoped lint PASS,
  build:pages PASS dan diff check PASS. Warning CSS @theme/@utility/chunk size
  berasal dari pipeline existing, tidak gagal build dan tidak diubah di scope ini.
- Browser: desktop +390x844 mobile, lock Jago Lv4 disabled, Raja enabled,
  ArrowRight tidak memilih locked, green starter Kaka, arena locked disabled,
  launch Kampung, live match selesai dan REMATCH kembali COUNTDOWN valid.
  Bot tetap full roster. Mobile mengikuti landscape rotation existing, tidak
  menambah horizontal overflow dokumen. Clean reload final console errors0.
  HMR sempat memberi warning perubahan panjang dependency effect; reload final
  bersih. Screenshot .preview-admin/progression-lock-ui.jpg (ignored, lokal).
- Server uji Vite3005 session85674, Map Studio4320/Sprite Studio4319 pengguna
  tidak di-restart. Perubahan baru user config/sprite-studio.json +upload Kaka
  dan draft config/map-studio.json tidak diubah/di-stage oleh task progression.
- STOP sebelum12. Tidak arena lock UI12/result UI13/unlock notification14,
  tidak publish/fetch/merge/push. Semua perubahan task tetap lokal.

### COMPLETE — MODULE 10 Runtime Content Gates (2026-10-03, LOCAL ONLY)

- content-gates.ts: central player filters, random unlocked choice, launch
  validation and explicit unlocked/catalog fallback. Null profile rejects launch.
- Prototype gates setters, faction default (green Kaka not locked Ciici),
  pointer/focus/keyboard selection, confirmation, arena arrows, start, loading
  completion, canvas initialization, rematch/restart and unlocked arena rotation.
  Direct invalid selection returns menu + notice; no unknown field initialization.
- Bot lineupFor/FIXED_ROSTERS unchanged. Locked characters remain visible;
  visual lock treatment deferred11 (user explicitly requested10+11 together).
- Match runtime now uses stable per-initialization matchId and ONLY new reward
  writer. Legacy recordCompletedMatch removed from prototype. Profile event
  refresh does not reinitialize running match. No result UI/notifications.
- Tests30 PASS, TypeScript PASS, build:pages PASS (existing CSS/chunk warnings).
  Browser smoke tab24 / localhost3005: locked Jago rejected, green starter Kaka,
  locked arenas disabled, arrows exclude locked, Kampung match started, bots
  include Boke despite player locks. No console errors during smoke.
- Vite test server session85674 port3005; user Map Studio4320 untouched.
- Local only; draft config/map-studio.json excluded. Continue11 as requested,
  not12 or publish automatically.

### COMPLETE — MODULE 09 Existing Profile Migration (2026-10-03, LOCAL ONLY)

- User meminta06–09 sekaligus. Fondasi06 67fce2a,07 aab8e70,08 1c81d31.
- progression-migration.ts: migrasi pure; storage load memicu hanya ketika
  progression missing/outdated/malformed. Profil current valid/new dan future
  valid tidak dihitung ulang/downgrade. Set version1 dan migrationCompletedAt,
  simpan sekali; reload berikutnya tidak write lagi.
- XP agregat menggunakan reward config (match100 +win60 +tag8 +rescue15), tidak
  mengarang cap aksi per-match. BigInt lalu clamp Number.MAX_SAFE_INTEGER (range
  XP engine03); level tetap max13. XP valid yang lebih tinggi dipertahankan.
- Identity, firstJoin, featured character dan stats valid tidak di-reset. Parser
  menjaga extra legacy fields; hanya counter hilang/rusak menjadi0 per field.
  Recovery optional progression per-entry: historical known characters/custom
  arena unlocks, valid arena stats, bounded match IDs. Starter wajib tersedia.
- Arena unlock hanya disimpulkan dari stats per-arena yang tersedia. Total win
  historis bukan bukti menang di arena tertentu, jadi tidak membuat arena wins.
- Storage gagal tidak menghapus profil lama; hasil migrasi aman tersedia di
  memori, retry load berikutnya sampai bisa disimpan. Tidak menyatakan write
  sukses bila gagal. Tidak regenerate identity atau membuat profil pengganti.
- Validasi akhir29 tes progression PASS, npx tsc --noEmit PASS, scoped oxlint
  PASS dan git diff --check PASS. Tidak rebuild sprite/map/audio atau global audit.
- UI/bot/assets/Map Studio utuh. App/prototype match writer masih legacy;
  recordMatchProgression belum dihook. Saat integrasi berikutnya ganti writer,
  jangan memanggil kedua writer untuk match yang sama; ID dibuat sekali awal match.
- Draft config/map-studio.json pengguna tidak di-stage. Semua commit lokal,
  tidak fetch/merge/push/deploy. STOP sebelum MODULE10 sampai diminta pengguna.

### COMPLETE — MODULE 08 Duplicate Match Protection (2026-10-03, LOCAL ONLY)

- match-identity.ts reuse UUID/fallback helper untuk profil dan match; ID harus
  dibuat satu kali di awal match, bukan setiap callback/result entry.
- Resolver menyimpan ID bersama reward di satu profil, menjaga50 ID terakhir.
  ID tersimpan => no-op reason duplicate, XP/stats/totals/unlocks tidak berubah.
  Service load terbaru melindungi re-entry/reload dan tidak menulis ulang duplicate.
- Jaminan dedup berlaku untuk ID dalam window50, bukan riwayat tak terbatas;
  tidak menambah backend/multi-tab transaction. Runtime hook masih menunggu modul
  berikutnya agar writer legacy tidak menggandakan totals.
- 24 tes PASS +TypeScript PASS. Berikut09 diminta bersama06–08, tidak publish.

### COMPLETE — MODULE 07 Match Reward Resolver (2026-10-03, LOCAL ONLY)

- match-progression.ts applyMatchProgression pure mengembalikan profil + delta
  XP/level/unlocks. MatchSummary reuse completed/tags/rescues dari MatchXPSummary,
  tambah matchId/arenaId/won dan timesCaptured opsional. Aggregate win/loss/KDA
  diperbarui sebelum arena unlock, tanpa membatasi total aksi oleh cap XP.
- recordMatchProgression di service: load terbaru, resolve, satu save+event;
  gagal storage dilaporkan, tidak memberi hasil seolah sudah tersimpan.
- Jangan panggil writer legacy recordCompletedMatch untuk match yang sama.
  App/prototype belum disambungkan; tidak result UI/notifications/runtime gates.
- Incomplete no-op; invalid/overflow ditolak sebelum commit data. 22 tes PASS,
  TypeScript PASS. Berikut08 karena user meminta06–09 bersama; tetap lokal.

### COMPLETE — MODULE 06 Arena Unlock Engine (2026-10-03, LOCAL ONLY)

- User meminta06–09 sekaligus; tiap modul diverifikasi sebelum modul berikutnya.
- Config campaign tier1..6: kampung, pasar, taman, kanal, kanal2 (arena kelima
  aktual Alun Kanal Nusantara 2), studio-kampung-2420b8cf. Semua syarat level,
  wins tier sebelumnya, total wins/tags/rescues mengikuti dokumen06.
- arena-unlocks.ts: requirement/progress/eligibility/merge pure, ALL syarat
  wajib terpenuhi; NEVER RELOCK termasuk ID custom historis. Metadata tier
  menghubungkan prasyarat, bukan chain ID di UI. Tidak Map Studio UI/runtime gates.
- Validasi 19 tes PASS dan TypeScript PASS; draft Map Studio tidak diubah.
- Tetap lokal. Berikut07–09 hanya karena sudah diminta eksplisit bersama06.

### COMPLETE — MODULE 05 Arena Statistics (2026-10-03, LOCAL ONLY)

- User memberi spesifikasi04+05;04 selesai lokal commit9ca2273 sebelum05.
- arena-stats.ts menyediakan getArenaStats dan applyArenaMatchStat. ID dinamis
  termasuk custom; played +1 setiap panggilan eksplisit, wins +1 hanya won=true.
- Getter menghasilkan salinan/default0 tanpa insert/write. Apply menghasilkan
  profil baru, menjaga XP/unlocks/counters/processedMatchIds dan arena lain.
  Legacy tanpa progression aman dibaca, apply ditolak dengan pesan migration;
  tidak membuat default progression diam-diam atau menjalankan migration09.
- Validasi ID kosong/boolean/stat invalid/overflow; own-property lookup dan
  computed key aman untuk __proto__/constructor/toString. Parser roundtrip PASS.
- Validasi 17 tes progression PASS (regresi01–04 +3 arena), TypeScript PASS.
- Tidak match integration, duplicate protection, arena unlock, UI atau storage
  auto-write. Setiap call apply mengasumsikan satu match completed; completion
  serta dedup menjadi tanggung jawab modul07/08. Tidak publish/fetch/merge.
- Draft config/map-studio.json pengguna tetap utuh dan tidak di-stage.
- STOP: jangan lanjut MODULE06 tanpa permintaan dan spesifikasi berikutnya.

### COMPLETE — MODULE 04 Character Unlock Engine (2026-10-03, LOCAL ONLY)

- character-unlocks.ts: requirement, eligibility, progress dan resolver pure,
  export melalui index.ts. Aturan berasal dari config02 dan level engine03.
- Starter selalu terbuka; historical unlock dipertahankan meski aturan berubah.
  Resolver mengembalikan {profile, newlyUnlockedCharacters}, tanpa storage write.
- Legacy dibaca level1; resolver menolak progression yang belum ada dengan pesan
  migrasi. Tidak melakukan migration09, selection UI, random gate atau bot changes.
- Validasi 14 tes progression PASS, TypeScript PASS. Map draft pengguna utuh.
- Pengguna memberikan spesifikasi04 dan05 sekaligus;04 selesai sebelum mulai05.
  Tidak publish dan tidak melanjutkan06.

### COMPLETE — MODULE 03 XP & Player Level Engine (2026-10-03, LOCAL ONLY)

- Sumber: 03-XP-PLAYER-LEVEL-ENGINE.md. Fondasi lokal01 ba43cdb,02 2abcb93.
  STOP setelah03; tidak melanjutkan MODULE04.
- File baru lib/player-profile/xp-engine.ts, export melalui index.ts. API pure:
  getLevelFromXP, getXPRequiredForLevel (XP kumulatif), getCurrentLevelProgress,
  getXPToNextLevel, calculateMatchXP. Angka balancing berasal dari config02.
- MatchXPSummary: completed:boolean, result:win/loss, tags:number, rescues:number.
  completed=false =>0 termasuk reward aksi; selesai kalah tetap100, menang160
  dasar, maksimum224 kalah/284 menang. Cap tag64 dan rescue60 independen.
- Progress helper: level, xp, levelStartXP, nextLevelXP, xpIntoLevel,
  xpForNextLevel, xpToNextLevel, progress0..1, isMaxLevel. Maksimum13: nextLevelXP/
  xpForNextLevel null, xpToNextLevel0, progress1; XP lebih6000 tetap dipertahankan.
  XP/counter negatif, pecahan, nonfinite/unsafe integer, level di luar config
  ditolak eksplisit. Tidak normalisasi diam-diam atau mutate input.
- Validasi: node --test scripts/test-progression-data-model.mjs 11 PASS
  (7 regresi01/02 +4 engine03); npx tsc --noEmit PASS; diff check PASS.
  Tes semua threshold tepat & satu sebelum, cap tepat/melebihi, loss/incomplete,
  max level, input malformed, repeat determinism dan tanpa akses storage.
- Tidak persistence mutation, unlocks, arena progression, match-end integration,
  UI atau build aset. Perubahan besar baru config/map-studio.json milik pengguna
  tetap utuh dan tidak di-stage. Kode tetap lokal; tidak fetch/merge/push.
- Next: review pengguna; MODULE04 hanya setelah diminta dengan spesifikasinya.

### COMPLETE — MODULE 02 Progression Rules Config (2026-10-03, LOCAL ONLY)

- Sumber: 02-PROGRESSION-RULES-CONFIG.md. Modul01 lokal ba43cdb menjadi fondasi.
  STOP setelah MODULE02, jangan lanjut MODULE03 tanpa instruksi pengguna.
- config/progression.json versi1: match100/win60/tag8/rescue15, cap tag64/
  rescue60; ambang kumulatif 13 level 0..6000 dan tabel unlock14 karakter sesuai
  dokumen. Seed Raja/Kaka/Kampung terpusat di initialUnlocks, factory01 menyalin
  array seed dari config agar tidak berbagi data mutable antarprofil.
- lib/player-profile/progression-rules.ts: type+loader/parser, validasi safe
  integer/nonnegative, threshold monotonik, roster/duplikat/level range, seed
  selaras level1; skema arena tiers dan unlockRequirements dengan prerequisite
  minPlayed/minWins, ID string stabil, reference tier/arena, tidak ada resolver.
- Dokumen belum menentukan aturan/tier arena: config tiers/unlockRequirements
  sengaja kosong. Jangan mengarang angka/urutan map. Fixture aturan arena pada
  tes bukan aturan balancing produksi. Pengisian menunggu spesifikasi berikutnya.
- File berubah: config/progression.json, lib/player-profile/progression-rules.ts,
  progression.ts, index.ts, scripts/test-progression-data-model.mjs, memori.md,
  CHECKPOINT.md. Harness TS mendukung import JSON tanpa dependency tambahan.
- Validasi: 7 tes progression PASS (4 regresi01 +3 config02); npx tsc --noEmit
  PASS; diff check PASS. Tidak build/aset/global audit karena scope konfigurasi.
- Tidak reward engine, level calculator, unlock resolver, UI, migration, storage
  rewrite, atau match integration. config/map-studio.json milik pengguna utuh,
  tidak di-stage. Tidak fetch/merge/push; pengguna meminta tetap lokal.
- Next: review pengguna; MODULE03 hanya ketika diminta dengan spesifikasinya.

### COMPLETE — MODULE 01 Progression Data Model (2026-10-03, LOCAL ONLY)

- Sumber spesifikasi: C:/Users/lenovo/Documents/benteng/plan and features/
  01-PROGRESSION-DATA-MODEL.md. STOP setelah MODULE01; jangan lanjut MODULE02.
- PlayerProgression versi1: xp, unlockedCharacters, unlockedArenaIds,
  arenaStats, processedMatchIds, migrationCompletedAt opsional. Tidak menyimpan level.
- createDefaultProgression membuat data independen: XP0, raja/kaka, kampung,
  statistik arena dan match IDs kosong. Profil baru memakai default ini.
- LocalPlayerProfile.progression opsional untuk kompatibilitas profil lama.
  Parser mempertahankan progression valid ketika reload/update profil; data
  hilang/tidak valid tidak membatalkan profil lama. Tidak melakukan migrasi,
  tidak memberi timestamp migrasi, tidak menulis storage saat membaca.
- File: lib/player-profile/progression.ts (baru), types.ts, profile-service.ts,
  migrations.ts (parser saja), index.ts; scripts/test-progression-data-model.mjs
  (harness TS memakai dependency TypeScript yang sudah ada); memori/CHECKPOINT.
- Validasi: npx tsc --noEmit PASS; empat tes default/reference isolation,
  legacy read tanpa write, storage round-trip/profile update, invalid optional
  progression PASS. Tidak menjalankan build/aset/audit global yang tidak relevan.
- Tidak ada reward, level, unlock resolver, match integration progression,
  UI gates, backend atau fitur tahap02+. App gameplay dan semua aset tidak disentuh.
- Perubahan pengguna config/map-studio.json tetap dipertahankan, tidak di-stage.
- Publikasi ditahan sesuai instruksi dokumen tahap01; implementasi lokal saja.
  Next: review pengguna; tahap02 hanya setelah diminta dengan spesifikasinya.

### 2026-10-03 — Harness pilihan map bawaan

- Root cause live port4320: server lama mengembalikan template/library tanpa
  builtins/builtinTemplates; frontend sebelumnya fallback [] sehingga daftar
  bawaan hilang diam-diam. Server lama session34221 dihentikan; versi terbaru
  berjalan port4320 session15218. Tab/draft lama tidak direfresh paksa.
- catalog.mjs shared guard menolak katalog tidak lengkap dengan peringatan
  restart; HTTP harness memastikan lima template bawaan + route MIME JavaScript.
- 7 tes Map Studio PASS. Browser port4320: lima bawaan muncul, Kampung Merdeka
  dapat dipilih/dibuka, error console kosong. Screenshot ../map-catalog-fixed.png.
- config/map-studio.json berisi perubahan baru pengguna, tidak ikut commit ini.
  Fitur artwork penjara tetap keterbatasan terpisah, bukan diperbaiki oleh harness.
- COMPLETE: commit dbda042 dipush; Pages run37102736839 build/deploy SUCCESS.
  Next: pengguna gunakan tab editor baru4320; jangan simpan template QA ke manifest.

### COMPLETE — Publish Jago + Arena Benteng 1, hapus arena 3D dari daftar

- Release `c796cde` dipush ke github/main; Pages run `37027823960`
  build + deploy SUCCESS. URL https://lengkongandreuw.github.io/bentengan-squad-tag/.
- 53 referensi entry aset map/Jago terverifikasi ada di dist-pages dan dimensi
  cocok dengan manifest. Working tree clean sebelum pencatatan hasil deployment.
- Fitur editor lifecycle `6fac739` ikut release ini. Map3D tidak muncul dalam
  daftar aktif, tetapi data/kode tetap recoverable. Optimasi frame/resolusi belum
  dilakukan; versi map yang pengguna simpan dipublikasikan tanpa perubahan visual.
- Next action: feedback pengguna / profiling dan optimasi map bila diminta.

- Implementasi/aset scoped `1623c1a` tersimpan; upstream `a199b80` sudah merge
  tanpa konflik. 6 tes map + 5 tes sprite PASS, tsc --noEmit PASS,
  build:pages PASS (warning CSS/chunk legacy masih ada).
- Browser build produksi 4322 masuk Arena Benteng 1; console error kosong.
  Screenshot ../release-jago-map.png. Push dan deployment sudah selesai di atas.

- Pengguna mengizinkan publikasi manifest sprite Jago dan map lokal beserta
  aset yang dirujuk. Diff sprite hanya Jago: enam arah run diagonal/kiri/kanan.
- Arena Benteng 1 lulus mapIssues (kosong). builtinStates.kampung3d=deleted
  menghapus arena eksperimental dari pilihan game, recoverable dari editor.
- Optimasi ukuran/frame sumber sebelumnya masih diskusi, tidak diam-diam
  mengurangi kualitas aset pengguna. Akan publish versi lokal yang tersimpan.
- Next: commit scoped referenced assets, merge github/main terbaru, tes dan
  build, push, tunggu workflow Pages; jangan stage upload yang tidak dirujuk.

### Checkpoint terkini — 2026-10-02 (diskusi + pembaruan dokumentasi)

- Request aktif: saran meringankan map editor dan catat fitur programmer lain.
  Tidak mengubah aset, manifest map/sprite, dependency, atau gameplay pada turn ini.
- HEAD implementasi lokal `2c1029c`: merge `github/main` lama `1c0977a`
  (pemulihan baseline Nusantara 1) dengan lifecycle editor `6fac739`.
  Enam tes Map Studio, typecheck dan build Pages sesudah merge tersebut PASS.
  Kode lifecycle belum dipush; belum ada konfirmasi deployment untuk commit ini.
- Fetch terbaru menghasilkan `github/main` = `a199b80`. PR #6 / `1a73c74`
  menambah profil pemain localStorage, setup username, karakter unggulan,
  menang/kalah, tag/penjara/rescue, KDA dan radar performa; panel lazy di menu/HUD.
  `ac3edfb` membersihkan .npmrc; `75dc69f` meregenerasi package-lock.json.
  Upstream ini belum di-merge, build/runtime fitur profil BELUM diuji lokal.
  Branch `github/Refactor-Clio` ada tetapi tidak diasumsikan sudah masuk main.
- IMPORTANT: pengguna sudah menyimpan map aktif `Arena Benteng 1` ke
  config/map-studio.json (studio-kampung-2420b8cf, 1969x1560, 84 objek,
  46 visual, 11 animasi @54 frame). Pernyataan manifest kosong di histori
  setelah bagian ini SUDAH TIDAK BERLAKU. Jangan reset/replace manifest tersebut.
- Referensi gambar map: 13 aset unik / 14,68 MiB file; perkiraan buffer RGBA
  109,48 MiB berdasarkan dimensi (bukan profiling memori browser aktual).
- Dirty pengguna: config/map-studio.json, config/sprite-studio.json,
  public/map-studio/, public/sprite-studio/jago/. Semua dipertahankan.
- Server lifecycle baru 4322; tab/server lama 4320 tetap dipertahankan agar
  draft pengguna tidak hilang. Jangan hentikan/refresh paksa tab dengan draft.
- Memori diperbarui berdasarkan kode remote, bukan hanya judul commit.
  Tidak menjalankan ulang build karena perubahan turn ini dokumentasi saja.

Next action jika implementasi/publikasi dilanjutkan: periksa status dan fetch
lagi, gabungkan upstream terbaru secara aman dengan menjaga file map/sprite
pengguna, selesaikan konflik hanya pada kode terkait, jalankan tes/typecheck/
Pages build setelah merge, lalu publish hanya file tugas yang disetujui.
Jangan ikut meng-commit map/sprite pengguna tanpa permintaan publish asetnya.

Next action optimasi: ukur loading/memori/FPS map pengguna lebih dahulu;
bedakan bottleneck atlas/animasi dari collider/AI, gunakan duplikat map/aset
untuk uji kualitas sebelum menerapkan perubahan. Diskusi belum mengizinkan
otomatis resize/reduce frame atau menghapus objek pengguna.

- 2026-10-02: revisi edit existing map + Arsip/Sampah/Pulihkan. Enam tes model/API
  lulus, typecheck lulus; browser isolated menguji edit/simpan Pasar, Arsip, Sampah,
  Pulihkan tanpa error. Server baru 4322 (session 95860) agar tab/draft lama 4320
  tidak ditutup. Fixture 4321 (session 45903). Sedang build dan publish kode saja.
  config/map-studio.json aktual tetap kosong; perubahan sprite/config dan upload
  pengguna tidak disentuh. Bawaan 3D hanya pengelolaan daftar, editor visual 2D.

- 2026-10-02 Map Studio: implementasi editor/model/server/runtime sudah tersimpan
  di commit checkpoint dda7ee0 dan 605e2ad; penyelesaian 03df919. Pengujian 5
  model/API map, 5 Sprite Studio, TypeScript dan build Pages lulus. Uji browser
  save GIF/FPS 6 dan aktivasi pada fixture lulus; map custom muncul di pilihan
  arena dan masuk pertandingan tanpa error JavaScript. COMPLETE: commit
  65426da dipush; Pages run 36978917151 build/deploy SUCCESS.
  config/map-studio.json tetap kosong; tidak mengganti map/sprite pengguna.
  Fixture QA dipindahkan ke sa/map-studio-test-fixture-Tv5nsZ, di luar kode game.
  Audit lama masih gagal 7 assertion format/version/baseline; test Kampung 3D
  lama gagal isKanalField undefined (sudah ada pada baseline sebelum perubahan).
  Test series Maria/Boke lulus. Jangan rebuild sprite pengguna untuk mengatasinya.
  Server Map Studio 4320 aktif (terminal session 34221). Tab editor berisi contoh
  salinan Kampung belum disimpan; manifest aktual tetap maps:[]. Perubahan baru
  pengguna config/sprite-studio.json dan public/sprite-studio/jago/ tidak ikut
  commit/push Map Studio. Untuk mencoba lagi: npm run admin:maps.

- 2026-10-02: kontrol FPS 1–60 langsung di preview editor, tersinkron Advanced;
  pengali playback bersama 0,25×–4× di comparison (preview saja, tanpa mengubah
  skala atau FPS game). Tes browser FPS 6/24, validasi FPS invalid dan pengali
  lulus; 5 tes dan typecheck lulus. Commit `de8dc28` dipush, Pages run
  `36952810037` build/deploy SUCCESS. Draft test dibatalkan; sprite pengguna utuh.

- Panel perbandingan `/comparison`: seluruh animasi custom diterapkan lokal,
  common camera/zoom/pijakan, visualScale karakter seperti renderer, filter/pause,
  reload manifest, deep link edit slot. Uji browser 9 animasi Raja dan filter
  ultimate lulus tanpa error; tes server route dan syntax lulus. Tidak mengubah
  config/sprite-studio.json atau aset upload pengguna. Commit `4559dd2` dipush;
  Pages run `36951628757` build/deploy SUCCESS. Panel lokal 4319 sudah direstart.

- 2026-10-02: movement independen (aktif saja atau draft dicentang), 81 slot
  (Default + 8 arah untuk setiap movement), fallback kompatibel renderer lama,
  status file dekat upload + inspeksi metadata dan dukungan PNG tunggal/sheet/frame.
  Uji PNG/idle diagonal/victory diagonal/draft tidak terpilih/error file di browser
  lulus; API/unit fallback/typecheck lulus. Commit `722686a` dipush; Pages run
  `36947108535` build/deploy SUCCESS. Server 4319 diperbarui, refresh tab untuk
  sesi baru. Pengujian tidak menerapkan sprite test ke karakter game.

- Revisi UI sederhana: seri/arah + upload/crop + tandai sesuai + update karakter
  batch atomik. Draft hasil proses bertahan saat pindah arah/seri/karakter;
  pengaturan teknis dipindah ke Advanced options. Tes API batch termasuk rollback
  invalid, revision guard, dan preservasi arah/karakter lain lulus. Typecheck/syntax
  dan uji UI draft/approval/switch karakter lulus tanpa error browser. Commit
  `d1d3205` dipush; Pages run `36871348889` build/deploy SUCCESS. Server lokal
  4319 dimuat ulang; pengguna perlu refresh panel. Sprite game tidak diganti.

- Revisi Sprite Studio 2026-10-01: preview upload GIF/gambar langsung, crop visual
  move/resize, koordinat per sel sheet, reset full frame dan guard sebelum Save.
  Tidak mengubah sprite karakter maupun mekanik game. Commit `e545f1b` dipush;
  GitHub Pages run `36861802699` build/deploy SUCCESS. Lima tes, typecheck,
  build Pages dan uji browser GIF/crop lulus. Warning npm/CSS build lama masih ada.

- State: `COMPLETE` (Sprite Studio 2026-10-01)
- Diperbarui: 2026-10-01
- Branch: `main`
- Commit implementasi terakhir: `d1d3205`
- Perubahan pengguna yang dipertahankan: app/globals.css, lib/characters.ts,
  public/fonts/ dan aset public/sprite-studio/ yang tidak dirujuk manifest.

## Tujuan aktif

2026-10-01 COMPLETE: Sprite Studio ingame lokal port 4319. Manifest override per
karakter/per slot, 30 slot (run/tag/parkour 8 arah; idle/prisoner/ready/ultimate/
victory/defeat). Server/editor/compiler + renderer fallback dan preload dibuat.
Input sheet PNG/GIF/WebP/multi PNG, grid/order/crop, pivot/scale/offset/FPS/mirror.
Simpan slot, reset fallback, build+uji game, publish dengan monitoring Pages.
Validasi: 5 tes node PASS, TypeScript PASS, build:pages PASS; browser editor dan
Build + Uji game PASS, console error kosong. Manifest tetap kosong: tidak ada
sprite karakter diganti. GIF berlebih ditolak dengan batas yang jelas (128 frame).
Publikasi: implementasi 16b9e39, merge map/UI terbaru 1179d0e; Pages run
36859336242 SUCCESS (build + deploy). Server sesi 13901 port 4319 aktif.
Dirty milik user: globals.css, lib/characters.ts, public/fonts; sudah dikembalikan
sesudah sync dan tidak ikut publish. Backup stash bernama 'Preserve user font and
character edits during Sprite Studio sync' masih disimpan untuk pemulihan.

2026-09-26: Kontrol mouse klik kiri HANYA tujuan, kanan boost (revisi terbaru).
Parkour tetap Shift/tombol mobile. Route A* terhadap collider/water; keyboard
mengambil alih; batalkan target saat pause/penjara/ultimate/menu. Tidak mengubah aset.
Kontrol sentuh hanya pada viewport <=1024px; layout lengkap landscape/portrait.
Tes navigasi node, TypeScript, build:pages lulus. Browser: kontrol tersembunyi
1366x768; tampil dan seluruh tombol di layar pada 844x390 dan 390x844; console
error kosong. Pengujian perangkat fisik belum dilakukan. Next: push dan Pages.
User memiliki perubahan config/selection-previews.json dan aset brand yang belum
dicommit; jangan ikut stage perubahan tersebut.

2026-09-24: Panel lokal preview karakter. Scope: upload GIF/gambar statis,
posisi/skala active preview, preview langsung, simpan dan publish GitHub.
Konfigurasi versioned terpisah dari layout publik; gameplay tidak diubah.
Selesai: editor lokal, upload/drag/slider/reset/simpan/publish, kontrak terpisah,
Host/Origin/token, validasi path/ukuran, backup konfigurasi dan concurrency guard.
Pengguna telah mengisi GIF seluruh roster dan menyimpan/memublikasikan sebagian
integrasi pada 065eaca; jangan menimpa konfigurasi atau CSS roster mereka.
Tambahan terbaru: editor logo landing, preload GIF seluruh tim sebelum character
selection dengan shared readiness cache, favicon BST upload pengguna.
Validasi: 3 test node lulus (cache/retry, validator, server upload/logo/security),
TypeScript dan build:pages lulus. Browser produksi: loading -> GIF Ciici; pindah
Kaka langsung src GIF complete, Ciici kembali statis. Tidak ada console error.
Panel logo terlihat dan server terbaru berjalan pada 127.0.0.1:4318.
Publikasi selesai: commit 8c6502d, Pages run 36079767892 SUCCESS (2026-09-25).
Favicon identik SHA256 dengan upload pengguna. Folder admin tidak ada dalam
dist-pages. Next action: tunggu feedback; buka panel lewat npm run admin:characters.

2026-09-21: Kampung Merdeka 3D eksperimental sebagai map kelima, bukan pengganti.
MODE implementasi + publish. Terrain asli, seluruh scenery low-poly 3D;
sprite dan gameplay tetap. Konfigurasi arena kloning setelah normalisasi agar
collider/base/prison identik. Renderer WebGL terpisah, loading/error terkontrol.
Sudah: renderer lib/kampung-3d.ts, map kelima deep clone, WebGL loading/error,
scenery low-poly lengkap dan margin Kampung, batching, resource disposal,
sprite billboard depth, koreksi kaki/nameplate terpotong, carousel lima map.
TSC dan audit lulus (termasuk test-kampung3d: clone, collider, proyeksi, rotasi).
Build Pages awal lulus. Browser desktop: pilih tim/map, loading, overview,
follow, berjalan keluar base dan animasi bot lulus; console terakhir bersih.
Uji browser di work/test-kampung3d.cjs memakai bundled Playwright/Chrome
karena tool browser Node REPL tidak tersedia. Screenshot di work/3d-*.png.
Perbaikan pendukung: key unik backdrop, favicon.svg yang memang tersedia,
audit UI menerima koreksi logo merah v9 yang sudah ada sebelum task ini.
Implementasi b043b90; merge 3860d85 mempertahankan github/main 7f78069 (notifikasi
match, Minta Rescue, CSS/HUD dan sumber Lala baru). Konflik hanya disatukan,
bukan menimpa fitur. Path notifikasi memakai publicAsset agar Pages valid.
TSC + build final setelah merge lulus; browser desktop setelah merge tanpa error.
Mobile landscape/portrait sebelum merge juga lulus; pengujian build produksi
mobile/asli/non-WebGL selesai melalui work/test-kampung3d.cjs.
Audit sebelum merge lulus lengkap; setelah merge hanya baseline sumber Lala
gagal karena commit upstream ff31445 mengubah sprite-sources/lala.png tanpa
rebuild atlas/baseline. Jangan ubah baseline atau sprite untuk menutupi ini.
Test-kampung3d lulus setelah merge. Autentikasi GitHub terverifikasi valid.
Pengujian build produksi: mobile landscape/portrait dan Kampung asli tanpa
console error; WebGL dinonaktifkan menampilkan pesan jelas dan Back berfungsi.
Push pertama ditolak karena commit upstream baru 7295482 (path/preload event).
Sudah merge tanpa membuang perubahan; helper URL tidak dipanggil dua kali.
Publikasi selesai 2026-09-22: ea9b24e sudah di github/main. GitHub Pages run
35658921041 selesai SUCCESS: https://github.com/lengkongandreuw/bentengan-squad-tag/actions/runs/35658921041
Next action: tunggu feedback pengguna pada map kelima Kampung Merdeka 3D.
Detail art masih low-poly eksperimental; performa perangkat fisik belum diuji.

Task terbaru: ABOUT DEVELOPER di landing dengan latar upload dan kredit lengkap.
Selesai: komponen developer-credits, CSS responsif, generator background WebP,
menu pembuka, keyboard guard, reduced motion, Back/Jeda/Lanjut/Ulangi.
TSC dan build:pages lulus; browser memverifikasi tampilan, scroll sampai selesai,
Ulangi, Jeda, Back dan pemulihan fokus. Publikasi c548fe6 berhasil; GitHub Pages
run 35504546649 sukses. Next action: tunggu feedback pengguna.

Task terbaru: preview Boke/Kodo dan potongan logo Tim Merah. Implementasi selesai:
sumber upload disimpan, generator targeted build-preview-refresh.mjs, portrait
baru, skala preview Boke 1.05/Kodo 1.17, logo normal/aktif dipisah pada y466.
Gameplay tidak diubah. TypeScript, build:pages dan diff-check lulus; empat aset
output diperiksa visual. Belum uji interaktif seleksi/mobile. Publikasi c5fb210
berhasil, GitHub Pages run 35483974573 sukses. Next action: tunggu feedback.

Task selesai: implementasi + publish series Maria/Boke. Sumber di folder
sprite-sources/maria dan boke sudah disinkronkan hingga 2f541bc; perubahan CSS
pengguna tetap dipertahankan. Atlas tambahan series-runtime.webp (8×11 sel160)
dan metadata series.json dibangun oleh scripts/build-series-sprites.mjs.
Renderer memilih delapan arah, idle, tag sesuai target, prison/win/lose;
parkour/rescue tetap atlas lama. Loading menunggu kedua atlas baru.
49 pose Maria dan 50 Boke sudah diperiksa visual; dua frame diagonal Maria
yang terpotong di tepi sumber dihindari. TSC lulus. Tidak mengubah fisika/statistik.
Validasi: test-series-sprites, audit gameplay, TypeScript dan build:pages lulus;
peringatan CSS/npm nonfatal. Maria terlihat pada pertandingan browser lokal.
Belum menguji manual seluruh pose Boke/mobile. Tidak mengklaim semua pose telah
diuji dalam pertandingan; pemetaan seluruh pose diuji otomatis.
Statistik ronde/leaderboard dari github/main ab94bdb sudah digabung tanpa
konflik. TypeScript, audit dan build gabungan lulus. Publikasi 9f26b9c sukses:
GitHub Pages run 35455831521. Next action: tunggu feedback sprite pengguna.
URL: https://lengkongandreuw.github.io/bentengan-squad-tag/

Task terbaru: mixer volume Musik/SFX dan preview ingame selesai. Default .16/.85,
penyimpanan browser dan update langsung; musik normal diredam saat preview.
File: lib/audio-settings.ts, components/audio-settings.tsx, lib/gameplay-audio.ts,
app/prototype.tsx, app/globals.css, memori.md. TypeScript/audit/build/diff-check
lulus; uji clamp/default/persistence/event/mute lulus. Uji dengar belum dilakukan.
Publikasi 0183c0a berhasil; GitHub Pages run 34960714832 sukses.
Next action task terbaru: tunggu feedback audio pengguna. Migrasi repo tetap HOLD.

Task audio gameplay terbaru: sembilan efek prosedural selesai di
lib/gameplay-audio.ts dan app/prototype.tsx. TypeScript, audit, build:pages,
diff --check lulus. Belum ada uji dengar langsung di browser/perangkat.
Publikasi 00e1537 sukses, Pages run 34935578548. Gameplay/mute musik tetap.
Next action: tunggu feedback volume/karakter suara dari pengguna.

Publikasi UI arena sesuai instruksi pengguna "publikasikan sekarang".
Carousel, lima portrait skuad, background map, video landing/loading, dan poster
tim selesai. Generator arena-ui, TypeScript, build:pages, diff --check lulus.
Uji browser mencapai loading Tim Merah (29%); visual carousel/mobile belum
diverifikasi karena akses browser terhenti. Jangan mengklaim visual QA selesai.
Publikasi selesai: 726c552, GitHub Pages run 34932815982 sukses.
Gambar hijauload1.jpg terbaru dari ab886b9 ikut digabung dan WebP diregenerasi.
Next action task terbaru: tunggu feedback pengguna; visual carousel/mobile
belum terverifikasi, bukan blocker publikasi yang diminta langsung pengguna.

Task terbaru: loading sebelum seleksi karakter dan pertandingan. Implementasi
di app/prototype.tsx, app/globals.css, lib/asset-ready.ts. Gambar decode sebelum
ditampilkan, video menunggu loadeddata, progres, retry/cancel, batching 4 aset.
TypeScript, audit, build:pages, dan diff --check lulus. Uji helper decode sukses,
gambar kosong, timeout, dan retry lulus. Uji browser interaktif belum dilakukan.
Audio tetap opsional, video menunggu frame awal. Commit d82f7cf sudah dipublish;
GitHub Pages sukses pada run 34796256954.

Proporsi visual 14 karakter mengikuti perbandingan roster pengguna, Kaka = 1.
Skala seragam untuk kedua sumbu; collider, atribut gameplay, dan atlas tetap.
Implementasi visualScale dan posisi HUD kepala selesai.
TypeScript, audit, build:pages, serta diff --check lulus. Perbandingan otomatis
membuktikan seluruh atribut selain visualScale identik dengan HEAD sebelumnya.
Build memberi warning npm/CSS nonfatal. Uji visual interaktif belum dilakukan.
File task ini: lib/characters.ts, app/prototype.tsx, memori.md, CHECKPOINT.md.

## Sudah selesai

- Sembilan kelompok PNG Jago sudah disalin ke `sprite-sources/jago-parts/`.
- Generator deterministik `build-jago-source.mjs` menyusun sumber atlas 7×6.
- Runtime Jago memakai arah lari depan/samping/belakang, parkour tiga arah,
  serta pose khusus penjara, menang, dan kalah.
- Orientasi samping dikoreksi: kanan memakai frame asli; kiri memakai mirror,
  berlaku untuk lari, sprint, dan parkour samping.
- Atlas hasil komposit sudah diperiksa di atas latar terang dan semua 42 sel utuh.
- Pemilihan Tim Merah dan Tim Hijau pada ponsel diperbaiki.
- Tampilan ponsel portrait otomatis memakai layout landscape.
- D-pad dan susunan tombol aksi mobile diperbesar serta dirapikan.
- Tombol mekanik pemain nonaktif selama berada di penjara; menu dan opsi
  non-mekanik tetap aktif.
- Navigasi AI dan perjalanan pulang setelah rescue membaca collider serta water
  mask dan dapat memilih arah alternatif.
- Parkour sungai mencari titik pendaratan darat yang aman.
- Kecepatan, konsumsi boost, dan bias target AI kawan/lawan disetarakan.
- Badge Ultimate Raja/Kaka, status pertandingan, dan penjelasan aturan diperbarui.
- Perubahan dipublikasikan ke GitHub Pages.

## File implementasi terakhir

- `app/prototype.tsx`
- `app/globals.css`
- `scripts/audit-game.mjs`
- `memori.md`

## Validasi terakhir

- `node scripts/build-jago-source.mjs`: lulus.
- `node scripts/build-sprites.mjs jago`: lulus, 42 frame, sel 256×256.
- `npm run sprites:build`: lulus untuk 14 karakter; Jago 42 frame, sel 256×256.
- `npm run sprites:baseline`: hanya lima hash golden Jago yang berubah.
- `npx tsc --noEmit`: lulus.
- `npm run audit`: lulus, termasuk frame kanan asli, mirror kiri, parkour tiga
  arah, dan pose khusus Jago.
- `npm run build:pages`: lulus, bundle produksi GitHub Pages terbentuk.
- Uji runtime lokal: halaman tampil, Tim Hijau dapat dipilih, dan seleksi
  karakter terbuka.
- GitHub Pages workflow: sukses.
- URL publik: <https://lengkongandreuw.github.io/bentengan-squad-tag/>

## Masalah atau blocker tersisa

Tidak ada blocker. Push berhasil melalui akses jaringan yang disetujui.
GitHub Pages untuk 3b02cc5 sukses: workflow run 34793092437.

## Next action

Task loading selesai. Tunggu umpan balik pengguna; uji browser interaktif masih
belum dilakukan, jangan mengklaim sudah diuji langsung pada ponsel.

## Format checkpoint ketika task aktif

```text
State: ACTIVE
Tujuan aktif: [hasil yang harus dicapai]
Sudah selesai: [tahap yang benar-benar selesai]
File yang diubah: [daftar path]
Validasi terakhir: [perintah dan hasil]
Masalah tersisa: [error atau blocker]
Next action: [satu tindakan konkret berikutnya]
Commit terakhir: [hash atau belum dibuat]
```

Jika limit hampir habis atau proses terinterupsi, simpan keadaan kerja apa adanya
dan isi seluruh bagian di atas sebelum berhenti. Jangan menandai tahap sebagai
selesai jika belum dibuktikan oleh pemeriksaan yang relevan.
