# Rencana Fitur: Minta Rescue

## Ringkasan

Fitur `Minta Rescue` memberi pemain cara untuk meminta bantuan saat karakternya tertangkap dan berada di penjara. Pemain dapat mengirim satu sinyal bantuan yang terlihat oleh rekan satu tim, ditandai pada map, dan dicatat sebagai event singkat.

Fitur ini melengkapi sistem prison, rescue, notifikasi event match, dan statistik rescue yang sudah ada. Aturan dasar tag maupun rescue tidak berubah.

## Masalah Yang Ingin Diselesaikan

Saat karakter pemain berada di penjara, kondisi permainan bisa terasa pasif:

- Pemain menunggu tanpa cara jelas untuk memberi tahu tim bahwa ia membutuhkan rescue.
- Pemain tidak selalu tahu apakah rekan setim sedang menuju penjara.
- Momen rescue terasa terjadi secara acak, terutama saat arena ramai.
- Sistem notifikasi sudah dapat menjelaskan rescue yang berhasil, tetapi belum memberi pemain cara meminta rescue lebih dulu.

## Tujuan Fitur

- Memberi pemain aksi yang bermakna saat berada di penjara.
- Membantu pemain mengomunikasikan kebutuhan rescue secara cepat.
- Memberi bot/rekan satu tim konteks sederhana untuk memprioritaskan rescue.
- Membuat flow prison -> rescue lebih mudah dipahami.
- Menjaga fitur tetap ringan dan tidak mengubah keseimbangan core gameplay.

## Konsep Utama

Ketika karakter pemain menjadi `PRISONER`, tombol atau shortcut `MINTA RESCUE` tersedia. Saat dipakai:

1. Marker bantuan muncul di lokasi penjara.
2. Event singkat muncul: `RAJA meminta bantuan!`.
3. Rekan setim aktif mendapat indikator tujuan rescue.
4. Bot terdekat dapat menaikkan prioritas rescue secara terbatas.
5. Pemain harus menunggu cooldown sebelum mengirim sinyal berikutnya.

Sinyal tidak langsung membebaskan pemain. Rekan tetap harus datang ke penjara dan melakukan rescue sesuai aturan yang ada.

## Flow Fitur

```text
Pemain tertangkap
        |
        v
Pemain masuk penjara
        |
        v
Tombol MINTA RESCUE aktif
        |
        v
Pemain mengirim sinyal bantuan
        |
        +--> Marker bantuan muncul di penjara
        |
        +--> Notifikasi event tampil
        |
        +--> Rekan/bot mendapat prioritas rescue sementara
        |
        v
Rekan berhasil mencapai penjara
        |
        v
Rescue berjalan seperti aturan saat ini
        |
        v
Marker dan sinyal bantuan dihapus
```

## UI Saat Menjadi Prisoner

Saat pemain berada di penjara, HUD prisoner menampilkan tombol aksi utama.

```text
[ikon bantuan] MINTA RESCUE
Cooldown: siap
```

Setelah dipakai:

```text
[ikon bantuan] MINTA RESCUE
Cooldown: 10 dtk
```

Rekomendasi kontrol:

| Platform | Cara akses |
| --- | --- |
| Keyboard | Tombol `R`, bila belum dipakai oleh kontrol lain. |
| Touch/mobile | Tombol `MINTA RESCUE` pada HUD prisoner. |
| Desktop mouse | Klik tombol yang sama. |

Catatan: sebelum menetapkan shortcut final, perlu dipastikan `R` belum dipakai oleh kontrol gameplay lain.

## Tampilan Marker Bantuan

Marker muncul pada penjara tim pemain, bukan mengikuti karakter secara terpisah.

Komponen marker yang disarankan:

- Ikon bantuan atau perisai dengan tanda seru.
- Warna tim pemain.
- Pulsing halus agar terlihat tanpa menjadi terlalu ramai.
- Ring kecil pada minimap/map mode taktis.
- Label singkat `BUTUH RESCUE` bila ruang UI memungkinkan.

Marker harus hilang ketika:

- Pemain berhasil diselamatkan.
- Pemain keluar dari match.
- Ronde berakhir.
- Match berakhir.
- Durasi sinyal habis.

## Notifikasi Event

Notifikasi memakai sistem event match yang sudah ada.

Contoh:

```text
RAJA meminta bantuan!
```

Aturan tampilan:

- Tampil sebagai toast ringan, bukan notifikasi kemenangan besar.
- Prioritas di bawah rescue berhasil.
- Tidak ditampilkan berulang-ulang selama cooldown.
- Jika beberapa pemain meminta bantuan hampir bersamaan, sistem dapat menampilkan maksimal dua toast sesuai aturan antrean notifikasi.

## Cooldown dan Durasi

Rekomendasi versi awal:

| Parameter | Nilai awal | Alasan |
| --- | --- | --- |
| Cooldown tombol | 10 detik | Mencegah spam, tetapi tetap responsif. |
| Durasi marker | 6 detik | Cukup lama untuk terlihat oleh rekan tanpa memenuhi map. |
| Prioritas AI rescue | 5 detik | Memberi respons awal tanpa memaksa semua bot meninggalkan objective lain. |
| Maksimal sinyal aktif per pemain | 1 | Menjaga state sederhana. |

Nilai ini perlu diuji saat playtest. Jika rescue terasa terlalu mudah, durasi atau prioritas AI dapat dikurangi.

## Perilaku AI Rekan Tim

Versi awal tidak perlu memaksa semua AI menuju penjara. Cukup pilih satu kandidat rescue terbaik.

Prioritas kandidat:

1. Rekan aktif yang paling dekat dengan penjara.
2. Rekan yang tidak sedang berada di area benteng lawan.
3. Rekan yang tidak sedang dikejar musuh terlalu dekat.
4. Rekan yang memiliki boost cukup untuk bergerak menuju penjara.

Aturan aman:

- Hanya satu bot yang diberi prioritas rescue utama per sinyal.
- Bot boleh membatalkan prioritas jika masuk risiko tinggi atau melihat objective penting.
- Jika bot sudah melakukan rescue, marker langsung dihapus.
- Sinyal bantuan tidak mengubah state karakter pemain selain status UI dan marker.

## Interaksi Dengan Sistem Yang Sudah Ada

| Sistem saat ini | Integrasi Minta Rescue |
| --- | --- |
| Prisoner state | Tombol hanya aktif saat pemain berstatus `PRISONER`. |
| Rescue check | Rescue yang berhasil menghapus marker/sinyal aktif. |
| Notifikasi match | Menampilkan `nama meminta bantuan!`. |
| Statistik rescue | Tidak menambah statistik saat sinyal dikirim; hanya rescue sukses yang dihitung. |
| Minimap/map mode | Menampilkan penanda bantuan sementara pada penjara. |
| Round reset | Menghapus semua sinyal dan cooldown. |
| Match result | Menghapus marker sebelum transisi hasil ronde/match. |

## State Yang Dibutuhkan

Data minimal per sinyal:

```text
rescueRequest: {
  playerId: string
  team: 'blue' | 'red'
  requestedAt: number
  expiresAt: number
  cooldownUntil: number
  assignedRescuerId?: string
}
```

Versi yang lebih sederhana dapat menyimpan state berikut pada player yang dikontrol:

```text
rescueRequestUntil: number
rescueRequestCooldownUntil: number
```

## Edge Case Yang Perlu Ditangani

- Tombol ditekan saat pemain tidak berada di penjara: tidak melakukan apa pun.
- Tombol ditekan ketika cooldown aktif: tampilkan angka cooldown, tanpa mengirim event baru.
- Pemain diselamatkan sebelum marker habis: marker harus langsung hilang.
- Ronde selesai saat marker aktif: marker tidak boleh terbawa ke ronde berikutnya.
- Beberapa tahanan mengirim sinyal: prioritas AI dibatasi agar semua bot tidak menuju penjara yang sama.
- Sinyal dikirim ketika rekan satu tim semuanya menjadi tahanan: marker boleh tampil, tetapi tidak perlu menetapkan bot penyelamat.
- Leaderboard atau hasil ronde dibuka: marker dan toast tidak boleh menabrak overlay hasil match.

## Tahap Implementasi

### Tahap 1: State dan Cooldown

- Tambahkan state request serta cooldown.
- Batasi tombol hanya untuk pemain berstatus `PRISONER`.
- Reset state saat ronde atau match selesai.

### Tahap 2: Kontrol dan HUD Prisoner

- Tambahkan tombol `MINTA RESCUE`.
- Tambahkan shortcut keyboard setelah audit konflik keybind.
- Tampilkan cooldown dalam bentuk angka.

### Tahap 3: Marker dan Notifikasi

- Tambahkan marker bantuan pada penjara dan peta.
- Hubungkan dengan toast event match.
- Pastikan marker hilang ketika rescue berhasil atau sinyal kedaluwarsa.

### Tahap 4: Prioritas AI

- Pilih satu AI rekan terdekat sebagai kandidat rescue.
- Tambahkan prioritas sementara menuju penjara.
- Tambahkan kondisi pembatalan bila AI menghadapi risiko tinggi.

### Tahap 5: QA dan Balancing

- Uji keyboard, mouse, dan mobile landscape.
- Uji spam tombol serta cooldown.
- Uji rescue cepat setelah request.
- Uji beberapa pemain menjadi tahanan.
- Uji ronde berakhir ketika marker masih aktif.
- Sesuaikan cooldown dan durasi marker berdasarkan playtest.

## Kriteria Selesai

Fitur dianggap selesai jika:

- Tombol hanya muncul saat karakter pemain berada di penjara.
- Sinyal bantuan memunculkan marker dan notifikasi dengan benar.
- Cooldown mencegah spam.
- Rescue berhasil menghapus marker bantuan.
- Ronde, rematch, ganti map, dan keluar ke menu menghapus state request.
- AI hanya mendapat prioritas rescue terbatas dan tidak seluruh tim meninggalkan objective.
- UI tetap terbaca pada desktop serta mobile landscape.
- Fitur tidak mengubah perhitungan TAG, PRISON, maupun RESCUE yang sudah ada.

## Di Luar Scope Versi Awal

- Voice line karakter saat meminta bantuan.
- Chat tim atau komunikasi multiplayer online.
- Pemilihan penyelamat manual oleh pemain.
- Reward poin untuk mengirim sinyal.
- Sinyal bantuan dari bot.
- Marker permanen sampai pemain diselamatkan.
- Sistem ping bebas pada seluruh area map.

## Rekomendasi Final

Versi pertama sebaiknya memakai satu tombol `MINTA RESCUE`, cooldown 10 detik, marker selama 6 detik, dan satu bot kandidat rescue dengan prioritas sementara.

Fitur ini membuat momen berada di penjara tetap interaktif, memberi pemain cara berkomunikasi dengan tim, dan memanfaatkan sistem rescue serta notifikasi yang sudah tersedia tanpa memperbesar scope gameplay secara berlebihan.
