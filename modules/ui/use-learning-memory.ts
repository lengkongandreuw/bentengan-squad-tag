import {useEffect} from 'react';
import {recordPlayerLearnedMechanics,type TutorialMechanic} from '../../lib/player-profile';
/** Only successful facts enter here. No write per HUD tick and no second storage key. */
export function useLearningMemory(observed:readonly TutorialMechanic[]){
  const key=observed.join(',');
  useEffect(()=>{if(!key)return;try{recordPlayerLearnedMechanics(key.split(',') as TutorialMechanic[]);}catch{/* Keep playing with blocked storage; retry on the next new learning fact/session. */}},[key]);
}
