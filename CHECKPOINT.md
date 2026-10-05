# Bentengan Squad Tag — Checkpoint Pekerjaan

Dokumen ini menyimpan kondisi task yang sedang berjalan. Perbarui setelah setiap
tahap penting agar pekerjaan dapat dilanjutkan tanpa membaca ulang percakapan.

## Status

### 2026-10-05 — Seam: hitsObstacle → modules/gameplay/collision-navigation.ts COMPLETE

- **Seam name and owner:** `hitsObstacle` (+ `ObstacleWorld` type) — `modules/gameplay/collision-navigation.ts` (existing file, collision-navigation ownership).
- **Why selected:** Narrowest valid seam: pure two-source OR (studio solids + expanded rects), 5 call sites, single `ObstacleWorld` contract. `blocked`/`move`/navigation chain, `registerTeamAction`, `beep`, input handlers rejected as too wide.
- **Files changed:**
  - `modules/gameplay/collision-navigation.ts` (+22): `ObstacleWorld` type, `hitsObstacle(x, y, world)` verbatim; imports `studioSolidAt`, `StudioMap` type, `Obstacle` type (matching `spawn.ts` convention).
  - `app/prototype.tsx`: deleted the 4-line local def; one shared `obstacleWorld` object (studioMap, solidObstacles, radius); 5 existing sites route through the local wrapper unchanged. Net +2 lines.
  - `scripts/test-hits-obstacle.mjs` (new): rect hit, 13px expansion edge, empty world.
- **Contract extracted:** `(x, y, { studioMap, rects, radius }) => boolean` — studio hit OR any expanded-rect hit.
- **Tests:** `test-hits-obstacle.mjs` PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS.
- **In-match result:** Not run in browser (headless); predicate identical by construction — same two sources, same radius, same call sites.
- **Revert note:** Delete the `hitsObstacle` block from `collision-navigation.ts`, restore the 4-line local def, delete `obstacleWorld`, revert the import. Single-commit revertible.
- **Prototype line-count delta:** 5994 → 5996 (+2; shared world object costs more than the deleted def — honest cost of the explicit contract).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: formatTime + statPercent → modules/ui/format.ts COMPLETE

- **Seam name and owner:** `formatTime` + `statPercent` — `modules/ui/format.ts` (new file, UI display-formatting ownership).
- **Why selected:** Narrowest valid seam: two pure top-level helpers (clock + percent), 8 call sites total, zero closure deps (`statPercent` uses `lib/math.ts` clamp). `uiAsset`, `registerTeamAction`, `beep`, input handlers, render layers rejected as too wide.
- **Files changed:**
  - `modules/ui/format.ts` (new, ~14 lines): `formatTime(seconds)`, `statPercent(value, min, max)`.
  - `app/prototype.tsx`: deleted both local defs; +1 import line. `clamp` import stays (15+ remaining sites). Net −5 lines.
  - `scripts/test-format.mjs` (new): clock rollover/ceil/negative-floor, percent bounds + clamping + fractional range.
- **Contract extracted:** `formatTime` → `mm:ss` (ceil, floor at 0); `statPercent` → normalized `N%` clamped to 0–100.
- **Tests:** `test-format.mjs` PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS (2.01s).
- **In-match result:** Not run in browser (headless); formatting identical by construction — same arithmetic, same call sites.
- **Revert note:** Delete `modules/ui/format.ts` + `scripts/test-format.mjs`, restore both local defs, remove the import. Single-commit revertible.
- **Prototype line-count delta:** 5999 → 5994 (−5).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop.

### 2026-10-05 — Seam: boardRows → modules/gameplay/bars-score.ts COMPLETE

- **Seam name and owner:** `boardRows` (+ `BoardRow` / `BoardPlayerFacet` types) — `modules/gameplay/bars-score.ts` (existing file, bars-score ownership; completes the stats-store family: store → add → score → rows).
- **Why selected:** Narrowest valid seam: pure team-filter + row projection, 2 call sites (inside `buildStatsBoard` only), facet of 5 player fields, direct testability. `buildStatsBoard` itself rejected (closes over ~10 bindings incl. phase/timers/refs). `beep`, input handlers, `registerTeamAction` rejected as too wide.
- **Files changed:**
  - `modules/gameplay/bars-score.ts` (+30): `BoardPlayerFacet`, `BoardRow`, `boardRows(store, players, team, mvpId)`; +`Team` type import.
  - `app/prototype.tsx`: deleted the 16-line local def; 2 call sites threaded with `players` via `boardRowsOf` alias (no shadowing). Net −15 lines.
  - `scripts/test-board-rows.mjs` (new): order, stats+contribution, mvp flag, team isolation, zero-defaults, input purity.
- **Contract extracted:** `(store, players, team, mvpId) => BoardRow[]` — filter by team preserving input order; rows carry identity + `ensureStats` defaults + `contribution` + `mvp`; inputs never mutated.
- **Tests:** `test-board-rows.mjs` PASS (incl. corrected test bug: distinct round/match stores — sharing one store doubled `addStat` writes). R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS (after fixing `BoardRow` to `Omit<facet,'team'>` — rows intentionally omit team); `lint` 119 (= baseline); `audit` 21 pre-existing failures; `build:pages` PASS (2.01s).
- **In-match result:** Not run in browser (headless); leaderboard rows identical by construction — same filter/map, same store reads, same mvp plumbing.
- **Revert note:** Delete the `boardRows` block + types from `bars-score.ts`, restore the 16-line local def, revert the 2 call sites + import alias. Single-commit revertible.
- **Prototype line-count delta:** 6014 → 5999 (−15).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop (remaining: `buildStatsBoard` shell, `registerTeamAction`, `beep`, P4 input, P2 render layers, P6 loading).

### 2026-10-05 — Seam: roundedOn → modules/ui/canvas-shapes.ts COMPLETE

- **Seam name and owner:** `roundedOn` (+ `rounded` bound locally) — `modules/ui/canvas-shapes.ts` (new file, UI canvas-primitive ownership).
- **Why selected:** Narrowest valid seam in the file: pure 2-call wrapper over the ctx `roundRect` primitive, zero deps, 6 targeted call sites, direct testability, no new dependency. `draw*` layers, `registerTeamAction`, `beep`, input handlers all rejected as too wide.
- **Files changed:**
  - `modules/ui/canvas-shapes.ts` (new, ~13 lines): `roundedOn(target, x, y, w, h, r)`.
  - `app/prototype.tsx`: deleted the 11-line local `roundedOn` def; `rounded` kept as a one-line `ctx`-bound closure (unchanged text); +1 import line. Net −10 lines.
  - `scripts/test-canvas-shapes.mjs` (new): exact call order (beginPath → roundRect with geometry), zero-radius passthrough.
- **Contract extracted:** `(target, x, y, w, h, r) => void` — emits beginPath then roundRect with the passed args, verbatim.
- **Tests:** `test-canvas-shapes.mjs` 2/2 PASS. R1 suites 4/4 PASS.
- **Gates:** `tsc --noEmit` PASS; `lint` 119 (matches baseline exactly, no seam findings); `audit` 21 pre-existing failures (none seam-related); `build:pages` PASS (1.92s, chunk warning pre-existing).
- **In-match result:** Not run in browser (headless); path-construction behavior identical by construction — same two ctx calls, same args, same call sites.
- **Revert note:** Delete `modules/ui/canvas-shapes.ts` + `scripts/test-canvas-shapes.mjs`, restore the 11-line local def, remove the import. Single-commit revertible.
- **Prototype line-count delta:** 6024 → 6014 (−10).
- **Remaining active blockers:** None. Same 21 pre-existing audit failures.
- **Next seam selected:** TBD by next autonomous loop (remaining bulk: P1 rules closures, P2 render layers, P4 input, P6 loading — smallest valid first).

### 2026-10-05 — Seam: pushMatchEvent → modules/game-core/match-state.ts COMPLETE

- **Seam name and owner:** `pushMatchEvent` — `modules/game-core/match-state.ts` (new file, match-state ownership; fulfils the recorded `pushMatchEvent` backlog item, which is now approved as the active seam).
- **Why selected:** Recorded backlog candidate with 8 pre-defined verification points; pure queue semantics, 3 call sites, narrow contract, direct testability, no new dependency.
- **Files changed:**
  - `modules/game-core/match-state.ts` (new, ~45 lines): `MatchEventInput`, `MatchEventQueue`, `pushMatchEvent`.
  - `app/prototype.tsx`: `addMatchEvent` body delegates to `pushMatchEvent` (threading `{events, nextId}` through, reassigning both); +1 import line. Net −13 lines.
  - `scripts/test-match-event.mjs` (new): 8 assertions covering the 8 backlog verification points.
- **Contract extracted:** `(queue, event, now) => queue` — priority rescue 2/tag-else 1, durations tag 2100/rescue 2500/other 1800, filter-then-drop-or-replace, sequential ids (no id consumed on drop), descending-id tie sort.
- **Tests:** `test-match-event.mjs` 8/8 PASS (incl. corrected arithmetic: held queue sits at nextId 5; drop path returns deep-equal array, not shared ref — module filters before checking, behavior identical). R1 suites 4/4 PASS (`tag-contact`, `team-combo`, `collision-navigation`, `click-navigation`).
- **Gates:** `tsc --noEmit` PASS (no output); `lint` — seam files clean, repo-wide failures pre-existing only; `audit` 21 pre-existing failures (sprite/field golden baselines, none seam-related); `build:pages` PASS (2.59s, pre-existing chunk-size warning only).
- **In-match result:** Not run in browser this turn (headless environment); behavior preserved by construction — same priority/duration/id/sort semantics, same 3 call sites, same reset paths (`matchEvents = []` retained).
- **Revert note:** Delete `modules/game-core/match-state.ts` + `scripts/test-match-event.mjs`, restore the 17-line `addMatchEvent` body in `app/prototype.tsx`, remove the import line. Single-commit revertible.
- **Prototype line-count delta:** 6041 → 6028 (−13).
- **Remaining active blockers:** None. 21 pre-existing audit failures (golden baselines) unchanged; no new findings.
- **Next seam selected:** TBD by next autonomous analysis loop (candidates: `log`/`burst` mutators, `input-navigation` slice, `snapshot-write` slice — to be surveyed, smallest valid first).

### 2026-10-04 — Refactor workflow: Phase 1, Phase 2 (step 1–3), Phase 3 selesai (milestone, dilanjutkan G0 di bawah)

- State: SUPERSEDED oleh bagian G0 COMPLETE di bawah (riwayat desain, jangan diulang).
- Tujuan aktif: arsitektur refactor `app/prototype.tsx` mengikuti
  `.workflow/bentengan-refactor/`. Phase 2 selesai untuk step 1, 2, dan 3 saja.
  Step 4 dan 5 di luar cakupan atas keputusan pengguna. Phase 3 (Implementation
  Plan) selesai dan menunggu evaluasi pengguna sebelum Build.
- Sudah selesai:
  - `Review Plan.MD` selesai, 400 baris, ste-lint 0.
  - `phase-1.md` (Analyze) selesai: R1–R14, lima jalur, ATAM, timeline G0–G4,
    jalur terpilih Path A plus amendmen 1 dan 2, keputusan 1A/2A/3B.
  - `phase-2-step-1.md` selesai: tujuh proposal A–G.
  - `phase-2-step-2.md` selesai: bukti ATAM untuk tujuh desain.
  - `phase-2-step-3.md` selesai: Quality Attribute, skor tertimbang, putusan
    **Desain G** (9/11), loop-back tidak aktif.
  - Amandemen kriteria ukuran: 500 baris menjadi target, bukan gate. Kualitas
    batas menang saat seri. `prototype.tsx` difinalisasi paling akhir.
  - `00-context.md` diperluas: prinsip modul, tabel kepemilikan satu penanggung
    jawab, tabel batas area, pohon folder target, kontrak hasil, dan safeguard
    pasca-G3.
  - `03-implement.md` selesai (Phase 3): rencana kerja G0 sampai G4, base
    commit HEAD di `Refactor-Clio`, diagram arus dependensi Mermaid, verifikasi
    per perubahan, dan mitigasi risiko Design G. Pengguna memutuskan rendering
    milik `modules/ui/`, stage 1 milik `modules/game-core/`, dan satu diagram.
  - Putaran review pertama pengguna diterapkan (8 poin, dokumen saja, tanpa
    kerja G0): aturan varian ukuran di bawah 500 baris yang selaras dengan R5,
    aturan anti god-file untuk `match-lifecycle.ts`, diagram audio tiga arah
    (core, gameplay, audio), bukti G0.4/G0.5/G0.7 yang konktrak, kontrak format
    map-data JSON vs TypeScript, dan tabel pemetaan P0 sampai P6 yang
    memastikan tidak ada ekstraksi di luar P0–P6.
- Temuan yang harus diingat: seluruh anchor `file:line` di `Review Plan.MD`
  dipatok di `673ef2a4`, sedangkan file di HEAD sudah 8.570 baris (7.741 di
  pin, +829). G0 wajib menurunkan ulang anchor dan mencatat baseline baru sebelum
  ekstraksi pertama. Angka baseline phase-1 tetap catatan historis berlabel
  "Value at `673ef2a4`".

### 2026-10-04 — Refactor workflow: requestRescue seam COMPLETE (result-object pertama)

- State: ACTIVE (approved analysis → approved slice; pwsh 7.6.6 shell)
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/game-core/match-types.ts` += `MatchEventKind`/`MatchEvent`/
    `RescueRequest` (satu-satunya tipe bersama yang pindah).
  - `modules/gameplay/rescue.ts` baru: `requestRescue(players, prev, cooldown,
    query, now)` murni → `RescueRequestEffects` (request/cooldown/event/
    sounds/bursts/logs). Satu situs `keys 'r'` menerapkan hasil
    (addMatchEvent lokal tetap — backlog `pushMatchEvent` tak tersentuh).
  - `scripts/test-rescue-request.mjs`: guard, assignment terdekat, cooldown,
    kontrak efek lengkap.
  - Loop-back test audio: 1 pin verbatim → pin loop orkestrasi (pasangan
    tetap di-pin test rescue). Tidak ada failure baru di suite mana pun.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 19/19.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: kanalWaterBlocks seam COMPLETE

- State: ACTIVE (survey otonom → build otonom; pwsh 7.6.6 shell)
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/collision-navigation.ts` += `kanalWaterBlocks(x, y,
    waterAt, radius)` — verbatim (pusat + ring 16 sisi); predikat air
    eksplisit, tanpa mask/canvas di modul.
  - `app/prototype.tsx`: definisi lokal dihapus (satu salah-stub langsung
    dikoreksi); 3 situs jadi `(x, y, isWaterAt, PLAYER_COLLISION_RADIUS)`.
  - `scripts/test-kanal-water-blocks.mjs`: center, ring, dry, radius.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 23/23.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: fall-reset seam COMPLETE (riwayat, dilanjutkan kanalWaterBlocks di atas)

- State: SUPERSEDED oleh bagian kanalWaterBlocks di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `match-types.ts` += `PlayerAction` (satu-satunya tipe bersama yang pindah).
  - `spawn.ts` += `resetFallenPlayer(p, round, base, now)` + facet 19 field
    + `FallResetEffects` (bursts/beeps/logs); mutasi posisi/gerak/match/timer,
    efek ke orkestrator. `riverFallCheck` tetap (butuh isWaterAt lokal).
  - `app/prototype.tsx`: definisi lokal dihapus; wrapper tipis
    `applyFallReset` (efek→burst/beep/log); 2 situs jadi wrapper.
  - `scripts/test-fall-reset.mjs`: placement blue/red, reset field, timer,
    efek controlled/bot.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru; pin sungai PASS), build PASS, test 22/22.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: isNearWater seam COMPLETE (riwayat, dilanjutkan fall-reset di atas)

- State: SUPERSEDED oleh bagian fall-reset di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/collision-navigation.ts` += `isNearWater(x, y, query)`
    + tipe `WaterQuery` (hasWater/waterAt) — verbatim, murni.
  - `app/prototype.tsx`: definisi lokal dihapus; 1 situs jadi
    `{ hasWater: Boolean(field.waterMask || studioMap), waterAt: isWaterAt }`.
    Satu salah-stub saat edit langsung dikoreksi sebelum verifikasi.
  - `scripts/test-near-water.mjs`: direct hit, cross 30px, dry-map
    tanpa panggil predikat, miss.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 21/21.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: recoverFromObstacle seam COMPLETE (riwayat, dilanjutkan isNearWater di atas)

- State: SUPERSEDED oleh bagian isNearWater di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/collision-navigation.ts` baru: `recoverFromObstacle(p,
    now, world)` + tipe `CollisionWorld` (kanal/collides/pushOut); mutasi
    hanya x/y; facet struktural kanonis.
  - `app/prototype.tsx`: definisi lokal dihapus; 1 objek `collisionWorld`
    (closures atas `hitsObstacle`/`depenetrateFromRects` + bounds 34/58/32);
    2 situs pakai objek bersama.
  - `scripts/test-recover-obstacle.mjs`: guard tahanan/renang/parkour/bebas,
    happy path, varian kanal.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru; pin depenetrate PASS), build PASS, test 20/20.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: relationColor seam COMPLETE (riwayat, dilanjutkan requestRescue di atas)

- State: SUPERSEDED oleh bagian requestRescue di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert: relation-color + situs,
  test 8 kasus).

### 2026-10-04 — Refactor workflow: drawBase seam COMPLETE (P2 opener) (riwayat, dilanjutkan relationColor di atas)

- State: SUPERSEDED oleh bagian relationColor di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert: draw-base + 2 situs draw,
  test fake-ctx).

### 2026-10-04 — Refactor workflow: line-of-sight seam COMPLETE (riwayat, dilanjutkan drawBase di atas)

- State: SUPERSEDED oleh bagian drawBase di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `lib/collision-navigation.js` += `segmentHitsRect` + `hasLineOfSight`
    verbatim (R10-murni; `studioSolidAt` import, tanpa siklus — model tak
    import apa pun). Satu koreksi churn sendiri (duplikat typedef/const
    saat edit, langsung dibersihkan).
  - `app/prototype.tsx`: 2 definisi lokal dihapus (termasuk perbaikan salah
    stub yang langsung dikoreksi); 1 situs jadi
    `hasLineOfSight(a, b, solidObstacles, studioMap ?? null)`.
  - `scripts/test-line-of-sight.mjs`: segmen tembus/meleset, dinding
    menghalangi, off-path jelas. Dua ekspektasi test yang salah dikoreksi
    oleh perilaku kode (sampel interior saja, endpoint dikecualikan).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 16/16.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: spawn-refill seam COMPLETE (riwayat, dilanjutkan line-of-sight di atas)

- State: SUPERSEDED oleh bagian line-of-sight di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert: spawn.ts + 3 definisi + tipe,
  4 situs setup/reset/timer, test stub-random).
  - `app/prototype.tsx`: tipe + 3 definisi dihapus; setup/reset pakai
    `seedRefills` (destructure `{refills, nextId: refillId}`); blok timer
    pakai return value. `refills`/`refillId`/`nextRefillSpawn` tetap milik efek.
  - `scripts/test-spawn-refill.mjs`: grade kuartil, placement lane-id-expiry,
    sekuens id, blocked-geometri, seed-of-six (stub Math.random).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 15/15.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: tieHash seam COMPLETE (riwayat, dilanjutkan spawn di atas)

- State: SUPERSEDED oleh bagian spawn-refill di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert).
  - `app/prototype.tsx`: definisi lokal dihapus; 4 situs
    (spacing-push, lane, base-exit sort, exit-order sort) jadi
    `tieHash(round, …)` — `round` sudah di scope semua situs.
  - `scripts/test-tie-hash.mjs`: nilai pin eksak, sensitivitas round/id,
    determinisme, rentang uint32.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 14/14.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: fortOccupant seam COMPLETE (riwayat, dilanjutkan tieHash di atas)

- State: SUPERSEDED oleh bagian tieHash di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `lib/math.ts` baru: `other`/`distance`/`clamp` verbatim (R10-murni);
    prototype hapus lokal + import (situs panggil tak berubah).
  - `modules/gameplay/base.ts` baru: `fortOccupant(players, bases,
    baseRadius, kanal, baseTeam, exceptId?)` — body verbatim; facet
    `id/name/team/state/waterEnteredAt/x/y` kanonis (tanpa `string` lebar,
    tanpa import Player); varian kanal dari `isKanalField(field.id)`.
  - `app/prototype.tsx`: definisi lokal dihapus; 5 situs di-thread eksplisit.
  - `scripts/test-math.mjs` + `scripts/test-fort-occupant.mjs`: pin util +
    8 kasus (ketemu, filter tim/state, exceptId, tepi radius, air kanal vs
    biasa, kosong).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 13/13.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: P1 prison-layout slice COMPLETE (riwayat, dilanjutkan fortOccupant di atas)

- State: SUPERSEDED oleh bagian fortOccupant di atas (riwayat desain lengkap
  dipertahankan di bawah untuk referensi revert).
  - `modules/game-core/match-types.ts` baru: `PlayerState` (satu-satunya tipe
    bersama yang dipindah; `PlayerAction` tetap di prototype).
  - `modules/gameplay/prison.ts` baru: `layoutPrisons(prisons, players,
    kanal)` — body verbatim; kontrak mutasi eksak (prisonIndex/x/y/lastX/
    lastY); facet `Team`/`PlayerState` kanonis, tanpa `string` lebar, tanpa
    import tipe Player dari prototype; varian kanal dari
    `isKanalField(field.id)` seperti HEAD (tanpa klaim data-driven).
  - `app/prototype.tsx`: definisi lokal dihapus; 2 situs jadi
    `layoutPrisons(field.prisons, players, isKanalField(field.id))`.
  - `scripts/test-prison-layout.mjs`: 10 kasus (blue/red/kanal/non-kanal,
    multiprisoner, index, sync lastX/lastY, non-prisoner, re-layout rescue,
    input tak termutasi).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 11/11.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: P1.2 stats-store slice COMPLETE (riwayat, dilanjutkan prison di atas)

- State: SUPERSEDED oleh bagian prison-layout di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/bars-score.ts` += `PlayerStats`/`StatsStores`,
    `emptyStats`, `createStatsStore(ids)`, `ensureStats`, `addStat({round,
    match}, …)`, `contributionScore` — semua verbatim, tanpa state/rules lain.
  - `app/prototype.tsx`: tipe + 5 definisi dihapus; init/reset pakai
    `createStatsStore(ids)`; 3 situs `addStat` di-thread ke `{round, match}`.
    `boardRows`/`buildStatsBoard` tetap untuk P3. Bentuk + referensi
    object-identik untuk pembaca board/leaderboard.
  - `scripts/test-stats-store.mjs`: 10 kasus yang diminta (creation,
    defaults, preserve/create, dual-write, isolasi, independensi,
    reset, scoring, shape).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru), build PASS, test 10/10.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

### 2026-10-04 — Refactor workflow: G3 ult-meter slice COMPLETE (riwayat, dilanjutkan P1.2 di atas)

- State: SUPERSEDED oleh bagian P1.2 di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/gameplay/bars-score.ts` baru: `chargeUltimateMeter` murni
    (meter, controlled, id, amount) — bot/non-ultimate diabaikan, clamp 0–100.
  - `app/prototype.tsx`: 2 situs (tag +20, rescue +30) jadi reassign;
    definisi lokal `chargeUltimate` dihapus; import modul.
  - `scripts/test-ultimate-meter.mjs` baru: 9 asersi (abaikan, akumulasi,
    clamp, fraksi). Import `.ts` eksplisit (pola G1.2).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 21 pre-existing
  (0 baru; pin meter/tag/rescue PASS), build PASS, test 9/9.
- Re-validasi P1.1 (tanpa perubahan kode): direct test + 4 suite R1 5/5 PASS,
  tsc bersih, lint 119, audit 21 pre-existing (pin ultimate/meter hijau),
  build PASS. In-match browser (tag +20, rescue +30) tetap untuk pengguna.
- Revert note P1.1: kembalikan definisi lokal `chargeUltimate` + 2 situs
  (`capture` ~2362, `rescue` ~2469) + hapus import modul; `bars-score.ts`
  tetap untuk stats-store. Anchors: konstanta bonus 302–303 (beku Q2),
  ULTIMATE_CHARACTER_IDS dari data.
- Next action: analisis seam strangler berikut sebelum implementasi.
- Commit terakhir: belum dibuat (G0–G3 belum di-commit).

- State: ACTIVE (Build resumed post-L1 approval; this seam per amended L1)
### 2026-10-04 — Refactor workflow: G3 P5 loop-driver seam COMPLETE (riwayat, dilanjutkan slice meter di atas)

- State: SUPERSEDED oleh bagian slice meter di atas.
- Sudah selesai (di `Refactor-Clio`, tanpa merge ke main):
  - `modules/game-core/match-runtime.ts` baru: `startMatchLoop` + guard
    `stopped` (stop idempoten, stop-dari-dalam aman, tanpa loop ganda).
    Urutan HEAD lestari: tick → render → commit, dt clamp 0.033, re-arm
    setelah kerja, sumber waktu campuran tak diubah.
  - `app/prototype.tsx`: blok snapshot → closure `writeSnapshot` (verbatim);
    `loop` + `raf`/`last` → `stopLoop`; kickoff + cancel via driver.
    `update`/`draw`/state/rules tidak tersentuh.
  - `scripts/test-match-loop.mjs` baru: 10 kasus (scheduling, urutan HEAD,
    dt/clamp, re-arm, stop, idempoten, stop-dalam-tick/render/commit, bersih).
- Validasi terakhir: tsc PASS, lint 119 (0 baru; 3 prefer-const test
  diperbaiki), audit 21 pre-existing (7 game + 14 metadata sprite, 0 baru),
  build PASS, test 8/8.
- Next action: seam strangler berikut (kecil, satu perubahan — kandidat:
  konsolidasi teardown ATAU konstruktor snapshot; perlu analisis dulu).
- Commit terakhir: belum dibuat (G0–G3-seam-1 belum di-commit).

### 2026-10-04 — Refactor workflow: L1 amendments (riwayat, Build dilanjut di atas)

- State: SUPERSEDED oleh bagian seam P5 di atas.
- L1Approved + 8 amendemen implementasi Anda telah ditulis ke dokumen:
  1. Urutan frame: loop HEAD `update → draw → snapshot-commit → re-arm`
     (bukan klaim). Guard 10 Hz tiap frame; re-arm SETELAH kerja; dt pertama
     dari (timestamp rAF − performance.now saat setup), clamp 0.033; sumber
     waktu campuran; fokus/visibilitas tak ubah loop; restart = teardown penuh.
  2. Aturan sumber waktu: clock/dt/order HEAD dipertahankan persis.
  3. Kontrak `startMatchLoop` kini memakai guard `stopped` (stop idempoten,
     stop-dari-dalam aman, tanpa loop ganda).
  4. Rencana test `test-match-loop.mjs`: stub rAF/cancel scoped + restore,
     10 kasus (scheduling, urutan, dt/clamp, re-arm, stop, idempoten,
     stop-dalam-tick/render/commit, bersih pasca-cleanup).
  5. Timeout announcement: status "kepemilikan belum jelas" — lestarikan,
     jangan sentuh sampai ekstraksi khusus.
  6. P1 = famili ekstraksi (8 domain kandidat, tanpa skeleton kosong).
  7. State transisional privat ditegaskan di kontrak; tanpa slice shell lepas.
  8. Status L1: "Approved with implementation amendments"; G3 pause sampai
     kontrak + rencana test ini di-review.
- File: `00-context.md`, `03-implement.md`, `CHECKPOINT.md`.
  (`phase-2-step-1.md` §7 tak berubah — verdict tetap.)
- Next action: TUNGGU review Anda atas L1 amendemen sebelum Build P5.

### 2026-10-04 — Refactor workflow: initial loop-back record (riwayat, dilanjutkan amendemen di atas)

- State: SUPERSEDED oleh bagian amendemen L1 di atas.
- Pemicu: temuan analisis Stage 1 — efek HEAD (1184–4556) berisi ±50 closure
  rules + ±40 closure-var bersama; tidak ada tiga region yang dapat diekstrak
  (literal Design G split akan butuh parameter raksasa atau god object).
- Revisi yang ditulis (menunggu review L1 Anda):
  1. `00-context.md`: aturan Strangler (mapping → seams → ekstraksi; game-core
     hanya orkestrasi; tanpa god object publik; tanpa ekstraksi loop/teardown
     tanpa inventori + kontrak + coverage).
  2. `phase-2-step-1.md` §7: revisi Design G (verdict 9/11 tetap).
  3. `03-implement.md` §5/§6/§9/§11: mapping P1–P6 di HEAD (+anchor baru),
     inventori lifecycle 11 baris, kontrak validasi, kontrak ekstraksi pertama
     (`startMatchLoop` + tick/render/commit), risiko revisi, L1 gate.
- Kontrak ekstraksi pertama (PROPOSAL, belum dibangun):
  `match-runtime.ts` — driver rAF + dt clamp + sekuens; update/draw/snapshot
  tetap closure prototype; stop idempoten; test `test-match-loop.mjs` (stub timer).
- Tidak ada commit. Next action: TUNGGU review L1 Anda sebelum Build G3.

### 2026-10-04 — Refactor workflow: G2 Data COMPLETE (riwayat, dilanjutkan loop-back di atas)

- State: SUPERSEDED oleh bagian loop-back di atas (Build dihentikan).
- Sudah selesai (G2.2, di `Refactor-Clio`, tanpa merge ke main):
  - a: 14 `config/characters/*.json` (generator dari tabel) + `lib/characters.ts`
    sebagai reader (import `with { type: 'json' }`, API stabil);
    `ULTIMATE_CHARACTER_IDS` dari data; `characterUsesDedicatedEast` +
    `characterMirrorsWest` dari flags; registry `ULTIMATE_ICONS`/`ULTIMATE_BANNERS`.
    Test `test-character-data.mjs` (round-trip, flags, ultimate beku).
  - b: ±20 situs presentasi ultimate → descriptor + registry (preload banner,
    badge roster, HUD meter/aksi/buff/sentuh/banner).
  - c: 11 situs gameplay → flags + kind-switch (`shield`/`surge`); `isKaka` →
    descriptor; `dedicatedEast` ternary → helper (nilai pemenang identik);
    `ULTIMATE_CHARACTER_IDS` lokal → import lib.
  - d: `character-animation.js` selector → table lookup.
  - Exit R6: 0 cabang id di `prototype.tsx` + `lib/`.
  - Loop-back audit: 2 pin lokasi (mirror, shield) → kontrak baru; 1 pin
    (`Map 4 guide`) terbukti basi sejak baseline (substring tak cocok di mana
    pun) → revert verbatim + flag G4; `roster tim sinkron` HIJAU via JSON.
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 7 game pre-existing +
  14 metadata sprite pre-existing (terbuka oleh perbaikan regex, di luar diff),
  build PASS, test 7/7.
- Next action: G3 Stage 1 — bagi giant effect jadi mount/tick/teardown di
  `modules/game-core/match-lifecycle.ts` (tipis, tanpa aturan).
- Commit terakhir: belum dibuat (G0 + G1 + G2 belum di-commit).

### 2026-10-04 — Refactor workflow: G2.1 P0 map data COMPLETE (riwayat, dilanjutkan G2 di atas)

- State: SUPERSEDED oleh bagian G2 COMPLETE di atas.
- Sudah selesai (G2.1a–e, di `Refactor-Clio`, tanpa merge ke main):
  - a: 10 tipe → `field-types.ts`. b: skalar + worldX/Y → `scalars.ts`.
  - c: `RAW_FIELD_CONFIGS` + `DEFAULT_RAW_PRISONS` → `raw-fields.ts`.
  - d: `KAMPUNG_OPEN_ARENA` → `raw-fields.ts`.
  - e: builders + `GUIDE_FIELD_CONFIGS` + kanal pieces + transform sebagai
    `buildFieldConfigs()` → `guide-fields.ts`; `BASES` + `BASE_RADIUS` →
    `scalars.ts`; `kanal2X` tetap live untuk render via export. Semua
    byte-exact move + wrapper tipis; ekuivalensi diverifikasi via dump
    + hitung tangan (basis kampung/pasar cocok) + `test-field-configs.mjs`.
  - Loop-back audit: 7 asersi pin lokasi lama → kontrak baru (modul + wiring);
    1 pin basi (`waterMask: 'kanal-water-mask.png'`, tak cocok di mana pun
    sejak baseline) dikembalikan verbatim + dicatat sebagai stain pin G4.
- Exit P0: 0 literal peta di `prototype.tsx` (tersisa 1 baris wiring
  `buildFieldConfigs(GUIDE_FIELD_CONFIGS)`).
- Validasi terakhir: tsc PASS, lint 119 (0 baru), audit 8 pre-existing,
  build PASS, test 6/6.
- Next action: G2.2b — cabang presentasi ultimate di prototype → descriptor +
  registry (situs 1039/1042/5000/5866–6165).
- G2.2a SELESAI: 14 `config/characters/*.json` (generator dari tabel, verbatim)
  + `lib/characters.ts` sebagai reader (import JSON `with { type: 'json' }`,
  API stabil); `ULTIMATE_CHARACTER_IDS` dari data; `characterUsesDedicatedEast`
  + `characterMirrorsWest` dari flags; registry `ULTIMATE_ICONS`.
  Test `test-character-data.mjs` PASS (14 file, round-trip, flags, ultimate beku).
  Audit: `definisi karakter dan roster tim sinkron` HIJAU kembali (baca JSON);
  perbaikan itu membuka 14 mismatch metadata sprite pre-existing (file di luar
  diff, isu asset-pipeline, TANPA tindakan — bukan regresi).
  Gates: tsc PASS, lint 119, build PASS.
- Catatan stat-quirk: beberapa file tampil M dengan diff kosong (fenomena
  autocrlf/index); 6 file manifest/baseline dibersihkan via checkout (konten
  identik); 4 file config milik pengguna dibiarkan apa adanya.
- Commit terakhir: belum dibuat (G0 + G1 + G2.1 belum di-commit).

### 2026-10-04 — Refactor workflow: G1 cheap decoupling COMPLETE (riwayat, dilanjutkan G2.1 di atas)

- State: SUPERSEDED oleh bagian G2.1 COMPLETE di atas.
- Sudah selesai (G1.3, di `Refactor-Clio`, tanpa merge ke main):
  - `modules/ui/character-workshop/character-workshop.tsx` baru: pindahan
    verbatim 148 baris (hanya kedalaman import `../` → `../../../`).
  - `app/prototype.tsx`: import menunjuk lokasi baru; render
    `<CharacterWorkshop onClose>` tidak berubah — workshop tetap reachable
    in-game (keputusan 2A).
  - `components/character-workshop.tsx` dihapus (satu-satunya importir
    adalah prototype).
  - `scripts/audit-game.mjs`: path baca workshop → lokasi baru; 2 asersi
    (boost directional, pixel ratio) PASS.
- File yang diubah: `modules/ui/character-workshop/` (baru),
  `components/character-workshop.tsx` (hapus), `app/prototype.tsx`,
  `scripts/audit-game.mjs`, `CHECKPOINT.md`.
- Validasi terakhir: tsc PASS 0 error, lint 121 (temuan ikut pindah file,
  0 baru), audit 8 gagal pre-existing, build:pages PASS, `node --test`
  5/5 PASS.
- Exit G1: 0 `localStorage` di `app/`, 0 `gameplayAudio.play` di `app/`,
  `modules/ui/character-workshop/` ada dan terbuka di game.
- Next action: lanjut G2.1b — skalar peta (W/H/DESIGN/MAP_*_dims, worldX/worldY)
  → `modules/world/map-data/scalars.ts`; prototype import.
- G2.1a SELESAI (2026-10-04): 10 tipe peta → `modules/world/map-data/field-types.ts`;
  prototype hapus duplikat + `import type`. tsc PASS, lint 121 (0 baru),
  audit 8 pre-existing, build PASS, test 5/5.
- G2.1b SELESAI: skalar peta (DESIGN/W/H/MAP_*_dims/MAP_OBJECT_SCALE/worldX/worldY)
  → `modules/world/map-data/scalars.ts`; prototype import. Gates sama hijau.
- G2.1c SELESAI: `RAW_FIELD_CONFIGS` + `DEFAULT_RAW_PRISONS` (±1.226 baris,
  byte-exact move) → `modules/world/map-data/raw-fields.ts` (export, nonaktif
  tetap nonaktif). Loop-back audit: 3 asersi pin lokasi lama (W/H/WORLD_SCALE_X,
  MAP4_WORLD_SCALE, grounds dirt/concrete/grass) → kontrak baru (modul + wiring).
  Gates: tsc PASS, lint 121, audit 8 pre-existing, build PASS, test 5/5.
- G2.1d SELESAI: `KAMPUNG_OPEN_ARENA` (±304 baris, byte-exact move) →
  `modules/world/map-data/raw-fields.ts` (export). Gates: tsc PASS, lint 120,
  audit 8 pre-existing, build PASS, test 5/5.
- Commit terakhir: belum dibuat (G0 + G1 belum di-commit).

### 2026-10-04 — Refactor workflow: G1.2 audio port COMPLETE (riwayat, dilanjutkan G1 di atas)

- State: SUPERSEDED oleh bagian G1 COMPLETE di atas.
- Sudah selesai (G1.2, di `Refactor-Clio`, tanpa merge ke main):
  - `modules/audio/audio-port.ts` baru: `AudioPort` (`play`/`close`) +
    `createMatchAudio()` per-match; memiliki unlock wiring agar root hanya
    create + close. Attenuasi jarak tetap di call site.
  - `app/prototype.tsx`: 13 situs `gameplayAudio.play` → `matchAudio.play`
    (nama `audio` sudah dipakai audio menu → `matchAudio`); import engine,
    setup, dan teardown dipindah ke port. Grep: 0 `gameplayAudio` di `app/`.
  - `scripts/test-audio-port.mjs` baru: pin 13 situs verbatim + kontrak
    (wiring, play aman 9 suara, close idempotent). Perintah:
    `node --experimental-strip-types --test scripts/test-audio-port.mjs`.
  - Testabilitas TS-di-node: 3 import rantai audio memakai ekstensi `.ts`
    eksplisit + `allowImportingTsExtensions: true` di `tsconfig.json`.
- File yang diubah: `modules/audio/audio-port.ts` (baru),
  `scripts/test-audio-port.mjs` (baru), `app/prototype.tsx`,
  `lib/gameplay-audio.ts` + `lib/audio-settings.ts` (ekstensi import),
  `tsconfig.json`, `CHECKPOINT.md`.
- Validasi terakhir: tsc PASS 0 error, lint 121 (0 baru di file sentuhan),
  audit 8 gagal pre-existing (mute PASS), build:pages PASS, `node --test`
  5/5 PASS (4 lama + audio).
- Next action: mulai G1.3 — pindah workshop ke `modules/ui/`.
- Commit terakhir: belum dibuat (G0 + G1.1 + G1.2 belum di-commit).

### 2026-10-04 — Refactor workflow: G1.1 storage wrapper COMPLETE (riwayat, dilanjutkan G1.2 di atas)

- State: SUPERSEDED oleh bagian G1.2 COMPLETE di atas.
- Sudah selesai (G1.1, di `Refactor-Clio`, tanpa merge ke main):
  - `modules/storage/local-settings.ts` baru: satu-satunya pemilik kunci
    `bentengan:music-muted` + `benteng-audio-levels-v1`; `load/saveMusicMuted`,
    `load/saveLevelSnapshot` (parse ketat, tolak bentuk buruk, tak pernah
    throw). Runtime terverifikasi via stub `window` (round-trip, tolak JSON
    rusak, aman tanpa window).
  - `app/prototype.tsx`: 2 situs mentah → wrapper; konstanta
    `MUSIC_MUTED_STORAGE_KEY` dihapus. Grep: 0 `localStorage` di `app/`.
  - `lib/audio-settings.ts`: baca/tulis level via wrapper; cache, clamp,
    event tidak berubah.
  - Loop-back audit: asersi mute di `scripts/audit-game.mjs:204` memeriksa
    lokasi lama → diperbarui ke kontrak baru (wrapper + pemakaian).
    Bukan baseline-hash, jadi pembaruan asersi adalah perbaikan benar, bukan
    menutupi regresi.
- File yang diubah: `modules/storage/local-settings.ts` (baru),
  `app/prototype.tsx`, `lib/audio-settings.ts`, `scripts/audit-game.mjs`,
  `CHECKPOINT.md`.
- Validasi terakhir: tsc PASS 0 error, lint 122 (0 baru), audit 8 gagal
  pre-existing (asersi mute PASS kembali), build:pages PASS, stub wrapper PASS.
- Pelajaran: JANGAN `npm run format` telanjang — oxfmt memformat 316 file.
  Sudah di-revert kecuali file tugas; diff kini hanya set intentional.
  Format secukupnya per file yang disentuh bila diperlukan.
- Next action: mulai G1.2 — `modules/audio/audio-port.ts` + mock test per situs.
- Commit terakhir: belum dibuat (G0 + G1.1 belum di-commit).
- Sudah selesai (G0, di branch `Refactor-Clio`, tanpa merge ke main):
  - G0.1 `npm ci` lulus (564 paket).
  - G0.2 Q4 ditutup: tidak ada aturan path-restriction di `.oxlintrc.json`;
    `dependency-cruiser` tidak ditambahkan (default sesuai rencana).
  - G0.3 skrip `check` ditambahkan ke `package.json`.
  - G0.4 CI `pages.yml`: job lint, typecheck, audit disisipkan sebelum
    `build:pages`. Belum di-merge; pengguna yang merge ke main.
  - G0.5 `checkJs: true` + 114 error JS diperbaiki via JSDoc (10 file `lib/`,
    tanpa perubahan runtime; 2 fallback `?? 0` netral, 1 cast `as FieldId`,
    1 predikat filter). `tsc --noEmit` PASS 0 error.
  - G0.6 baseline tercatat di `03-implement.md` §4: tsc PASS, lint 122
    (pre-existing), audit FAIL 8 asersi (pre-existing), build:pages PASS.
    Varian: `npm run check` ujung-ke-ujung belum hijau di baseline; aturan
    per-ekstraksi: tidak ada lint/audit baru, tsc bersih, build hijau.
  - G0.7 tiga characterization test baru PASS + 1 lama: `test-tag-contact`,
    `test-team-combo`, `test-collision-navigation`, `test-click-navigation`
    (4/4 via `node --test`).
- File yang diubah: `package.json`, `.github/workflows/pages.yml`,
  `tsconfig.json`, `lib/*.js` (10 file, JSDoc saja), `app/prototype.tsx`
  (1 cast type), `lib/selection-preview-assets.ts` (1 predikat),
  `scripts/test-{tag-contact,team-combo,collision-navigation}.mjs` (baru),
  `.workflow/bentengan-refactor/03-implement.md`, `CHECKPOINT.md`.
- Validasi terakhir: tsc PASS, lint 122 (0 di file sentuhan G0), audit FAIL 8
  (sama dgn baseline), build:pages PASS, `node --test` 4/4 PASS.
- Masalah tersisa: lint/audit признать pre-existing di HEAD; jangan
  diperbaiki borongan (melanggar blast radius). Anchor `673ef2a4` tetap
  historis; baseline G0 yang berlaku.
- Next action: mulai G1.1 — wrap 2 touchpoint storage ke
  `modules/storage/local-settings.ts`.
- Commit terakhir: belum dibuat (file workflow + G0 belum di-commit).

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
