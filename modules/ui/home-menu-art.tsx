import { publicAsset } from '../../lib/characters.ts';

export const homeMenuArt=(name:string)=>publicAsset(`ui-v2/home-menu/${name}.webp`);

// Viewports into the supplied three-button atlas. The source pixels stay intact;
// each native button gets its own visual, hit area and accessible name.
export function HomeActionArt({action}: {action:'help'|'settings'|'credits'}) {
  const [x,width]={help:[20,380],settings:[398,368],credits:[765,370]}[action];
  return <svg className="home-action-art" viewBox={`${x} 100 ${width} 137`} width={width} height="137" aria-hidden="true" focusable="false">
    <image href={homeMenuArt('actions')} width="1155" height="237" />
  </svg>;
}

export function ModeHeadingArt() {
  return <svg className="mode-heading-art" viewBox="0 56 1124 268" width="1124" height="268" aria-hidden="true" focusable="false">
    <image href={homeMenuArt('heading')} width="1124" height="375" />
  </svg>;
}
