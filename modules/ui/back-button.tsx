// Graffiti back button (menu navigation).
export const BackButton = ({
  resolveAsset,
  onBack,
}: {
  resolveAsset: (file: string) => string;
  onBack: () => void;
}) => (
  <button className="graffiti-back" onClick={onBack} aria-label="Kembali">
    <img src={resolveAsset('controls/back.webp')} alt="Kembali" />
  </button>
);
