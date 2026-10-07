// Renderer failure fallback over the 3D stage. Pure presentation.
export const RendererErrorNotice = ({
  error,
  onBack,
}: {
  error: string;
  onBack: () => void;
}) => (
  <div className="renderer-error" role="alert">
    <strong>MAP 3D TIDAK TERSEDIA</strong>
    <p>{error}</p>
    <button onClick={onBack}>KEMBALI KE MENU</button>
  </div>
);
