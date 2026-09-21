# Bentengan Squad Tag — Checkpoint Pekerjaan

Dokumen ini menyimpan kondisi task yang sedang berjalan. Perbarui setelah setiap
tahap penting agar pekerjaan dapat dilanjutkan tanpa membaca ulang percakapan.

## Status

- State: `ACTIVE`
- Diperbarui: 2026-09-21
- Branch: `main`
- Commit implementasi terakhir: `c548fe6`
- Working tree yang diharapkan setelah checkpoint dipublikasikan: bersih

## Tujuan aktif

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
mobile/asli/non-WebGL sedang dijalankan di work/test-kampung3d.cjs.
Audit sebelum merge lulus lengkap; setelah merge hanya baseline sumber Lala
gagal karena commit upstream ff31445 mengubah sprite-sources/lala.png tanpa
rebuild atlas/baseline. Jangan ubah baseline atau sprite untuk menutupi ini.
Test-kampung3d lulus setelah merge. Autentikasi GitHub terverifikasi valid.
Next action: push github main, tunggu Pages dan catat run. Belum publish.
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
