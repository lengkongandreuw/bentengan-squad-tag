# Bentengan Squad Tag

Prototype game web 2.5D **Bentengan 5v5** dengan aturan prioritas tangkap berdasarkan urutan keluar benteng, penjara dan rescue, sprint terbatas, item refill bertingkat, serta dua belas karakter beranimasi dalam tim tetap Merah dan Hijau.

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

## Kontrol

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
