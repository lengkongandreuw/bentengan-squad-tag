# Rencana Fitur: Statistik Ronde dan Leaderboard Match

## Ringkasan

Fitur ini menambahkan panel statistik setelah ronde selesai dan leaderboard yang dapat dibuka kapan saja selama match. Tujuannya adalah memberi pemain feedback yang jelas tentang kontribusi setiap karakter, tanpa membuat alur game terasa terlalu berat.

Fitur ini tidak mengubah aturan utama game. Format match tetap best of 3: tim pertama yang mencapai 2 poin ronde memenangkan match.

## Masalah Yang Ingin Diselesaikan

Saat ronde selesai, pemain belum mendapat informasi yang cukup jelas tentang:

- Karakter mana yang paling banyak melakukan tag.
- Karakter mana yang paling banyak rescue.
- Karakter mana yang sering tertangkap atau masuk penjara.
- Kontribusi pemain utama dibanding anggota tim lain.
- Performa Tim Merah dan Tim Hijau sepanjang ronde atau match.

Tanpa panel statistik, kemenangan atau kekalahan terasa kurang informatif. Pemain tahu hasil akhirnya, tetapi tidak selalu paham proses yang menyebabkan hasil tersebut.

## Tujuan Fitur

- Memberi ringkasan performa setiap karakter setelah ronde selesai.
- Membantu pemain memahami kontribusi tim.
- Membantu proses balancing karakter dan bot.
- Menjadi alat QA sederhana untuk mengecek apakah core loop tag, rescue, dan prison berjalan wajar.
- Memberi pemain kontrol saat match selesai melalui tombol manual, bukan langsung auto-play.

## Format Match Saat Ini

Game menggunakan format best of 3.

- Menang 1 ronde = mendapat 1 poin ronde.
- Tim pertama yang mencapai 2 poin memenangkan match.
- Match bisa selesai dalam 2 ronde jika skor 2-0.
- Match bisa sampai 3 ronde jika skor sempat 1-1.

Contoh:

```text
Ronde 1: Tim Merah menang -> Merah 1 - 0 Hijau
Ronde 2: Tim Hijau menang -> Merah 1 - 1 Hijau
Ronde 3: Tim Merah menang -> Merah 2 - 1 Hijau
Match selesai, Tim Merah menang match
```

## Data Statistik Yang Ditampilkan

Versi awal fitur cukup memakai tiga statistik utama per karakter.

| Stat | Arti |
| --- | --- |
| TAG | Jumlah musuh yang berhasil ditangkap oleh karakter tersebut. |
| RESCUE | Jumlah aksi menyelamatkan teman dari penjara. |
| PRISON | Jumlah kali karakter tersebut tertangkap atau masuk penjara. |

Stat opsional untuk versi berikutnya:

- ULT: jumlah ultimate yang berhasil dipakai.
- BOOST: jumlah refill/boost pickup yang diambil.
- MVP: karakter dengan kontribusi tertinggi.

Untuk versi awal, MVP dan stat tambahan tidak wajib agar scope tetap ringan.

## Konsep UI

Panel statistik muncul sebagai overlay di atas arena. Background game tetap terlihat, tetapi dibuat lebih gelap atau blur agar panel mudah dibaca.

Struktur panel:

```text
STATISTIK RONDE
MERAH 1 - 0 HIJAU

TIM MERAH                         TIM HIJAU
[icon] Raja   TAG 2 RESCUE 1 PRISON 0    [icon] Kaka  TAG 1 RESCUE 0 PRISON 1
[icon] Robot  TAG 0 RESCUE 0 PRISON 1    [icon] Ciici TAG 0 RESCUE 2 PRISON 0
[icon] Jago   TAG 1 RESCUE 0 PRISON 0    [icon] Buto  TAG 1 RESCUE 0 PRISON 1
[icon] Lala   TAG 0 RESCUE 1 PRISON 0    [icon] Maria TAG 0 RESCUE 0 PRISON 2
[icon] Kumis  TAG 0 RESCUE 0 PRISON 1    [icon] Boke  TAG 0 RESCUE 1 PRISON 1
```

Prinsip UI:

- Dua kolom besar: Tim Merah dan Tim Hijau.
- Setiap row mewakili satu karakter aktif.
- Gunakan icon/portrait kecil karakter yang sudah tersedia.
- Karakter yang dikontrol pemain diberi highlight tipis.
- Tim pemenang diberi badge kecil `MENANG`.
- Angka statistik dibuat dalam chip kecil agar mudah discan.
- Jangan terlalu banyak dekorasi agar informasi tetap jelas.

## Flow Setelah Ronde 1 dan Ronde 2

Jika match belum selesai, panel statistik ronde muncul otomatis sebagai quick recap.

Flow:

1. Ronde selesai.
2. Game masuk fase jeda singkat.
3. Panel `STATISTIK RONDE` muncul.
4. Panel menampilkan statistik ronde yang baru selesai.
5. Timer berjalan selama sekitar 3 detik.
6. Setelah timer selesai, game otomatis lanjut ke ronde berikutnya.
7. Tetap tersedia tombol `Keluar ke Menu`.

Contoh UI:

```text
STATISTIK RONDE
MERAH 1 - 0 HIJAU

[statistik per karakter]

Lanjut ronde berikutnya dalam 3...
[KELUAR KE MENU]
```

Alasan memakai timer pada ronde awal:

- Alur game tetap cepat.
- Pemain mendapat waktu singkat untuk membaca hasil.
- Tidak memaksa pemain menekan tombol setiap ronde.
- Tombol keluar tetap tersedia jika pemain ingin berhenti.

## Flow Saat Match Selesai

Jika salah satu tim sudah mencapai 2 poin, panel berubah menjadi hasil akhir match dan tidak lanjut otomatis.

Flow:

1. Ronde selesai.
2. Sistem mendeteksi salah satu tim mencapai 2 poin.
3. Panel statistik final muncul.
4. Tidak ada countdown auto-play.
5. Pemain memilih aksi manual.

Tombol yang disarankan:

- `REMATCH`
- `PILIH KARAKTER`
- `KELUAR KE MENU`

Contoh UI:

```text
MATCH SELESAI
MERAH 2 - 1 HIJAU
TIM MERAH MENANG

[statistik total match per karakter]

[REMATCH] [PILIH KARAKTER] [KELUAR KE MENU]
```

Catatan:

- Match tidak selalu selesai di ronde 3.
- Jika skor 2-0, layar hasil akhir muncul setelah ronde 2.
- Jika skor 2-1, layar hasil akhir muncul setelah ronde 3.

## Leaderboard Selama Match

Selain muncul otomatis setelah ronde, leaderboard juga dapat dibuka kapan saja selama match.

Cara akses:

- Tekan `Tab` di keyboard.
- Klik atau tap area skor di bagian atas HUD.

Alasan memilih `Tab`:

- Umum dipakai di game untuk scoreboard atau leaderboard.
- Tidak bentrok dengan kontrol utama:
  - WASD untuk gerak.
  - Space untuk sprint.
  - Shift untuk parkour.
  - Caps Lock untuk ultimate.
  - P untuk pause.
- Mudah dipahami pemain PC.

Alasan area skor atas bisa diklik:

- Membantu pemain mobile/touch.
- Tidak perlu menambah tombol baru yang memenuhi HUD.
- Secara visual area skor memang tempat natural untuk membuka statistik.

## Perilaku Leaderboard Saat Dibuka Manual

Saat pemain membuka leaderboard dengan `Tab` atau klik skor:

- Game tidak harus berhenti total pada versi awal.
- Panel dapat tampil sebagai overlay semi-transparan.
- Jika gameplay terasa terganggu, versi berikutnya bisa membuat game pause selama panel terbuka.

Rekomendasi versi awal:

- Tekan dan tahan `Tab` untuk melihat leaderboard.
- Lepas `Tab` untuk menutup.
- Klik skor atas untuk toggle buka/tutup.

Jika ingin lebih sederhana:

- Tekan `Tab` sekali untuk toggle buka/tutup.

## Perbedaan Statistik Ronde dan Statistik Match

Fitur sebaiknya memisahkan dua jenis data.

### Statistik Ronde

Digunakan untuk quick recap setelah satu ronde.

Data di-reset setiap ronde.

Contoh:

```text
Ronde 1:
Raja TAG 2, RESCUE 1, PRISON 0
```

### Statistik Match

Digunakan untuk panel final setelah match selesai.

Data dijumlahkan dari seluruh ronde dalam match.

Contoh:

```text
Match selesai:
Raja TAG 5, RESCUE 2, PRISON 1
```

## State Yang Perlu Dilacak

Setiap player/karakter perlu memiliki statistik ronde dan statistik match.

Data minimal:

```text
roundTags
roundRescues
roundPrisons
matchTags
matchRescues
matchPrisons
```

Atau bisa memakai struktur:

```text
stats: {
  round: {
    tags: number
    rescues: number
    prisons: number
  }
  match: {
    tags: number
    rescues: number
    prisons: number
  }
}
```

Trigger pencatatan:

- Saat karakter berhasil menangkap musuh: tambah `tags`.
- Saat karakter berhasil rescue teman: tambah `rescues`.
- Saat karakter ditangkap dan masuk penjara: tambah `prisons`.

## Urutan Implementasi Yang Disarankan

### Tahap 1: Data Statistik

- Tambahkan pencatatan TAG, RESCUE, dan PRISON per karakter.
- Pastikan data ronde di-reset saat ronde baru dimulai.
- Pastikan data match di-reset saat match baru dimulai.

### Tahap 2: Panel Statistik Ronde

- Buat overlay statistik setelah ronde selesai.
- Tampilkan dua kolom tim.
- Tampilkan icon, nama karakter, dan tiga stat utama.
- Tampilkan skor match saat ini.
- Tampilkan badge pemenang ronde.

### Tahap 3: Flow Ronde Awal

- Setelah ronde selesai tetapi match belum selesai, tampilkan panel dengan timer.
- Timer default: 3 detik.
- Setelah timer selesai, lanjut ke ronde berikutnya.
- Tambahkan tombol `Keluar ke Menu`.

### Tahap 4: Flow Match Selesai

- Jika skor mencapai 2 poin, tampilkan panel final.
- Jangan auto lanjut.
- Tambahkan tombol `Rematch`, `Pilih Karakter`, dan `Keluar ke Menu`.

### Tahap 5: Leaderboard Manual

- Tambahkan shortcut `Tab`.
- Tambahkan klik/tap pada skor atas.
- Panel manual menampilkan statistik match saat ini.

## Kriteria Selesai

Fitur dianggap selesai jika:

- Statistik TAG, RESCUE, dan PRISON tercatat dengan benar.
- Statistik ronde muncul otomatis setelah ronde selesai.
- Ronde 1 dan ronde 2 dapat lanjut otomatis setelah timer jika match belum selesai.
- Tombol `Keluar ke Menu` tersedia pada quick recap.
- Saat match selesai, panel final tidak auto-play.
- Tombol `Rematch`, `Pilih Karakter`, dan `Keluar ke Menu` tersedia.
- Leaderboard bisa dibuka manual dengan `Tab`.
- Area skor atas bisa diklik/tap untuk membuka leaderboard.
- UI tidak bertumpuk dengan HUD lain.
- UI tetap terbaca di desktop dan mobile landscape.

## Hal Yang Tidak Termasuk Scope Awal

Untuk menjaga fitur tetap ringan, hal berikut sebaiknya tidak dimasukkan dulu:

- Leaderboard online.
- Penyimpanan statistik permanen.
- Ranking global.
- Formula MVP kompleks.
- Grafik performa.
- Statistik damage atau jarak tempuh.
- Replay ronde.
- Share hasil match.

## Rekomendasi Desain Final

Rekomendasi final untuk versi pertama:

- Gunakan nama `STATISTIK RONDE` untuk panel antar ronde.
- Gunakan nama `MATCH SELESAI` untuk panel final.
- Gunakan dua kolom tim.
- Gunakan stat utama: `TAG`, `RESCUE`, `PRISON`.
- Gunakan timer 3 detik hanya jika match belum selesai.
- Gunakan tombol manual saat match selesai.
- Gunakan `Tab` dan klik skor atas untuk leaderboard manual.

Dengan flow ini, game tetap cepat saat ronde belum selesai, tetapi pemain tetap mendapat kontrol penuh ketika match berakhir.
