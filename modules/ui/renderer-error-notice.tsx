import { t } from '../../lib/language';

// Renderer failure fallback over the 3D stage. Pure presentation.
export const RendererErrorNotice = ({
  error,
  onBack,
}: {
  error: string;
  onBack: () => void;
}) => (
  <div className="renderer-error" role="alert">
    <strong>{t("MAP 3D TIDAK TERSEDIA")}</strong>
    <p>{t(error)}</p>
    <button onClick={onBack}>{t("KEMBALI KE MENU")}</button>
  </div>
);
