import { t } from '../../lib/language';
import { homeMenuArt } from './home-menu-art.tsx';

// Graffiti back button (menu navigation).
export function ArtworkBackButton({onBack,label=t('Kembali'),caption,className=''}: {
  onBack:()=>void;label?:string;caption?:string;className?:string;
}) {
  return <button type="button" className={`menu-art-back ${className}`} onClick={onBack} aria-label={label}>
    <img src={homeMenuArt('back')} alt="" width="464" height="155" draggable={false} />
    {caption&&<span className="menu-art-back-caption">{caption}</span>}
  </button>;
}

export const BackButton=({onBack}: {resolveAsset?:(file:string)=>string;onBack:()=>void}) =>
  <ArtworkBackButton onBack={onBack} className="graffiti-back" />;
