import { t } from '../../lib/language';
import { UserRound } from 'lucide-react';

// Splash profile entry button.
export const ProfileTriggerButton = ({ onOpen }: { onOpen: () => void }) => (
  <button
    className="profile-trigger"
    onClick={onOpen}
    aria-label={t("Buka profil pemain")}
  >
    <UserRound size={19} />
  </button>
);
