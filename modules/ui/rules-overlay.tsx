// Game rules dialog (static content). Pure presentation; the owner owns
// the open state and receives the close action.
import { t } from '../../lib/language';

export const RulesOverlay = ({ onClose }: { onClose: () => void }) => (
  <dialog
    className="rules-overlay"
    open
    aria-modal="true"
    aria-labelledby="rules-title"
  >
    <div className="rules-dialog">
      <button
        className="rules-close"
        onClick={onClose}
        aria-label={t('Tutup')}
      >
        ×
      </button>
      <span>{t('BENTENGAN 5V5')}</span>
      <h2 id="rules-title">{t('Jaga tim. Rebut benteng.')}</h2>
      <ol>
        <li>
          <b>{t('Bersiap di bentengmu.')}</b>{t(' Setelah siap, keluar dalam 5 detik. Balik ke benteng untuk memperbarui urutan tag.')}</li>
        <li>
          <b>{t('Kejar lawan yang keluar lebih dulu.')}</b>{t(' Sentuh untuk tag. Lawan yang kena masuk penjara timmu.')}</li>
        <li>
          <b>{t('Bebaskan temanmu.')}</b>{t(' Sentuh rekan paling ujung di rantai penjara untuk rescue seluruh rantai. Mereka pulang otomatis dengan kebal tag singkat, lewat jalur aman.')}</li>
        <li>
          <b>{t('Sambung aksi tim.')}</b>{t(' Tag atau rescue dari rekan berbeda dalam 6,5 detik memberi boost tim dan Squad Surge.')}</li>
        <li>
          <b>{t('5 ronde, poin tertinggi menang.')}</b>{t(' Rebut benteng +3, tahan semua lawan 4 detik +2, menang waktu atau sudden death +1. Ronde final bernilai ×2. Match berhenti lebih awal kalau selisih poin sudah tak terkejar. Pilih Turnamen untuk 7 ronde.')}</li>
        <li>
          <b>{t('Rebut benteng butuh kerja tim.')}</b>{t(' Benteng terkunci 45 detik pertama tiap ronde. Setelah itu, 1 penyerang butuh 5 detik, 2 penyerang 3,5 detik, 3 atau lebih 2,5 detik. Penjaga aktif di benteng menurunkan progres.')}</li>
        <li>
          <b>{t('Ronde 3 menit.')}</b>{t(' Seri? Lanjut sudden death: tag atau rebut benteng berikutnya menang. Poin akhir seri ditentukan ronde menang terbanyak, lalu tangkapan unik, lalu Ronde Emas 90 detik.')}</li>
        <li>
          <b>{t('Draft perk antar ronde.')}</b>{t(' Tim yang kalah memilih 1 dari 3 perk; tim pemenang mendapat 1 perk sisa secara acak. Perk berlaku sampai match selesai, maksimal 3 per tim.')}</li>
        <li>
          <b>{t('Multiplayer:')}</b>{t(' untuk sementara tetap aturan lama: ambil 2 ronde untuk menang, ronde 4 menit, rebut benteng setelah 1,5 detik tanpa penjaga, atau tahan semua lawan 2 detik.')}</li>
        <li>
          <b>{t('Map Kanal:')}</b>{t(' seberangi sungai lewat jembatan atau parkour. Jatuh ke air mengembalikan pemain ke benteng.')}</li>
        <li>
          <b>{t('Ultimate: pilih momenmu.')}</b>{t(' Raja mempercepat rekan aktif; Kaka melindungi tim dari tag. Bebe dan Ciici kebal tag sejak lepas landas sampai selesai mendarat. Selama itu mereka tidak bisa tag, rescue, mengambil boost, atau merebut benteng. Rintangan rendah hanya bisa dilewati saat terbang. Durasi efek mengikuti level upgrade.')}</li>
      </ol>
      <p>{t('Desktop: WASD gerak · Klik kiri tujuan · Klik kanan boost · Space sprint · Shift parkour · Caps Lock Ultimate · P jeda. Ponsel: D-pad kiri dan tombol aksi kanan.')}</p>
    </div>
  </dialog>
);
