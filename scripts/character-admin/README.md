# Studio Preview Karakter (lokal)

Jalankan dari folder `game`:

```powershell
npm run admin:characters
```

Buka **http://127.0.0.1:4318/**. Terminal harus tetap hidup; Ctrl+C menutup server.
Panel tidak membutuhkan server game. Untuk melihat komposisi game sebenarnya,
jalankan `npm run dev` di terminal terpisah dan buka character selection.

## Menggunakan panel

1. Pilih karakter. Upload GIF/animated WebP/PNG untuk tampilan aktif.
2. Opsional: upload gambar statis untuk tampilan inactive. Tanpa upload ini,
   gambar asli game tetap dipakai. Inactive tetap hitam-putih.
3. Seret preview atau atur slider/angka posisi dan skala. Tombol panah pada
   preview juga mengubah posisi. Angka X/Y adalah persen area gambar, bukan pixel.
4. **Simpan ke proyek** menulis konfigurasi dan aset lokal. Tidak memublikasikan.
5. **Publish ke GitHub** memeriksa TypeScript/build, membuat commit khusus preview,
   lalu push ke remote `github`, branch `main`. Tunggu Actions sukses.

Bagian **Logo halaman depan / landing** menyediakan upload PNG/WebP/JPG, preview,
Simpan logo, dan Kembalikan logo bawaan. Pengaturan tersimpan pada
`branding.logo` di manifest yang sama; tidak mengubah logo tim atau HUD.

Publish memerlukan Git dan GitHub CLI (`gh`) yang sudah login di komputer.
Jika autentikasi gagal, lakukan login di terminal, bukan memasukkan token ke panel.
Jika push ditolak karena remote berubah, sinkronkan Git secara manual; panel tidak
merge otomatis, tidak force push, dan tidak menghapus perubahan lokal.
Perubahan di luar konfigurasi/aset preview harus diselesaikan terpisah dahulu.

## Batas akses

- Server bind **127.0.0.1 saja**, bukan jaringan LAN/internet. Panel tidak masuk
  build GitHub Pages; kode server/editor berada di `scripts`, bukan `public`.
- Host, Origin dan token sesi diperiksa; halaman tidak boleh di-iframe.
- Tidak ada akun/password admin online. Pengguna/proses lain di komputer yang
  sama mungkin dapat mengakses loopback: ini bukan isolasi antar-akun OS.
- Jangan expose port dengan tunnel/reverse proxy dan jangan gunakan komputer
  bersama yang tidak dipercaya. Tutup terminal ketika selesai mengedit.
- Repository tetap publik: kode panel dan GIF yang sudah dipush dapat dilihat
  orang lain, tetapi tidak memberi mereka akses untuk menyimpan perubahan.

## Penyimpanan & pemulihan

- `config/selection-previews.json`: sumber kebenaran version 1; diimpor game saat build.
- `public/selection-previews/<id>/<sha256>.<ext>`: aset dengan nama hash; menghindari
  cache lama. Upload yang sama tidak membuat duplikat; aset lama tidak dihapus.
- `.preview-admin/backup-*.json`: salinan konfigurasi sebelum setiap Simpan, lokal
  dan diabaikan Git. Bisa dipulihkan manual dengan menyalinnya ke file konfigurasi.
- Reset hanya posisi/skala. Batalkan hanya perubahan yang **belum** disimpan.
- Maksimal upload 20 MB, sisi 4096 px, 300 frame dan 180 juta total pixel.
  PNG/GIF/WebP/JPG dikenali dari isinya. SVG dan path luar ditolak.

## Kontrak untuk perubahan UI berikutnya

Panel **tidak membaca HTML/CSS halaman game**. Gunakan komponen
`components/selection-portrait.tsx` pada UI seleksi apa pun:

```tsx
<SelectionPortrait id={character.id} active={isSelected} alt={character.name} />
```

Berikan slot yang mempunyai lebar dan tinggi. Gambar `object-fit: contain`, kaki
di tengah bawah. Transform aktif ditentukan oleh `lib/selection-preview-model.js`
yang juga dipakai panel; inactive mempertahankan proporsi default Boke/Kodo.
Pastikan pembungkus inactive tetap grayscale pada UI baru. Jangan menimpa
transform gambar dengan CSS `!important` atau mengganti komponen dengan img biasa.
Jika mengganti renderer/framework, implementasikan adapter dengan kontrak yang
sama; **tidak mungkin menjamin integrasi jika UI baru sengaja mengabaikan kontrak**.
Perubahan rasio slot dapat memerlukan penyetelan ulang secara visual, tetapi data
dan editor tetap berjalan. Preview panel bukan screenshot layout game.

Layar loading menunggu semua GIF/gambar custom tim terpilih selesai dimuat dan
decoded (batas 90 detik per aset, ada retry/back jika gagal). Cache gambar yang
sama dipakai renderer sehingga sorotan pertama langsung memilih GIF siap.
Gambar statis tetap menjadi fallback jika dipakai di luar alur loading atau gagal.
Preferensi reduced-motion memakai gambar statis. Tidak mengubah atlas,
collider, ukuran gameplay, statistik, animasi dalam pertandingan, atau skill.

Uji: `npm run test:character-admin`, `npx tsc --noEmit`, `npm run build:pages`.
