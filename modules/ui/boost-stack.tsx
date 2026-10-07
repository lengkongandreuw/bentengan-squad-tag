// Stamina bar with recharge countdown. Pure snapshot display.
export const BoostStack = ({
  boost,
  boostCountdown,
}: {
  boost: number;
  boostCountdown: number;
}) => (
  <div className="boost-stack">
    <div className="boost-label">
      <span>⚡ STAMINA</span>
      <b>{Math.round(boost)}%</b>
      <em>{boostCountdown ? `PULIH ${boostCountdown}s` : 'SIAP'}</em>
    </div>
    <div className="stamina-bar">
      <span style={{ width: `${boost}%` }} />
    </div>
  </div>
);
