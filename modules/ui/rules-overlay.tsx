// Game rules dialog (static content). Pure presentation; the owner owns
// the open state and receives the close action.
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
        aria-label="Tutup"
      >
        ×
      </button>
      <span>BENTENGAN 5V5</span>
      <h2 id="rules-title">Cara merebut kemenangan</h2>
      <ol>
        <li>
          <b>Isi kesiapan di benteng sendiri.</b> Setelah siap, keluar
          dalam 5 detik. Kembali ke benteng untuk memperbarui urutan.
        </li>
        <li>
          <b>Tag lawan yang keluar lebih dulu.</b> Mereka masuk penjara
          timmu.
        </li>
        <li>
          <b>Sentuh rekan terluar di penjara</b> untuk membebaskan
          seluruh rantai. Pemain bebas pulang otomatis dengan perisai
          singkat dan memilih jalan aman dari collider serta sungai.
        </li>
        <li>
          <b>Rangkai combo aksi tim.</b> Tag atau rescue dari rekan
          berbeda dalam 6,5 detik memberi boost tim dan Squad Surge.
        </li>
        <li>
          <b>Menangkan ronde.</b> Tahan seluruh lawan selama 2 detik
          atau isi benteng lawan selama 1,5 detik. Pertandingan dimenangi
          tim pertama yang merebut 2 ronde.
        </li>
        <li>
          <b>Waktu normal 4 menit.</b> Skor seri berlanjut ke sudden
          death. Arena berganti setelah 3 kemenangan pertandingan.
        </li>
        <li>
          <b>Map Kanal:</b> seberangi sungai lewat jembatan atau parkour.
          Jatuh ke air mengembalikan pemain ke benteng.
        </li>
        <li>
          <b>Ultimate Raja dan Kaka.</b> Raja mempercepat rekan aktif;
          Kaka membuat seluruh tim kebal tag selama 5 detik.
        </li>
      </ol>
      <p>
        Desktop: WASD gerak · Klik kiri tujuan · Klik kanan boost · Space sprint · Shift parkour · Caps Lock
        Ultimate · P jeda. Ponsel: D-pad kiri dan tombol aksi kanan.
      </p>
    </div>
  </div>
);
