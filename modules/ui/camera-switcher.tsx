import { Map as MapIcon } from 'lucide-react';

// Camera picker. Prebuilt options and current selection arrive as props.
export const CameraSwitcher = ({
  options,
  cameraMode,
  onSelect,
}: {
  options: Array<{ id: string; label: string }>;
  cameraMode: string;
  onSelect: (id: string) => void;
}) => (
  <div className="camera-switcher camera-map" aria-label="Pilihan kamera">
    <span>
      <MapIcon size={13} /> PETA
    </span>
    {options.map((camera) => (
      <button
        key={camera.id}
        className={cameraMode === camera.id ? 'selected' : ''}
        onClick={() => onSelect(camera.id)}
        aria-pressed={cameraMode === camera.id}
      >
        {camera.label}
      </button>
    ))}
  </div>
);
