import { Users } from 'lucide-react';

// Combo callout banner. Renders nothing while no callout is active.
export const ComboCallout = ({
  callout,
  surge,
}: {
  callout: string;
  surge: boolean;
}) => {
  if (!callout) return null;
  return (
    <div className={`combo-callout ${surge ? 'surge' : ''}`}>
      <Users size={22} />
      <span>{callout}</span>
    </div>
  );
};
