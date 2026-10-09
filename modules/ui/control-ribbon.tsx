import { t } from '../../lib/language';
// Desktop control hints ribbon. Pure static content apart from the
// ultimate-owner flag and prisoner visibility.
export const ControlRibbon = ({
  state,
  hasUltimate,
}: {
  state: string;
  hasUltimate: boolean;
}) => (
  <div className={`control-ribbon ${state === 'PRISONER' ? 'context-hidden' : ''}`}>
    <b>{t("WASD")}</b>{t(" GERAK ")}<b>{t("SPACE")}</b>{t(" SPRINT ")}<b>{t("SHIFT")}</b>{t(" PARKOUR")}{t(' ')}
    {hasUltimate && (
      <>
        <b>{t("CAPS LOCK")}</b>{t(" ULTIMATE")}{t(' ')}
      </>
    )}
    <b>{t("P")}</b>{t(" JEDA")}
  </div>
);
