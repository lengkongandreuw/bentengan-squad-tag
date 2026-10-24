import { t } from '../../lib/language';
import { publicAsset } from '../../lib/characters.ts';

// Splash profile entry button.
export const ProfileTriggerButton = ({ onOpen }: { onOpen: () => void }) => (
  <button
    className="profile-trigger"
    onClick={onOpen}
    aria-label={t("Buka profil pemain")}
  >
    <img src={publicAsset('ui-v2/portraits/raja.webp')} alt="" width="96" height="96" />
  </button>
);
