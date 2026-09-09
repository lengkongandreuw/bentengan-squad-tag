# Bentengan Squad Tag — Checkpoint Pekerjaan

Dokumen ini menyimpan kondisi task yang sedang berjalan. Perbarui setelah setiap
tahap penting agar pekerjaan dapat dilanjutkan tanpa membaca ulang percakapan.

## Status

- State: `IDLE`
- Diperbarui: 2026-09-09
- Branch: `main`
- Commit implementasi terakhir: `7e2a9c1`
- Working tree yang diharapkan setelah checkpoint dipublikasikan: bersih

## Tujuan aktif

Tidak ada. Menunggu permintaan implementasi berikutnya.

## Sudah selesai

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

- `npx tsc --noEmit`: lulus.
- `npm run audit`: lulus, 14 karakter, 588 frame, dan 57 sumber field.
- `npm run build:pages`: lulus.
- Uji runtime lokal: halaman tampil, Tim Hijau dapat dipilih, dan seleksi
  karakter terbuka.
- GitHub Pages workflow: sukses.
- URL publik: <https://lengkongandreuw.github.io/bentengan-squad-tag/>

## Masalah atau blocker tersisa

Tidak ada blocker aktif. Item audit yang sebelumnya diminta untuk dibiarkan
belum menjadi bagian dari scope sampai ada instruksi baru.

## Next action

Saat permintaan baru diterima:

1. Baca `memori.md`, `TASK_TEMPLATE.md`, dan dokumen ini.
2. Ubah State menjadi `ACTIVE` dan tulis satu tujuan konkret.
3. Periksa `git status` dan commit terakhir sebelum mengedit.
4. Lanjutkan hanya dari `Next action`; jangan mengulang validasi yang sudah lulus
   kecuali perubahan baru menyentuh bagian tersebut.
5. Setelah implementasi selesai, jalankan pemeriksaan terkecil yang relevan,
   perbarui checkpoint, commit, push ke `github/main`, dan tunggu GitHub Pages.

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
