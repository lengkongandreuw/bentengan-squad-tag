import { UserRound } from 'lucide-react';

// Splash profile entry button.
export const ProfileTriggerButton = ({ onOpen }: { onOpen: () => void }) => (
  <button
    className="profile-trigger"
    onClick={onOpen}
    aria-label="Buka profil pemain"
  >
    <UserRound size={19} />
  </button>
);
