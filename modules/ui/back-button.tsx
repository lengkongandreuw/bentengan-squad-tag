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
    <img className="back-normal" src={resolveAsset('controls/back-inactive.png')} alt="" />
    <img className="back-hover" src={resolveAsset('controls/back-hover.png')} alt="" aria-hidden="true" />
  </button>
);
