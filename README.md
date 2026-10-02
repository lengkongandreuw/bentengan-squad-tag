# Bentengan Squad Tag

Prototype game web 2.5D **Bentengan 5v5** dengan aturan prioritas tangkap berdasarkan urutan keluar benteng, penjara dan rescue, sprint terbatas, item refill bertingkat, empat arena, serta empat belas karakter beranimasi dalam tim tetap Merah dan Hijau. Map Kampung Merdeka memakai terrain basis kuadran simetris 1538×1096 yang diperbesar 15% pada runtime, dengan susunan objek non-simetris.

Untuk memulai task baru tanpa membaca riwayat percakapan, gunakan [memori.md](memori.md) sebagai sumber konteks kanonik dan salin [TASK_TEMPLATE.md](TASK_TEMPLATE.md).

## Mainkan

Versi publik: <https://lengkongandreuw.github.io/bentengan-squad-tag/>

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Build statis untuk GitHub Pages:

```bash
npm run build:pages
```

## Map Studio — editor map lokal

Jalankan dari folder project dengan `npm run admin:maps`, kemudian buka
<http://127.0.0.1:4320/>. Biarkan terminal terbuka. Panel hanya dapat diakses
di komputer lokal; panel admin tidak dipublikasikan ke GitHub Pages.

1. Pilih **Map kosong**, **Salin Kampung**, atau map tersimpan. Map asli tidak diubah.
2. Isi nama, keterangan dan ukuran dunia. Upload terrain/ikon/objek PNG, GIF atau
   WebP. GIF dikonversi menjadi atlas; atur FPS untuk kecepatan animasinya.
3. Pilih objek, drag untuk memindahkan, gunakan handle untuk mengubah ukuran.
   Collider mendukung persegi, elips dan polygon (edit titik, double-click menambah
   titik, Shift-click menghapus). Gunakan **Pisahkan collider** bila batas tumbukan
   perlu berbeda dari ukuran gambar.
4. Pilih perilaku: dekorasi, solid, parkour, air/jatuh-reset, area lambat atau
   jembatan. Layer background/world/foreground, z-order dan opsi teknis tersedia
   dalam Advanced. Objek world pada z yang sama diurutkan berdasarkan posisi Y.
5. **Simpan map** menyimpan draft lokal. **Uji cepat** menguji gerakan WASD/panah,
   Shift melompat dan Space boost; ini bukan simulasi seluruh pertandingan/bot.
6. Centang **Aktifkan di pilihan arena**, simpan, lalu **Build game** untuk mencoba
   pertandingan sebenarnya. **Publish GitHub** membangun, commit file map saja,
   dan push; tunggu workflow Pages sukses agar game publik berubah.

Manifest modular: `config/map-studio.json`; upload immutable:
`public/map-studio/`. Semua map yang tidak dibuat editor tetap memakai konfigurasi
lama. Backup sebelum save tersedia di `.preview-admin/`. Draft canvas yang belum
disimpan hilang jika tab ditutup (ada peringatan).

Publish menolak perubahan non-map dan commit lokal/remote yang belum sinkron;
tidak melakukan force-push atau merge otomatis sehingga pekerjaan programmer lain
tidak ikut tertimpa. Upload maksimal 30 MB, 128 frame dan atlas 4096×4096;
perkecil sumber/jumlah frame jika batas terlampaui. Ikon memakai frame pertama.
Maksimal 24 map, 300 objek/map, dunia 1000–5000 × 800–5000 unit.

Salinan Kampung mempertahankan latar dan footprint collider. Dekorasi yang telah
menyatu dalam tekstur latar tidak dapat dipindah terpisah: upload terrain bersih
untuk itu. Editor ini mengatur map 2D/2.5D, belum mengimpor model 3D. Validasi jalur
grid 40 unit membantu menemukan akses tertutup, tetapi tetap uji pertandingan.

## Kontrol permainan

- Gerak: `WASD` atau tombol panah
- Sprint: tekan `Space` untuk ledakan lari selama 1,4 detik
- Parkour: `Shift` di dekat rintangan
- Jeda: `P`

## Character Workshop

Gunakan tombol **Character Workshop** di dalam aplikasi untuk memeriksa animasi, arah, kecepatan, skala, dan titik pijakan. Workshop juga dapat memuat sementara sprite sheet PNG/WebP yang dinormalisasi ke atlas produksi 7×6 dan mengekspor konfigurasi preview.

Untuk memproses ulang seluruh sprite sumber:

```bash
npm run sprites:build
```

Pipeline menghasilkan atlas WebP, portrait, dan metadata animasi untuk Raja, Robot, Jago, Lala, Kumis, Tui, Ciici, Kaka, Buto, Maria, Boke, dan Lui.

## Pemeriksaan regresi

Jalankan audit cepat untuk memeriksa roster unik, jarak spawn, kontrol, ukuran atlas, area aman portrait, dan kebocoran antarsel sprite:

```bash
npm run audit
```

Untuk membangun ulang aset sekaligus menjalankan semua pemeriksaan produksi:

```bash
npm run verify
```

## Status

Proyek ini adalah prototype gameplay single-player versus bot untuk memvalidasi mekanik dan game rules sebelum pengembangan multiplayer penuh.
