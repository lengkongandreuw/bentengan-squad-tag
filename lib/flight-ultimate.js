// One shared controller. Seconds for gameplay; milliseconds for sprite playback.
import {spriteDirection} from './sprite-studio-model.js';
const shared={enabled:true,flightDuration:4,ignoreParkourCollider:true,tagImmuneWhileFlying:true,disableGameplayInteractions:true,visualHeight:24,takeoffAnimation:'ultimate_takeoff',flyingAnimation:'ultimate_fly',landingAnimation:'ultimate_land'};
export const FLIGHT_CONFIG = Object.freeze({
  bebe: Object.freeze({...shared,speedMultiplier:1.25,turnMultiplier:.85,takeoffSeconds:.70,landingSeconds:.40,icon:'ui-v2/ultimate/bebe.png'}),
  ciici: Object.freeze({...shared,speedMultiplier:1.20,turnMultiplier:1.15,takeoffSeconds:.65,landingSeconds:.35,icon:'ui-v2/ultimate/ciici.png'}),
});
export const flightConfig = id => FLIGHT_CONFIG[id] ?? null;
export const isFlying = p => p.flight?.stage === 'FLYING';
export const flightBusy = p => !!p.flight;
export const flightSlot = (f, config = shared) => f?.stage === 'FLIGHT_TAKEOFF' ? config.takeoffAnimation : f?.stage === 'FLYING' ? config.flyingAnimation : f?.stage === 'FLIGHT_LANDING' ? config.landingAnimation : null;
export const sequenceComplete = (clip, elapsedMs, fallbackSeconds) => elapsedMs >= (clip ? clip.frames.length / clip.fps * 1000 : fallbackSeconds * 1000);
export function startFlight(position) {
  return {stage:'FLIGHT_TAKEOFF',elapsed:0,remaining:0,heading:0,headingSet:false,direction:spriteDirection(position.vx??0,position.vy??1),lastGround:{x:position.x,y:position.y},warning:false,distance:0};
}
export function advanceFlight(f, config, dt, complete, hooks = {}) {
  f.elapsed += dt;
  if(f.stage === 'FLIGHT_TAKEOFF' && complete) {
    f.stage='FLYING';f.elapsed=0;f.remaining=config.flightDuration;hooks.onFlightStart?.();
  } else if(f.stage === 'FLYING') {
    const previous=f.remaining;f.remaining=Math.max(0,f.remaining-dt);
    if(!f.warning && previous>.5 && f.remaining<=.5){f.warning=true;hooks.onFlightWarning?.();}
    if(f.remaining===0){hooks.onSafeLanding?.();f.stage='FLIGHT_LANDING';f.elapsed=0;hooks.onFlightLanding?.();}
  } else if(f.stage === 'FLIGHT_LANDING' && complete) {hooks.onFlightEnd?.();return null;}
  return f;
}
export function steerFlight(f, dx, dy, dt, turnMultiplier) {
  if(!dx&&!dy)return {x:0,y:0};
  const desired=Math.atan2(dy,dx);
  if(!f.headingSet){f.heading=desired;f.headingSet=true;}
  const difference=Math.atan2(Math.sin(desired-f.heading),Math.cos(desired-f.heading));
  f.heading+=Math.max(-10*turnMultiplier*dt,Math.min(10*turnMultiplier*dt,difference));
  f.direction=spriteDirection(Math.cos(f.heading),Math.sin(f.heading));
  return {x:Math.cos(f.heading),y:Math.sin(f.heading)};
}
export function safeFlightLanding(position, lastGround, valid) {
  if(valid(position.x,position.y))return {x:position.x,y:position.y};
  for(let radius=8;radius<=256;radius+=8)for(let i=0;i<32;i++) {
    const x=position.x+Math.cos(i*Math.PI/16)*radius,y=position.y+Math.sin(i*Math.PI/16)*radius;
    if(valid(x,y))return {x,y};
  }
  return valid(lastGround.x,lastGround.y)?{...lastGround}:null;
}
// Conservative explicit low-obstacle allowlist; unknown/hidden/world objects block.
export const FLIGHT_LOW_ASSETS = new Set(['bucket','bush','crates','drain','trash','plant','plantFence','flowerBedSmall','flowerFence']);
export const flightPassesObstacle = o => !o.hidden && FLIGHT_LOW_ASSETS.has(o.asset);
