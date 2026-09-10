# Bentengan Squad Tag — Memori Proyek

Dokumen ini adalah ringkasan keputusan proyek yang masih berlaku. Gunakan dokumen ini pada task baru agar tidak perlu membaca riwayat percakapan lama.

## Cara memakai dokumen ini

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

- Game web 2.5D Bentengan 5 lawan 5 melawan bot.
- Framework: React 19, TypeScript, Vinext/Vite.
- Node minimum: 22.13.0.
- Empat arena: `kampung`, `pasar`, `taman`, dan `kanal`.
- Empat belas karakter dibagi tetap menjadi Tim Merah dan Tim Hijau.
- Entry gameplay utama dan konfigurasi arena: `app/prototype.tsx`.
- Aturan tim dan spawn: `config/game-rules.json`.

## Status rilis dan pekerjaan aktif

- Branch publik `main` sudah memuat revisi gameplay mobile dan navigasi hazard melalui commit implementasi `7e2a9c1`.
- Tidak ada implementasi fitur yang tertunda saat dokumen ini diperbarui; `CHECKPOINT.md` berstatus `IDLE` dan siap diisi oleh task berikutnya.
- Map 4 memperbesar dunia arena 15% menjadi 1954×1065 dengan ukuran karakter dan komposisi grafis tetap.
- Lebar efektif dua jembatan Map 4 setelah pembesaran adalah sekitar 75,9 px dan 92 px; keduanya melewati kebutuhan minimum 64 px untuk dua karakter berdampingan.
- Rilis terakhir sudah lulus pemeriksaan TypeScript, audit gameplay lengkap, `build:pages`, uji runtime lokal, serta workflow GitHub Pages.

## Kontrol gameplay final

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

- Jago Tim Merah memakai koleksi visual baru untuk idle, lari depan, lari
  samping bercermin kiri/kanan, lari belakang, serta parkour depan/samping/belakang.
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
