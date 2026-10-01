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
6. Tandai Arah / animasi ini sudah sesuai. Berpindah arah/seri mempertahankan
   draft hasil proses; arah yang masih perlu diperiksa ditandai ○, siap ditandai ✓.
   Setelah seluruh perubahan yang dipilih sudah sesuai, Simpan & update karakter
   menerapkan semua arah/seri karakter itu dalam satu transaksi. Tidak harus
   mengupload delapan arah: arah yang tidak diganti tetap memakai sprite saat ini.
   Draft karakter lain tetap terpisah. Refresh/menutup tab menghapus draft yang
   belum diterapkan (browser memberi peringatan). Salin, mirror, grid, FPS,
   skala, pivot, reset, dan build lokal berada di Advanced options.
7. Build + Uji game membangun game lokal dan menyediakan tautan untuk mencoba
   karakter di arena sebenarnya. Preview atlas lama hanya ilustrasi; renderer
   game tetap menggunakan mapping khusus Jago/Raja/Maria/Boke/Kaka yang sekarang.
8. Simpan & publish ke GitHub menyimpan batch yang sudah diperiksa terlebih dahulu,
   lalu membuat commit konfigurasi/aset custom, push, dan
   memeriksa status Actions sampai deploy berhasil atau mengembalikan kegagalan.

30 slot: run/tag/parkour masing-masing delapan arah, idle, prisoner, ready,
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
mereset crop. Setelah mengubah sumber/grid/crop, klik Proses upload & preview
sebelum Simpan slot. Sumber asli tidak diubah.
