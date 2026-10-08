# Rencana UI Sound Settings — aset asli (2026-10-04)

Status awal: **REFERENSI LOKAL SAJA.** Update MODULE17: aset telah digunakan
untuk implementasi UI audio lokal, **belum dipublish**, sesuai brief baru.
Salinan runtime tanpa perubahan desain ada di public/ui-v2/audio-settings/.
Permintaan pengguna hanya menyimpan dan menganalisis tujuh komponen untuk
pengembangan berikutnya. Nama file asli (termasuk `posiitive`) dipertahankan.
Salinan diperiksa SHA256 identik dengan sumber C:/Users/lenovo/Downloads/.
Tidak ada perubahan pada runtime, volume tersimpan, gameplay atau draft map.

## Inventaris dan fungsi yang disarankan

| File | Dimensi PNG | Fungsi rencana | SHA256 |
| --- | --- | --- | --- |
| header panel.png | 752 × 274 | Latar judul SOUND SETTINGS / PENGATURAN AUDIO; teks putih pada bidang hitam | 70dce98f72f33d3b7af108a9b1697dc844c51398b3768b7709e4a5fdcea06fc8 |
| panel card.png | 1011 × 555 | Panel utama; teks gelap dan kontrol di bidang putih | 7f325134f204ac0a3b3acd5596226ef92eb23f1ca39f9d1bcd715a2fa01941b9 |
| negative bar.png | 498 × 224 | Tombol sekunder: Kembali / Tutup / Hentikan preview | 8db672234aac0411a83b1545f5a3cefca3f9c02be49b4008fb8bff2520c09e9c |
| posiitive button.png | 527 × 223 | Tombol utama: Dengar preview, atau konfirmasi jika model simpan berubah | da3d7853b1382e9c3c84b32020db2d8a64122a277892d9916b0c32ac145f5d14 |
| slider_bar_penuh.png | 1742 × 238 | Lapisan isi volume ungu, dipotong sesuai persentase | cbb871802fc2a6ff55e5e6f87c4411012d5a28c8618e72b4b5873ba69d984371 |
| slider_bar_kosong.png | 1738 × 198 | Track volume dasar abu-abu | 2feb74a2f0345b62a79e4233003a5b7e2da582393d5198ecd4278b60784e59a1 |
| knob slider.png | 278 × 257 | Knob/handle slider; pusat lingkaran putih sebagai anchor | cb771cfcc24d3c9fd43fb7ca28b228609590b40570b85873c5679e15b26b6f17 |

Total asli: 1,285,988 bytes (~1.23 MiB). Seluruh aset memiliki alpha dan area
transparan; warna hitam pada screenshot bukan alasan untuk menghapus warna
hitam dari PNG. Bingkai hitam merupakan bagian penting artwork. Panel card
memiliki alpha maksimum254, sedikit tembus; gunakan dasar yang sesuai bila
kontras teks terhadap latar game kurang kuat.

## Analisis desain

- Bahasa visual street/graffiti, sudut tajam, tinta/halftone; ungu sebagai aksen
  untuk pengaturan audio, putih/hitam sebagai kontras utama.
- Header: bidang gelap memanjang dengan dekorasi yang memakan area atas/bawah;
  pusatkan judul di bidang dalam, bukan sekadar pusat seluruh kanvas PNG.
- Card: bidang putih luas untuk dua baris volume Musik latar dan SFX; sisakan
  safe padding di seluruh sisi agar tulisan tidak menyentuh bingkai bergerigi.
- Negative dan positive memiliki ukuran/aspect berbeda. Jangan stretch ke
  kotak sama dengan distorsi; gunakan contain dan area hit tombol terpisah.
- Beberapa ekspor memuat bentuk/fragmen di tepi, terutama bagian atas card
  dan sudut atas kiri tombol ungu. Review crop visual dengan pengguna sebelum
  menghasilkan aset runtime; jangan memotong master saat ini.
- Slider penuh dan kosong **bukan kanvas identik**: beda4px lebar,40px tinggi,
  serta dekorasi/posisi track. Menumpuk img berukuran100% langsung akan meleset.
  Pada implementasi nanti kalibrasi track, titik0/100%, safe area kiri dan
  pusat knob dalam satu koordinat logis. Strip putih kiri tidak dihitung
  sebagai perjalanan knob. Posisi track kanan harus tetap sejajar.
- Isi ungu diungkap melalui clipping/mask, bukan diperkecil lebarnya secara
  horizontal, supaya motif dan ujung tidak terdistorsi. Knob mengikuti nilai
  yang sama; pada0% isi kosong dan100% isi penuh, tanpa menyisakan ungu di0%.
- Pertahankan proporsi, aspect-ratio, serta kontrol sentuh minimum44px pada
  mobile. Bila artwork terlalu lebar, tata letak ditumpuk dan diadaptasi,
  tidak memaksa seluruh panel menjadi terlalu kecil.

## Konteks kode saat ini — dipertahankan

- `components/audio-settings.tsx`: panel details AUDIO; range musik/SFX0–100%,
  persentase, preview musik game5 detik (bisa dihentikan), pemilih efek dan
  Dengar SFX, pesan error playback, cleanup saat panel ditutup/unmount.
- `lib/audio-settings.ts`: musik default16%, SFX85%; pengaturan tersimpan
  langsung saat slider berubah di localStorage benteng-audio-levels-v1 dan
  disiarkan melalui event. Jangan menambahkan tombol Simpan yang menyesatkan
  sebelum ada keputusan eksplisit mengubah perilaku ini.
- Pertahankan native input range dan semantics keyboard/focus/aria-label;
  artwork adalah lapisan presentasi, bukan pengganti logika audio. Preview
  harus memakai level terbaru dan berhenti ketika ditutup tanpa sumber audio
  tertinggal. UI tidak boleh mengirim WASD/Space ke gameplay saat digunakan.

## Rancangan berikutnya (usulan, belum instruksi implementasi)

Header → panel card berisi Musik latar [slider + %] dan SFX [slider + %]
→ kontrol preview musik / pilihan efek + preview SFX → Tutup/Kembali.
Tombol ungu untuk aksi preview; abu-abu untuk berhenti/tutup. Nilai0–100%,
status mute dan aturan penyimpanan langsung tetap jelas.

Sebelum implementasi: konfirmasi layout/menu placement; buat derivatif
terkompresi dengan nama konsisten di folder runtime terpisah dan simpan master;
kalibrasi slider di0/50/100%; uji keyboard, mobile, preview/cleanup dan regression
audio. Tidak ada optimasi/crop/recolor dilakukan pada tahap penyimpanan ini.
