import { t } from '../../lib/language';

// Graffiti back button (menu navigation).
export const BackButton = ({
  resolveAsset,
  onBack,
}: {
  resolveAsset: (file: string) => string;
  onBack: () => void;
}) => (
  <button className="graffiti-back" onClick={onBack} aria-label={t("Kembali")}>
    <img src={resolveAsset('controls/back.webp')} alt={t("Kembali")} />
  </button>
);
