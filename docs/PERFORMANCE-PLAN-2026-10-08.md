# Rencana Perbaikan Performa Gameplay — 8 Oktober 2026

Basis kode: commit `0b7c3fd` (GitHub `main` = folder lokal). Nomor baris di bawah
mengacu ke commit ini; cari ulang dengan `grep` bila kode sudah bergeser.

Rencana dibagi menjadi tahap kecil yang **masing-masing bisa dikerjakan di task
terpisah**. Setiap tahap mencantumkan file dan baris yang relevan, sehingga task
tidak perlu membaca `app/prototype.tsx` (±8.700 baris) secara utuh. Kerjakan
berurutan; tahap 1–2 memberi dampak terbesar dengan biaya paling kecil.

## Ringkasan hasil audit

Diukur pada match single-player sungguhan: Kampung Merdeka, Raja, 1366×768,
`?performance=1`, Chromium headless, 2 core, **tanpa GPU** (software raster).
Angka absolut lebih pesimis dibanding PC dengan GPU; perbandingan antarskenario valid.

| Temuan | Bukti | Dampak | Tahap |
|---|---|---|---|
| Blur pada layar hasil ronde/match | 24 fps dengan blur, 56 fps tanpa | Besar | 1 |
| Resolusi canvas HiDPI (preset Tinggi, DPR 2) | 2732×1536 → draw 35 ms, 25 fps; Ringan 60 fps | Besar | 2 |
| Patah-patah saat sprite/atlas pertama tampil | 7–16 frame 40–100 ms per 30 detik | Sedang | 3 |
| `dt` dibatasi 33 ms, buff/cooldown pakai jam dinding | CPU 4× lambat: gerak & timer ±45% lebih lambat | Sedang (keadilan) | 4 |
| Salin + validasi state setiap frame | ±0,3 ms/frame + sampah GC | Kecil | 5 |
| Gerbang video `.mp4` memblokir masuk game | "Gagal memuat video tim." di browser tanpa H.264 | Robustness | 6 |

Sudah sehat (tidak perlu disentuh): logika game 0,6–0,8 ms/frame, HUD React ±1%
CPU, heap stabil 11–25 MB selama 150 detik, jumlah DOM stabil.

## Aturan umum semua tahap

- Baca `memori.md` hanya bagian yang relevan; jangan membaca riwayat percakapan.
- Jangan ubah map, sprite, audio, balance, atau aset di luar scope tahap.
- Jangan jalankan `npm run verify` / `sprites:build`; cukup pemeriksaan per tahap.
- Ukur sebelum/sesudah dengan `?performance=1`
  (`canvas[data-runtime-performance]` → `drawMs`, `worstWorkMs`, `frames`).
- Publish mengikuti aturan `memori.md`, kecuali task menulis `jangan publish`.

---

## Tahap 1 — Layar hasil ronde/match tanpa blur (UI saja)

**Tujuan:** FPS saat layar hasil terbuka kembali ±60 di mesin lemah.

**Penyebab:** `.round-stats-overlay` memakai `backdrop-filter: blur(3px)`
(`app/globals.css` ±baris 4334), sementara canvas di belakangnya digambar ulang
60×/detik, sehingga blur dihitung ulang setiap frame.

**Perubahan:**
1. `app/globals.css` — hapus `backdrop-filter` pada `.round-stats-overlay`,
   naikkan opasitas latar (mis. `rgba(2,5,4,.78)`) agar keterbacaan tetap sama.
2. (Opsional, lebih hemat) Di loop (`app/prototype.tsx` ±baris 6519–6520), saat
   `phase` adalah `ROUND_OVER`/`MATCH_OVER` dan overlay statistik terlihat,
   gambar canvas cukup ±10 fps (lewati `draw` bila `localNow - lastDraw < 100`).
   Simulasi, timer, dan jaringan tetap berjalan normal.
3. Perbaiki tes usang `scripts/test-route-performance.mjs` baris 63: string
   yang dicari sekarang
   `if(!clientOnly&&!paused && phase==='PLAYING') routeScheduler.run();`.

**Jangan diubah:** isi/urutan panel statistik, XP, reward, overlay lain
(`.start-panel`, `.rules-overlay`, `.asset-loading-card` tidak di jalur gameplay).

**Verifikasi:**
`node --test scripts/test-route-performance.mjs scripts/test-runtime-performance.mjs`,
lalu `npm run build:pages`. Cek visual satu screenshot layar MATCH SELESAI.

**Selesai bila:** FPS layar hasil ≈ FPS gameplay; tes performa lolos 54/54.

---

## Tahap 2 — Resolusi canvas adaptif (grafis)

**Tujuan:** Pengguna layar HiDPI tidak otomatis memakai canvas 4× piksel.

**Penyebab:** `lib/graphics-settings.js` — default `normalizeGraphics` adalah
`'high'` (`maxDpr: 2`, `scale: 1`). Biaya gambar naik sebanding jumlah piksel.

| Preset | Canvas (DPR 2) | drawMs | FPS |
|---|---|---|---|
| Tinggi | 2732×1536 | 35,3 | 25 |
| Seimbang | 2049×1152 | 23,5 | 37 |
| Ringan | 1025×576 | 8,4 | 60 |

**Perubahan:**
1. Tambah preset `auto` sebagai default baru (bila pengguna belum pernah memilih):
   resolusi awal setara Seimbang bila `devicePixelRatio > 1`, setara Tinggi bila 1.
   Pilihan manual yang sudah tersimpan di `benteng-graphics-v1` tetap dihormati.
2. Hanya untuk `auto`: skala resolusi dinamis. Di loop, hitung rata-rata waktu
   frame per 2 detik; bila > 20 ms turunkan skala 0,1 (minimum 0,6), bila < 12 ms
   naikkan 0,1 (maksimum sesuai DPR). Terapkan lewat `graphicsPixelRatio`
   (`app/prototype.tsx` `draw`, ±baris 6289). Beri jeda ≥2 detik antarperubahan
   agar tidak berkedip.
3. Tambahkan label "Otomatis" di `components/graphics-settings.tsx`.

**Jangan diubah:** ukuran dunia, kamera, ukuran karakter, smoothing, partikel
preset lain.

**Verifikasi:** `node --test scripts/test-graphics-settings.mjs` (perbarui untuk
`auto`), `npm run build:pages`. Ukur `drawMs` dengan `deviceScaleFactor: 2`.

**Selesai bila:** default baru di DPR 2 ≥ 50 fps pada mesin uji; preset manual
lama berperilaku sama.

---

## Tahap 3 — Kurangi patah-patah (frame spike)

**Tujuan:** `worstWorkMs` di bawah ±33 ms setelah countdown.

**Pengamatan:** frame lambat terjadi di `draw`, ketika sprite karakter atau atlas
properti map (`field/objects.webp`, 2048×2176) pertama kali digambar (contoh:
Kaka/Maria 50–65 ms; frame pertama map 420–550 ms saat countdown). Sesekali satu
pencarian rute A* memakan ±15 ms.

**Langkah 3a — ukur di PC sendiri dulu (wajib, murah):** buka game dengan
`?performance=1`, main 1 menit, catat `worstWorkMs` beberapa kali. Bila sudah
< 33 ms di PC/laptop target, hentikan tahap ini (masalah hanya terjadi di
software raster).

**Langkah 3b — pre-warm atlas di gerbang loading:** setelah `imageReady` di
gerbang loading (`app/prototype.tsx` ±baris 3119 dan ±7600), gambar setiap atlas
karakter (atlas/series/ultimate runtime) dan atlas objek map sekali ke canvas
tersembunyi 1×1 (`drawImage(img, 0, 0, 1, 1)`), supaya decode tidak terjadi di
tengah match. Tambahkan juga atlas yang hanya dipakai karakter yang ada di roster
match.

**Langkah 3c — batasi waktu A* (opsional):** di `lib/route-scheduler.js` /
`lib/click-navigation.js`, beri batas iterasi per frame dan lanjutkan di frame
berikutnya bila rute belum selesai. Pertahankan paritas rute (tes
`test-route-performance.mjs` membandingkan rute persis).

**Verifikasi:** `node --test scripts/test-route-performance.mjs scripts/test-click-navigation.mjs`,
`npm run build:pages`, ukur `worstWorkMs`.

**Selesai bila:** tidak ada spike > 50 ms setelah countdown dalam 1 menit main.

---

## Tahap 4 — Fixed timestep simulasi (gameplay, paling berisiko)

**Tujuan:** Kecepatan gerak dan timer sama di semua FPS.

**Penyebab:** loop (`app/prototype.tsx` ±baris 6455) memakai
`dt = Math.min(0.033, …)`. Di bawah 30 fps simulasi melambat, padahal buff,
perisai, cooldown, dan durasi ultimate memakai `now` (jam dinding). Contoh: buff
Raja 5 detik tetap habis 5 detik nyata, tetapi pemain bergerak lebih lambat.

**Perubahan:**
1. Ganti `update(dt, now)` di jalur host/single-player dengan accumulator:
   langkah tetap 1/60 detik, maksimum 4 langkah per frame (sisanya dibuang agar
   tidak "spiral of death").
2. Jalankan `routeScheduler.run()` tetap sekali per frame render.
3. Selaraskan dengan `simulationClock` (`lib/game-core/tick.ts`, default 30 Hz;
   dipakai multiplayer di baris 4826 dan 6505). Putuskan satu sumber kebenaran,
   jangan dua jam simulasi berbeda.
4. Interpolasi posisi untuk render tidak wajib di tahap ini.

**Jangan diubah:** angka balance (kecepatan, jarak tag, durasi), protokol
multiplayer, format snapshot.

**Verifikasi:** `npm run test:game-core`, `npm run test:multiplayer`,
`node --test scripts/test-flight-ultimate.mjs`, `npm run audit`,
`npm run build:pages`. Uji manual dengan CPU throttle 4× di DevTools: jarak
tempuh 5 detik harus sama dengan tanpa throttle (toleransi ±5%).

**Selesai bila:** gerak dan timer konsisten pada 30/60/144 Hz dan saat throttle;
semua tes lolos.

---

## Tahap 5 — Kurangi alokasi per frame (kecil)

**Penyebab:** setiap frame `readCanonicalState` → `describeMatch` menyalin seluruh
state dan menjalankan `assertJsonData` rekursif (`lib/game-core/state.ts`), lalu
`createRenderAdapter` (`lib/game-core/render-state.ts`) menyalin lagi.

**Perubahan:**
1. Tambah opsi `describeMatch(source, {validate:false})` untuk jalur render;
   validasi tetap aktif di dev, tes, dan saat membuat snapshot jaringan.
2. Host multiplayer: `readCanonicalState` dipanggil dua kali per snapshot
   (`app/prototype.tsx` ±baris 6508–6509); cukup satu kali.

**Verifikasi:** `npm run test:game-core`, `npm run test:multiplayer`,
`npm run build:pages`.

**Selesai bila:** perilaku identik, `updateMs` + persiapan render turun.

---

## Tahap 6 — Video tim tidak boleh memblokir game (robustness)

**Penyebab:** `videoReady` (`lib/asset-ready.ts`) dipanggil di gerbang loading
(`app/prototype.tsx` ±baris 3125). Bila browser tidak bisa memutar `.mp4`
(H.264), pemain tertahan di "Gagal memuat video tim."

**Perubahan:** jadikan video opsional — bila gagal/timeout, lanjutkan dengan
gambar statis/latar tim dan catat peringatan, bukan error yang memblokir.
Opsional: sediakan versi `.webm` sebagai sumber kedua.

**Verifikasi:** `npm run test:loading-admin` (bila menyentuh model loading),
`npm run build:pages`, buka di browser tanpa H.264 (Chromium).

**Selesai bila:** pilih tim → pilih karakter → mulai match berjalan meski video
gagal dimuat.

---

## Template prompt per tahap

Salin, ganti `N`, lalu kirim sebagai task baru:

```text
Baca docs/PERFORMANCE-PLAN-2026-10-08.md bagian "Tahap N" dan aturan umum.
Kerjakan hanya tahap itu. Jangan membaca prototype.tsx utuh; gunakan grep pada
baris yang disebut. Jalankan hanya verifikasi yang tercantum.
[jangan publish / publish]
Laporkan ringkas: file berubah, angka sebelum/sesudah, hasil tes.
```
