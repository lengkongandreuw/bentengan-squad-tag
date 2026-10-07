import { Wrench } from 'lucide-react';

// Floating workshop entry (character-select step only; guard stays owner).
export const WorkshopLink = ({ onOpen }: { onOpen: () => void }) => (
  <button className="workshop-link workshop-float" onClick={onOpen}>
    <Wrench size={14} /> Workshop
  </button>
);
