# Rencana Fitur: Notifikasi Event Match

## Ringkasan

Fitur ini menambahkan notifikasi singkat di dalam match untuk memberi tahu pemain saat terjadi event penting, seperti karakter berhasil melakukan tag, masuk penjara, melakukan rescue, atau sebuah tim memenangkan ronde.

Notifikasi hanya menjadi feedback visual. Fitur ini tidak mengubah aturan Bentengan, skor, AI, maupun hasil match.

## Masalah Yang Ingin Diselesaikan

Saat match berjalan cepat, pemain dapat kesulitan mengetahui kejadian penting yang terjadi di area lain pada map. Contohnya:

- Pemain tidak sadar teman satu tim berhasil menyelamatkan karakter dari penjara.
- Pemain tidak langsung tahu siapa yang berhasil melakukan tag.
- Pemain baru memahami perubahan keadaan setelah melihat karakter sudah berada di penjara.
- Momen kemenangan ronde terasa kurang tegas sebelum panel hasil ronde muncul.

Notifikasi event membantu pemain membaca keadaan match tanpa perlu membuka leaderboard.

## Tujuan Fitur

- Memberi feedback langsung untuk aksi penting di dalam match.
- Membantu pemain memahami hubungan antara tag, prison, dan rescue.
- Membuat match terasa lebih hidup tanpa menutup arena atau mengganggu kontrol.
- Membantu QA memvalidasi bahwa event gameplay tercatat dan terpanggil pada waktu yang tepat.
- Menjadi dasar bagi event tambahan pada versi berikutnya.

## Event Untuk Versi Awal

Versi pertama cukup memakai event yang paling penting bagi core gameplay.

| Event | Contoh notifikasi | Ikon | Warna utama |
| --- | --- | --- | --- |
| Tag berhasil | `RAJA men-tag BUTO` | petir | kuning |
| Karakter masuk penjara | `BUTO masuk penjara` | gembok | merah |
| Rescue berhasil | `LALA menyelamatkan RAJA` | perisai | hijau |
| Ronde selesai | `TIM HIJAU memenangkan ronde` | bendera | warna tim pemenang |

Catatan: event tag dan prison dapat berasal dari aksi yang sama. Agar tidak terasa berlebihan, versi awal disarankan menampilkan satu notifikasi gabungan untuk pemain yang melakukan aksi, misalnya `RAJA men-tag BUTO`, lalu status penjara terlihat langsung pada karakter dan HUD. Event prison terpisah hanya dipakai bila diperlukan untuk kejelasan atau debugging.

## Prioritas Notifikasi

Tidak semua event memiliki prioritas yang sama. Sistem perlu mengatur antrean agar layar tidak penuh ketika banyak aksi terjadi dalam waktu singkat.

| Prioritas | Event | Perilaku |
| --- | --- | --- |
| Tinggi | Ronde selesai | Selalu tampil, dapat menggantikan notifikasi biasa. |
| Sedang | Rescue berhasil | Tampil lebih jelas karena dapat mengubah kondisi tim secara besar. |
| Normal | Tag berhasil | Masuk antrean bila event lain sedang tampil. |
| Rendah | Pickup, ultimate, atau event kosmetik | Tidak masuk versi awal. |

Aturan antrean yang disarankan:

- Maksimal dua notifikasi terlihat bersamaan.
- Event normal ditampilkan sekitar 2 detik.
- Event rescue ditampilkan sekitar 2.5 detik.
- Event ronde selesai ditampilkan sampai transisi hasil ronde dimulai.
- Jika antrean penuh, event tag yang paling lama dapat dilewati; event rescue dan ronde selesai tidak boleh hilang.
- Event yang identik dan terjadi berulang dalam waktu singkat dapat digabung, misalnya `TIM MERAH melakukan 2 tag`.

## Konsep UI

Notifikasi tampil sebagai toast horizontal di area atas-tengah layar, tepat di bawah HUD skor dan tidak menutupi kontrol tutorial di bagian bawah.

Contoh tampilan:

```text
                 [icon petir] RAJA men-tag BUTO
                 [icon perisai] LALA menyelamatkan RAJA
```

Struktur setiap toast:

```text
[ICON]+ [NAMA PELAKU] [AKSI] [NAMA TARGET]
```

Contoh:

```text
[petir]+ RAJA men-tag BUTO
[perisai]+ LALA menyelamatkan RAJA
[bendera]+ TIM HIJAU memenangkan ronde
```

Prinsip desain:

- Gunakan ikon yang sudah tersedia di repository agar konsisten dengan HUD dan leaderboard.
- Nama pelaku memakai warna timnya: merah atau hijau.
- Nama target memakai warna tim lawan.
- Latar toast gelap dan semi-transparan agar tetap terbaca di semua area map.
- Border atau accent memakai warna sesuai jenis event, bukan warna dekoratif berlebihan.
- Teks harus cukup besar untuk desktop dan mobile landscape.
- Toast tidak boleh memakai panel besar; ukurannya hanya selebar isi teks dengan batas maksimum aman.
- Animasi masuk dan keluar singkat, sekitar 150-200 ms, tanpa menggeser elemen HUD.

## Lokasi UI

Urutan area layar yang disarankan:

```text
Atas:        HUD skor, timer, dan status tim
Atas-tengah: Notifikasi event match
Bawah:       Kontrol gameplay dan tutorial
Tengah:      Arena gameplay
```

Alasan memilih atas-tengah:

- Mudah terlihat saat pemain memantau skor dan timer.
- Tidak berbenturan dengan keyboard hints atau tutorial di bawah.
- Tidak menghalangi karakter utama di tengah arena terlalu lama.
- Tidak bertabrakan dengan panel peta jika peta berada di sisi kanan.

## Flow Fitur

```text
Aksi gameplay terjadi
        |
        v
Sistem memvalidasi aksi (tag / rescue / kemenangan ronde)
        |
        v
Sistem membuat data event
        |
        v
Event masuk antrean berdasarkan prioritas
        |
        v
Toast tampil pada area atas-tengah
        |
        v
Durasi selesai atau event prioritas lebih tinggi masuk
        |
        v
Toast keluar dan event berikutnya tampil
```

## Data Event Yang Dibutuhkan

Setiap event sebaiknya memakai struktur data sederhana seperti berikut:

```text
type: 'tag' | 'rescue' | 'round-win'
actorName: string
actorTeam: 'red' | 'green'
targetName?: string
targetTeam?: 'red' | 'green'
createdAt: number
priority: 'normal' | 'medium' | 'high'
```

Contoh data untuk tag:

```text
type: 'tag'
actorName: 'RAJA'
actorTeam: 'red'
targetName: 'BUTO'
targetTeam: 'green'
priority: 'normal'
```

## Interaksi Dengan Sistem Yang Sudah Ada

Fitur ini dapat mengambil trigger dari event gameplay yang juga dipakai oleh statistik:

| Trigger gameplay | Statistik | Notifikasi |
| --- | --- | --- |
| Tag berhasil | TAG pelaku bertambah, PRISON target bertambah | `pelaku men-tag target` |
| Rescue berhasil | RESCUE pelaku bertambah | `pelaku menyelamatkan target` |
| Ronde berakhir | Skor tim bertambah | `tim memenangkan ronde` |

Dengan satu sumber trigger, angka pada leaderboard dan notifikasi akan selalu menggambarkan kejadian yang sama.

## Edge Case Yang Perlu Ditangani

- Dua tag terjadi pada frame atau waktu yang hampir sama: tampilkan dalam antrean, jangan bertumpuk secara acak.
- Rescue terjadi sesaat setelah target masuk penjara: rescue diberi prioritas lebih tinggi agar momen penting tetap terlihat.
- Ronde berakhir ketika masih ada event tag dalam antrean: kosongkan event normal, lalu tampilkan event kemenangan ronde.
- Player keluar atau rematch sebelum toast selesai: antrean harus di-reset agar notifikasi lama tidak terbawa ke match baru.
- Nama karakter panjang: gunakan batas lebar toast dan ellipsis bila benar-benar diperlukan, tetapi nama roster saat ini seharusnya aman.
- Layar mobile landscape: pastikan toast tidak masuk ke area notch, HUD, peta, atau kontrol tutorial.

## Tahap Implementasi Yang Disarankan

### Tahap 1: Sistem Event

- Buat state atau queue khusus untuk event notifikasi.
- Tambahkan fungsi untuk memasukkan event berdasarkan prioritas.
- Reset queue saat match baru dimulai, kembali ke menu, rematch, atau berpindah map.

### Tahap 2: Trigger Gameplay

- Hubungkan event tag dengan proses capture/tag yang sudah ada.
- Hubungkan event rescue dengan proses rescue yang sudah ada.
- Hubungkan event ronde selesai dengan proses penentuan pemenang ronde.

### Tahap 3: UI Toast

- Buat komponen toast tunggal.
- Gunakan ikon repository yang sama dengan ikon statistik.
- Terapkan warna tim dan warna jenis event.
- Tambahkan animasi masuk/keluar singkat.

### Tahap 4: Antrean dan Prioritas

- Batasi maksimal dua toast aktif.
- Pastikan event kemenangan ronde mengalahkan event biasa.
- Uji event ramai agar tidak terjadi tumpang tindih.

### Tahap 5: QA Responsif

- Uji desktop.
- Uji mobile landscape.
- Uji saat tutorial aktif.
- Uji saat leaderboard manual dibuka.
- Uji transisi ronde, rematch, pilih karakter, dan ganti map.

## Kriteria Selesai

Fitur dianggap selesai jika:

- Notifikasi tag muncul ketika tag benar-benar berhasil.
- Notifikasi rescue muncul ketika rescue benar-benar berhasil.
- Notifikasi kemenangan ronde muncul sebelum panel hasil ronde/final tampil.
- Toast tidak menutupi tutorial, kontrol utama, peta, atau HUD skor.
- Event ramai tidak saling bertumpuk secara tidak terbaca.
- Prioritas rescue dan kemenangan ronde berjalan sesuai aturan.
- Notifikasi lama tidak terbawa ke ronde atau match baru.
- Teks tetap terbaca pada desktop dan mobile landscape.

## Hal Yang Tidak Termasuk Scope Awal

- Riwayat event penuh yang bisa dibuka kembali.
- Chat log atau kill feed permanen.
- Suara unik untuk setiap event.
- Animasi portrait karakter yang kompleks.
- Notifikasi pickup, ultimate, parkour, atau sprint.
- Pengaturan filter notifikasi oleh pemain.
- Integrasi leaderboard online.

## Rekomendasi Final

Versi pertama sebaiknya fokus pada tiga notifikasi: `TAG`, `RESCUE`, dan `RONDE SELESAI`.

Gunakan toast kecil di atas-tengah layar, satu sampai dua baris maksimal, dengan ikon repository dan warna tim sebagai penanda cepat. Prioritaskan keterbacaan serta antrean yang rapi dibanding menampilkan setiap event secara agresif.

Dengan scope ini, fitur memberi perubahan yang terasa pada pengalaman bermain tetapi tetap ringan untuk dibuat dan mudah diuji.
