import {useLanguage} from '../../lib/language';
import {EFFECT_LABELS} from './player-status-feedback';
export function PlayerStatusReference(){
  const id=useLanguage()==='id';
  return <details className="pause-controls-reference"><summary>{id?'Efek status karakter':'Character status effects'}</summary><dl className="pause-controls">
    <div><dt>{EFFECT_LABELS.immune[id?1:0]}</dt><dd>{id?'Perlindungan singkat saat melompat atau setelah rescue.':'Brief protection during a jump or after a rescue.'}</dd></div>
    <div><dt>{EFFECT_LABELS.shielded[id?1:0]}</dt><dd>{id?'Perisai Ultimate sedang melindungi karakter.':'An active Ultimate shield is protecting this character.'}</dd></div>
    <div><dt>{EFFECT_LABELS.captured[id?1:0]}</dt><dd>{id?'Karakter berada di penjara dan menunggu rescue.':'The character is in prison, waiting for a rescue.'}</dd></div>
    <div><dt>{EFFECT_LABELS.warning[id?1:0]}</dt><dd>{id?'Peringatan jatuh atau pendaratan dari kemampuan terbang.':'An active fall or flight-landing warning.'}</dd></div>
    <div><dt>SPRINT / {EFFECT_LABELS.powered[id?1:0]}</dt><dd>{id?'Sprint yang benar-benar digunakan atau buff Ultimate aktif.':'A Sprint being used, or an active Ultimate buff.'}</dd></div>
  </dl></details>;
}
