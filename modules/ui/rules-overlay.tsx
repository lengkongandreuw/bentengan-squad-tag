// Game rules dialog (static content). Pure presentation; the owner owns
// the open state and receives the close action.
import { t } from '../../lib/language';

export const RulesOverlay = ({ onClose }: { onClose: () => void }) => (
  <div
    className="rules-overlay"
    role="dialog"
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
          <b>{t('Ambil 2 ronde untuk menang.')}</b>{t(' Menang ronde dengan menahan semua lawan selama 2 detik, atau mengisi bar perebutan benteng lawan selama 1,5 detik.')}</li>
        <li>
          <b>{t('Waktu normal 4 menit.')}</b>{t(' Seri? Lanjut sudden death: tag atau rebut benteng berikutnya menang. Arena berganti setelah 3 kemenangan pertandingan.')}</li>
        <li>
          <b>{t('Map Kanal:')}</b>{t(' seberangi sungai lewat jembatan atau parkour. Jatuh ke air mengembalikan pemain ke benteng.')}</li>
        <li>
          <b>{t('Ultimate: pilih momenmu.')}</b>{t(' Raja mempercepat rekan aktif; Kaka melindungi tim dari tag. Bebe dan Ciici kebal tag sejak lepas landas sampai selesai mendarat. Selama itu mereka tidak bisa tag, rescue, mengambil boost, atau merebut benteng. Rintangan rendah hanya bisa dilewati saat terbang. Durasi efek mengikuti level upgrade.')}</li>
      </ol>
      <p>{t('Desktop: WASD gerak · Klik kiri tujuan · Klik kanan boost · Space sprint · Shift parkour · Caps Lock Ultimate · P jeda. Ponsel: D-pad kiri dan tombol aksi kanan.')}</p>
    </div>
  </div>
);
