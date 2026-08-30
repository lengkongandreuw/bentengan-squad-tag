# Bentengan Squad Tag

Prototype game web 2.5D **Bentengan 5v5** dengan aturan prioritas tangkap berdasarkan urutan keluar benteng, penjara dan rescue, stamina boost, item refill bertingkat, serta enam karakter beranimasi.

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
- Boost: tahan `Shift`
- Parkour: `Space`
- Jeda: `P`

## Character Workshop

Gunakan tombol **Character Workshop** di dalam aplikasi untuk memeriksa animasi, arah, kecepatan, skala, dan titik pijakan. Workshop juga dapat memuat sementara sprite sheet PNG/WebP yang dinormalisasi ke atlas produksi 8×6 dan mengekspor konfigurasi preview.

Untuk memproses ulang seluruh sprite sumber:

```bash
npm run sprites:build
```

Pipeline menghasilkan atlas WebP, portrait, dan metadata animasi untuk Robot, Ciici, Kaka, Buto, Jago, dan Raja.

## Status

Proyek ini adalah prototype gameplay single-player versus bot untuk memvalidasi mekanik dan game rules sebelum pengembangan multiplayer penuh.
