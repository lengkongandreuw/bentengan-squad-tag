import type {CSSProperties,ReactNode} from 'react';
import './gameplay-screen-shell.css';

/** Destination ownership, not gameplay state. Migrate one zone at a time. */
export const HUD_ZONES = ['fort','match','pause','context','ultimate','controller','feedback','dialogs','legacy'] as const;
export type HudZoneName = typeof HUD_ZONES[number];

export function GameplayScreenShell({children,className,hudScale=1}:{children:ReactNode;className:string;hudScale?:number}) {
  return <main className={`gameplay-screen-shell hud-core-layout ${className}`} style={{'--hud-scale':hudScale} as CSSProperties} data-hud-phase="10" data-hud-layout="core">{children}</main>;
}

/** Legacy placement is deliberately box-free: no containing-block/input changes.
 * Anchored placement is opt-in only after the destination's behavior is migrated.
 */
export function HudZone({zone,owner,placement='legacy',children}:{
  zone:HudZoneName;owner:string;placement?:'legacy'|'anchored';children?:ReactNode;
}) {
  return <div className="gameplay-hud-zone" data-hud-zone={zone} data-hud-owner={owner} data-placement={placement}>{children}</div>;
}
