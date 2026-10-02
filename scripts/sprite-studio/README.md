# Sprite Studio — animasi dalam game

Jalankan PowerShell dari folder proyek:

```powershell
cd "C:\Users\lenovo\Documents\Codex\2026-08-30\sa\game"
npm run admin:sprites
```

Buka http://127.0.0.1:4319/ dan biarkan terminal terbuka. Panel preview selection
yang lama tetap berada di port 4318 (`npm run admin:characters`). Keduanya terpisah.
Panel ini hanya tersedia di komputer lokal; jangan expose port melalui tunnel.

## Mengedit

1. Pilih karakter, jenis animasi, dan arah. Front = bawah layar; back = atas.
2. Upload PNG sheet, GIF/animated WebP, atau beberapa PNG/WebP statis.
   Multi-file diurutkan berdasarkan nama secara numerik (frame1, frame2, frame10).
   ZIP belum didukung; ekstrak ZIP lalu pilih seluruh PNG.
3. Untuk sheet PNG, tentukan kolom/baris/jumlah frame. Urutan opsional memakai
   indeks mulai 0. GIF/WebP animasi otomatis dipisah; tidak perlu menentukan grid.
4. Crop opsional diterapkan sama pada seluruh frame setelah pemisahan sheet.
   Gambar tidak dipotong per pose secara otomatis, untuk menjaga konsistensi kaki.
   Preview memiliki garis pijakan, pivot, dan kotak frame; gunakan langkah frame
   untuk memeriksa kepala/tangan/kaki. Latar yang menyatu tidak otomatis dihapus.
5. Proses upload, lalu atur FPS, loop, mirror, skala, offset X/Y, pivot X/Y.
   Offset menggunakan unit dunia game; pivot menggunakan rasio frame (0–1).
   Pivot default tengah bawah. Seret sprite untuk mengatur offset.
6. Terapkan movement ini saja menyimpan hanya slot aktif, tanpa mewajibkan draft
   lainnya. Alternatif: centang draft yang ingin diterapkan, lalu Terapkan movement
   yang dicentang. Draft lainnya tidak menghalangi penyimpanan. Berpindah seri/arah
   mempertahankan hasil proses. Tidak harus mengupload delapan arah; pilih Default
   untuk satu animasi yang berlaku pada semua arah tanpa override khusus.
   Draft karakter lain tetap terpisah. Refresh/menutup tab menghapus draft yang
   belum diterapkan (browser memberi peringatan). Salin, mirror, grid, FPS,
   skala, pivot, reset, dan build lokal berada di Advanced options.
7. Build + Uji game membangun game lokal dan menyediakan tautan untuk mencoba
   karakter di arena sebenarnya. Preview atlas lama hanya ilustrasi; renderer
   game tetap menggunakan mapping khusus Jago/Raja/Maria/Boke/Kaka yang sekarang.
8. Publish perubahan tersimpan ke GitHub hanya mempublikasikan slot yang sudah
   diterapkan, bukan draft. Membuat commit konfigurasi/aset custom, push, dan
   memeriksa status Actions sampai deploy berhasil atau mengembalikan kegagalan.

81 slot: setiap movement memiliki Default (fallback semua arah) dan delapan arah.
Slot lama tetap kompatibel. Override khusus arah > Default movement > renderer lama.
Movement mencakup run, tag, parkour, idle, prisoner, ready,
ultimate, victory, defeat. Slot belum diisi memakai renderer sebelumnya. Reset
satu slot tidak menghapus aset, slot lain, atau karakter lain. Bersiap mengikuti
countdown; ultimate hanya animasi skill yang sudah ada; rescue memakai sprite
lama. Boost memakai animasi run. Ukuran visual tetap dikalikan proporsi roster.
Tidak mengubah collider, speed, jangkauan tag, AI, atau skill.

## Data dan arsitektur

- `config/sprite-studio.json`: manifest versi 1, override per karakter/per slot.
- `public/sprite-studio/<id>/<sha256>.webp`: atlas lossless, nama hash anti-cache.
- `.preview-admin/sprite-backup-*.json`: backup sebelum Simpan/Reset, diabaikan Git.
- `lib/sprite-studio-model.js`: validasi, slot arah, timing, dan aturan penempatan.
- `lib/sprite-studio.ts`: cache gambar + resolver visual per actor, dimuat pada
  loading pertandingan. Integrasi ada dalam renderer `app/prototype.tsx`.
- `scripts/sprite-studio/`: editor dan server lokal, tidak masuk build publik.

Publish perlu Git + GitHub CLI yang sudah login. Tidak menyimpan token GitHub di
panel. Server memeriksa Host/Origin dan token sesi, validasi format dan path,
revision guard, serta backup. Jika GitHub memiliki commit baru atau ada perubahan
lain/commit belum dipush, selesaikan Git dahulu; studio tidak force-push atau merge
otomatis. Perubahan public UI tidak memengaruhi editor; renderer berikutnya harus
memakai kontrak manifest ini agar animasi custom tetap ditampilkan.

Batas: upload total 30 MB, 128 frame, sisi sumber/atlas 4096 px dan total sumber
64 juta pixel. Sel berbeda ukuran dinormalisasi tengah bawah tanpa stretching.

Verifikasi: `npm run test:sprite-studio`, `npx tsc --noEmit`, `npm run build:pages`.

Preview upload muncul langsung setelah memilih file (GIF/WebP animasi bergerak
tanpa build). Crop visual: seret kotak hijau untuk memindahkan area, atau sudut
kanan bawah untuk resize. Untuk PNG sheet, isi kolom/baris lalu pilih sel yang
diperiksa; crop memakai koordinat dalam setiap sel, bukan seluruh sheet.
Multi-file dapat diperiksa bergantian melalui File sumber. Gunakan seluruh frame
mereset crop. Setelah mengubah sumber/grid/crop, klik Proses & lihat hasil,
terapkan movement aktif atau draft yang dicentang. Sumber asli tidak diubah.
Pemeriksaan awal membaca format dan metadata PNG/GIF/WebP; status dekat upload
menjelaskan diterima/ditolak. Proses juga memvalidasi crop, grid dan ukuran atlas.
