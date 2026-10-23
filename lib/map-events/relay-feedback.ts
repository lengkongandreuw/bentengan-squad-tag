import type {RelayEvent} from './power-relay.ts';
import type {GameplaySound} from '../../modules/audio/gameplay-audio.ts';

/** Events, never render frames, drive cues. No opponent input sounds or final double-chime. */
export function relaySounds(events:readonly RelayEvent[],localId:string):GameplaySound[]{
  const opened=events.some(e=>e.type==='open');
  const result=new Set<GameplaySound>();
  for(const event of events){
    if(event.actorId&&event.actorId!==localId)continue;
    const cue:GameplaySound|undefined=event.type==='ready'?'relay-ready':event.type==='open'?'relay-open':event.type==='closing'?'relay-warning':event.type==='close'||event.type==='expired'?'relay-close':event.type==='attempt'?'relay-start':event.type==='advance'&&!opened?'relay-connect':event.type==='wrong'?'relay-error':event.type==='cancel'?'relay-cancel':undefined;
    if(cue)result.add(cue);
  }
  return [...result];
}
