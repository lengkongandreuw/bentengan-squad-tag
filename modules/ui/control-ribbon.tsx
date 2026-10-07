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
    <b>WASD</b> GERAK <b>SPACE</b> SPRINT <b>SHIFT</b> PARKOUR{' '}
    {hasUltimate && (
      <>
        <b>CAPS LOCK</b> ULTIMATE{' '}
      </>
    )}
    <b>P</b> JEDA
  </div>
);
