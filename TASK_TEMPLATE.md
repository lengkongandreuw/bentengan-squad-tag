# Template Task Bentengan Squad Tag

Salin blok di bawah ini ke task baru dan hapus bagian yang tidak diperlukan.

```text
Baca PROJECT_CONTEXT.md dan gunakan sebagai konteks proyek. Jangan membaca atau
mengandalkan percakapan task lama kecuali saya secara khusus memintanya.

MODE
[diskusi / inspeksi / implementasi / implementasi + publish]

TUJUAN
[Tuliskan satu hasil utama yang harus selesai.]

SUMBER KEBENARAN
- [Path aset atau referensi final]
- [Screenshot rancangan final]
- [File konfigurasi yang relevan]
- Instruksi ini [menggantikan / melengkapi] instruksi versi sebelumnya.

PERUBAHAN YANG DIMINTA
- [...]
- [...]

JANGAN DIUBAH
- [...]
- [...]

KRITERIA SELESAI
- [...]
- [...]
- Tidak ada collider bertumpuk atau jalur penting yang terputus.
- Tidak ada perubahan di luar scope.

ANGGARAN VERIFIKASI
- Gunakan pemeriksaan paling kecil yang relevan.
- Jangan membangun ulang sprite, audio, atau UI jika tidak berubah.
- Jalankan satu build produksi setelah seluruh perubahan terkumpul.
- Hentikan ketika kriteria selesai sudah terbukti.

PUBLIKASI
[Jangan publish / commit lokal saja / push ke GitHub dan tunggu GitHub Pages]

OUTPUT AKHIR
Laporkan file yang berubah, pemeriksaan yang dijalankan, hasilnya, URL publik jika
dipublish, dan masalah yang masih tersisa. Jawab ringkas.
```

## Contoh singkat untuk revisi map

```text
Baca PROJECT_CONTEXT.md. Implementasikan revisi Map 3 Taman Kota berdasarkan
Assets/map/map3/guide-final.png. Instruksi ini menggantikan desain Map 3 lama.

Pertahankan Map 1, Map 2, Map 4, karakter, audio, UI, dan gameplay. Margin berada
di layer bawah; bangunan dan barrier memiliki collider; area tengah, benteng,
penjara, dan jalur spawn harus dapat dilalui.

Validasi hanya dengan fields:build, audit, dan build:pages. Jangan menjalankan
sprites:build. Setelah semua pemeriksaan lolos, push ke remote github branch main
dan tunggu GitHub Pages selesai.
```

