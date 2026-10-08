import type { UltimateDescriptor } from '../../lib/characters.ts';
import { ultimateIcon } from '../../lib/characters.ts';

// Active ultimate buff chip over the HUD. Pure presentation.
export const UltimateBuffIndicator = ({ ultimate, remaining }: {
  ultimate?: UltimateDescriptor;
  remaining: number;
}) => (
  <div className={`ultimate-buff-indicator ${ultimate?.indicatorClass ?? ''}`}>
    {ultimateIcon(ultimate?.icon ?? 'zap', 13)}
    {ultimate?.buffText ?? ' TITAH +40% · '}
    {remaining}s
  </div>
);
