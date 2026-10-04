# Bentengan Squad Tag — Memori Proyek

Dokumen ini adalah ringkasan keputusan proyek yang masih berlaku. Gunakan dokumen ini pada task baru agar tidak perlu membaca riwayat percakapan lama.

## Cara memakai dokumen ini

2026-10-04 Ultimate Flight Batch01: Bebe/Ciici shared controller,4sec actual
FLYING only tag immunity,locked interactions,takeoff/landing vulnerable,selective
colliders and safe landing. Bebe speed1.25 turn0.85; Ciici1.20/1.15. Existing
Raja/Kaka unchanged. Sprite Studio adds exactly3 default-only slots for these
two: ultimate_takeoff,ultimate_fly,ultimate_land. Canonical artwork missing,
generic ultimate/idle fallback temporary. Icons use user's originals. Preserve
user local map/sprite drafts; Economy01 still LOCAL ONLY. See checkpoint.

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
