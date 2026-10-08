# Rencana Fitur: Radar Chart Profil Pemain Lokal

## Ringkasan

Radar chart dapat dipakai untuk menampilkan gaya bermain pemain pada profil lokal Bentengan Squad Tag. Chart tidak menggantikan angka KDA; chart hanya membantu pemain membaca kecenderungan bermain secara visual.

Fitur ini hanya untuk profil, leaderboard manual, atau hasil match. Jangan menempatkannya pada HUD arena yang selalu terlihat selama gameplay.

## Status Proyek Saat Ini

- Proyek sudah memiliki dependency `recharts` versi `3.8.0`.
- Wrapper chart internal sudah tersedia di `modules/ui/primitives/chart.tsx`.
- Statistik match saat ini sudah mencatat `tags`, `prisons`, dan `rescues` di `app/prototype.tsx`.
- Statistik gameplay diperbarui bersama snapshot HUD sekitar setiap 100 ms saat match berjalan.
- Statistik saat ini masih hidup hanya selama sesi match; modul profil lokal akan menjadi sumber data permanen pada browser.

Tidak perlu memasang library baru untuk radar chart.

## Data KDA Mentah

Data profil harus menyimpan angka mentah berikut.

```ts
type PlayerKdaStats = {
  tagMusuh: number;
  masukPenjara: number;
  rescueTeam: number;
};
```

| Label KDA | Field | Arti |
| --- | --- | --- |
| TAG | `tagMusuh` | Jumlah musuh yang berhasil ditangkap pemain. |
| PRISON | `masukPenjara` | Jumlah kali pemain tertangkap dan masuk penjara. |
| RESCUE | `rescueTeam` | Jumlah aksi rescue sukses yang dilakukan pemain. |

`rescueTeam` menghitung aksi rescue, bukan jumlah rekan yang bebas, karena satu aksi dapat membebaskan beberapa rekan sekaligus.

## KDA Ratio dan Contribution

KDA ratio adalah nilai tampilan, bukan data yang disimpan.

```ts
const kdaRatio =
  (stats.tagMusuh + stats.rescueTeam) /
  Math.max(1, stats.masukPenjara);
```

Contribution point tetap terpisah dari KDA.

```ts
const contributionPoint = Math.max(
  0,
  stats.tagMusuh * 100 +
    stats.rescueTeam * 120 -
    stats.masukPenjara * 40,
);
```

## Mengapa Radar Tidak Memakai PRISON Mentah

Nilai tinggi pada `PRISON` berarti performa yang kurang baik. Jika dipakai secara langsung pada radar, area chart yang lebih besar justru dapat terlihat seperti pencapaian lebih baik.

Karena itu, gunakan tiga sumbu positif berikut:

- `Attack`: performa TAG.
- `Support`: performa RESCUE.
- `Survival`: kebalikan dari frekuensi masuk penjara.

Angka TAG, PRISON, RESCUE, serta KDA ratio tetap harus terlihat sebagai teks di dekat chart.

## Perhitungan Radar untuk Profil

Total seumur profil tidak cocok langsung dipakai sebagai sumbu radar karena pemain yang lebih lama bermain akan selalu memiliki angka lebih besar. Gunakan rata-rata per match dan normalisasikan ke skala 0--100.

```ts
const matchesPlayed = Math.max(1, profile.menang + profile.kalah);

const radar = {
  attack: clamp(
    (profile.kda.tagMusuh / matchesPlayed / targetTagPerMatch) * 100,
    0,
    100,
  ),
  support: clamp(
    (profile.kda.rescueTeam / matchesPlayed / targetRescuePerMatch) * 100,
    0,
    100,
  ),
  survival: 100 / (1 + profile.kda.masukPenjara / matchesPlayed),
};
```

`targetTagPerMatch` dan `targetRescuePerMatch` adalah nilai balancing yang perlu ditetapkan setelah playtest. Jangan menjadikannya angka tersembunyi di komponen UI; letakkan sebagai konstanta konfigurasi yang mudah disesuaikan.

## Dampak Performa

Radar berisi tiga sumbu sehingga biaya render SVG-nya kecil. Risiko utamanya adalah render ulang yang tidak perlu ketika leaderboard dibuka saat game sedang berjalan.

| Kondisi | Dampak | Aturan |
| --- | --- | --- |
| Panel profil atau hasil match dibuka | Rendah | Aman untuk merender radar. |
| Leaderboard terbuka saat gameplay | Rendah--sedang, terutama mobile | Jangan hitung ulang atau menganimasikan radar pada setiap update HUD. |
| Radar selalu ada di HUD arena | Tidak direkomendasikan | Menambah pekerjaan React/SVG pada loop permainan tanpa nilai yang sebanding. |

Mitigasi yang wajib dipakai:

- Render atau mount radar hanya saat panel yang memerlukannya terbuka.
- Gunakan data memoized dan `React.memo` agar perubahan snapshot HUD yang tidak mengubah KDA tidak merender radar ulang.
- Nonaktifkan animasi chart selama match aktif.
- Batasi ukuran chart agar tetap nyaman di desktop dan mobile landscape.
- Pertimbangkan lazy-load komponen radar supaya kode chart tidak perlu dimuat pada layar permainan awal.

## Library dan Bundle

`recharts` tersedia di proyek, tetapi radar profil saat ini digambar dengan SVG kecil karena hanya memiliki tiga sumbu. Tidak perlu instalasi library tambahan dan kode chart tetap dimuat bersama panel profil secara lazy.

## Maintainability

Pemisahan tanggung jawab yang disarankan:

```text
Data mentah profil lokal
(TAG, PRISON, RESCUE, menang, kalah)
        |
        v
Modul perhitungan profil
(KDA ratio, contribution point, radar metrics)
        |
        v
Komponen UI
(kartu statistik, teks KDA, radar chart)
```

### Struktur Modul yang Direkomendasikan

Saat fitur user management dibuat, kode harus dipecah berdasarkan tanggung jawab, bukan dikumpulkan ke dalam `app/prototype.tsx` atau satu file profile besar.

```text
lib/player-profile/
  types.ts             # Kontrak data profile, KDA, dan versi schema.
  defaults.ts          # Nilai awal dan konstanta konfigurasi.
  storage.ts           # Baca/tulis/validasi localStorage saja.
  profile-service.ts   # Membuat profile dan memperbarui data mentah.
  statistics.ts        # KDA ratio, contribution, dan metrik radar.
  migrations.ts        # Upgrade data profile versi lama bila diperlukan.
  index.ts              # Public API modul yang dipakai UI/gameplay.

modules/ui/player-profile/
  player-profile-panel.tsx  # Layout panel profile.
  kda-summary.tsx           # Angka TAG / PRISON / RESCUE dan KDA ratio.
  radar-chart.tsx           # Visual SVG tiga sumbu, tanpa aturan statistik.
  profile-poster.css        # Tata letak dan warna panel profil.
```

Nama file dapat disesuaikan dengan konvensi proyek, tetapi pemisahan tanggung jawabnya harus dipertahankan.

### Aturan Anti God Object

- `storage.ts` tidak boleh menghitung KDA, contribution, atau menentukan tampilan UI.
- `statistics.ts` tidak boleh mengakses `window`, `localStorage`, atau React.
- `radar-chart.tsx` tidak boleh menulis localStorage atau mengetahui event tag/rescue/prison gameplay.
- `profile-service.ts` hanya menerima aksi domain yang sudah lengkap, yaitu statistik dan hasil dari match yang selesai.
- `app/prototype.tsx` hanya menampung statistik sementara milik player yang dikendalikan user, lalu memanggil `recordCompletedMatch` satu kali ketika match selesai.
- Jangan menggandakan rumus KDA, contribution, atau normalisasi radar di beberapa komponen.
- Jangan menyimpan state profile yang sama di React state, variabel gameplay, dan localStorage sebagai tiga sumber kebenaran yang berbeda.

Contoh aliran event yang diinginkan:

```text
capture/rescue/prison selama match
        |
        v
buffer statistik match di gameplay
        |
        v
match selesai (win/loss)
        |
        v
recordCompletedMatch
        |
        v
profile-service menggabungkan statistik dan hasil match
        |
        v
storage menyimpan profil lokal
        |
        v
statistics menghitung data tampilan untuk UI
```

Dengan struktur ini, penambahan atau penghapusan field cukup dilakukan pada tipe data, nilai default, migrasi, dan fungsi statistik yang relevan. Komponen UI tidak perlu mengetahui detail penyimpanan, sedangkan gameplay tidak perlu mengetahui cara radar dirender.

Aturan desain:

- Simpan hanya data mentah pada localStorage.
- Jangan simpan `kdaRatio`, contribution point turunan, atau nilai radar sebagai sumber kebenaran.
- Letakkan rumus KDA dan normalisasi radar pada modul domain yang terpisah dari React dan SVG.
- UI hanya menerima nilai siap tampil; UI tidak menentukan aturan game atau rumus statistik.
- Tambahkan `schemaVersion` pada profil lokal untuk memudahkan perubahan field pada masa depan.
- Catat statistik hanya untuk player yang dikendalikan user, bukan bot atau semua karakter tim.
- Jangan menyimpan statistik match yang belum selesai; keluar atau refresh di tengah match harus membuang buffer sementara.

## Aksesibilitas dan UX

- Jangan mengandalkan tooltip sebagai satu-satunya cara membaca data.
- Tampilkan teks `TAG`, `PRISON`, `RESCUE`, dan `KDA RATIO` di dekat radar.
- Gunakan label aksesibel untuk chart dan deskripsi ringkas gaya bermain pemain.
- Gunakan warna yang konsisten: TAG kuning/oranye, PRISON merah, RESCUE hijau. Radar Attack, Support, dan Survival harus tetap mudah dibedakan tanpa hanya mengandalkan warna.

## Rekomendasi Implementasi Bertahap

1. Buat modul profil lokal dan simpan data mentah KDA, menang, serta kalah.
2. Tampilkan kartu angka KDA dan contribution point terlebih dahulu.
3. Tambahkan helper perhitungan KDA ratio dan metrik radar beserta test unit.
4. Tambahkan radar chart pada halaman profil serta hasil match.
5. Uji desktop dan mobile landscape, termasuk kondisi leaderboard dibuka ketika pertandingan berjalan.
6. Tentukan nilai normalisasi melalui playtest sebelum menjadikannya aturan final.

## Keputusan Rekomendasi

Radar chart aman untuk diterapkan sebagai visualisasi profil lokal tanpa library tambahan. Gunakan hanya di panel non-HUD, tampilkan angka KDA sebagai pendamping, dan hitung metrik radar dari data mentah yang tersimpan secara lokal.

## Status Implementasi V1

Implementasi awal sudah memakai struktur modul yang direkomendasikan.

- `lib/player-profile/` menangani tipe, nilai awal, validasi/migrasi, localStorage, service event, dan perhitungan statistik.
- `modules/ui/player-profile/` menangani setup username, ringkasan KDA, panel profil, serta radar chart.
- `app/prototype.tsx` menampung tag, prison, dan rescue milik player selama match, kemudian menyimpan semuanya bersama hasil match melalui satu aksi atomik.
- Match yang ditinggalkan sebelum selesai tidak mengubah statistik profil permanen.
- Panel profil dimuat secara lazy. Radar memakai SVG lokal yang ringan dan tidak membawa Recharts ke bundle panel.
- Radar tidak memakai animasi dan dimemoisasi agar pembaruan HUD tanpa perubahan statistik tidak merender chart ulang.
