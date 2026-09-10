# Bentengan Squad Tag — Checkpoint Pekerjaan

Dokumen ini menyimpan kondisi task yang sedang berjalan. Perbarui setelah setiap
tahap penting agar pekerjaan dapat dilanjutkan tanpa membaca ulang percakapan.

## Status

- State: `ACTIVE`
- Diperbarui: 2026-09-10
- Branch: `main`
- Commit implementasi terakhir: `7e2a9c1`
- Working tree yang diharapkan setelah checkpoint dipublikasikan: bersih

## Tujuan aktif

Mengganti seluruh animasi gameplay karakter Jago dengan sembilan kelompok aset
baru (idle, lari tiga arah, parkour tiga arah, penjara, menang, dan kalah), tanpa
mengubah karakter atau fitur lain, lalu memublikasikannya ke GitHub Pages.

## Sudah selesai

- Sembilan kelompok PNG Jago sudah disalin ke `sprite-sources/jago-parts/`.
- Generator deterministik `build-jago-source.mjs` menyusun sumber atlas 7×6.
- Runtime Jago memakai arah lari depan/samping/belakang, parkour tiga arah,
  serta pose khusus penjara, menang, dan kalah; arah kanan memirror arah kiri.
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
- `npm run audit`: lulus, termasuk pemetaan parkour tiga arah dan pose khusus Jago.
- `npm run build:pages`: lulus, bundle produksi GitHub Pages terbentuk.
- Uji runtime lokal: halaman tampil, Tim Hijau dapat dipilih, dan seleksi
  karakter terbuka.
- GitHub Pages workflow: sukses.
- URL publik: <https://lengkongandreuw.github.io/bentengan-squad-tag/>

## Masalah atau blocker tersisa

Tidak ada blocker aktif.

## Next action

Commit implementasi yang sudah lulus, perbarui memori dengan hash commit, push ke
`github/main`, lalu tunggu workflow GitHub Pages selesai.

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
