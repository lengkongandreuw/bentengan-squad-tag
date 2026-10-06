export type SimulationClock = {tick:number;fixedDeltaMs:number;simulationTimeMs:number;remainderMs:number};
export function createSimulationClock(hz=30):SimulationClock {
  const fixedDeltaMs=1000/hz;
  if(!Number.isFinite(hz)||hz<=0||!Number.isFinite(fixedDeltaMs)||fixedDeltaMs<=0)throw Error('Invalid simulation frequency');
  return {tick:0,fixedDeltaMs,simulationTimeMs:0,remainderMs:0};
}
/** Standalone fixed clock. Does not read RAF, Date, performance, DOM or input. */
export function advanceSimulationClock(clock:SimulationClock,elapsedMs:number) {
  if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw Error('Invalid simulation delta');
  const total=clock.remainderMs+elapsedMs;
  const steps=Math.floor((total+1e-8)/clock.fixedDeltaMs);
  if(!Number.isSafeInteger(clock.tick+steps))throw Error('Simulation tick overflow');
  clock.tick+=steps;
  clock.simulationTimeMs=clock.tick*clock.fixedDeltaMs;
  clock.remainderMs=Math.max(0,total-steps*clock.fixedDeltaMs);
  return steps;
}
