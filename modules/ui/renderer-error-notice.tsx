import { t } from '../../lib/language';
import { ArtworkBackButton } from './back-button.tsx';

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
    <ArtworkBackButton onBack={onBack} label={t('KEMBALI KE MENU')} />
  </div>
);
