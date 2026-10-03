# Bentengan Squad Tag — Checkpoint Pekerjaan

Dokumen ini menyimpan kondisi task yang sedang berjalan. Perbarui setelah setiap
tahap penting agar pekerjaan dapat dilanjutkan tanpa membaca ulang percakapan.

## Status

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
