import {createRoot} from 'react-dom/client';
import {GameplayScreenShell,HudZone} from '../../modules/ui/gameplay-screen-shell';
import './hud-shell-smoke.css';
// Geometry-only QA placeholders, never runtime artwork or fake game state.
function Fixture(){return <GameplayScreenShell className="fixture-hud">
  <canvas aria-label="Test arena" />
  <HudZone zone="fort" owner="qa-fort" placement="anchored"><div className="qa-card">Fort</div></HudZone>
  <HudZone zone="match" owner="qa-match" placement="anchored"><button className="qa-card">Teams / Timer</button></HudZone>
  <HudZone zone="pause" owner="qa-pause" placement="anchored"><button className="qa-card">Pause</button></HudZone>
  <HudZone zone="context" owner="qa-context" placement="anchored"><div className="qa-card qa-context">Contextual instruction</div></HudZone>
  <HudZone zone="ultimate" owner="qa-ultimate" placement="anchored"><button className="qa-card qa-ultimate">Ultimate</button></HudZone>
  <HudZone zone="controller" owner="qa-controller" placement="anchored"><button id="qa-move" className="qa-card">Move</button><button id="qa-actions" className="qa-card">Actions</button></HudZone>
</GameplayScreenShell>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
