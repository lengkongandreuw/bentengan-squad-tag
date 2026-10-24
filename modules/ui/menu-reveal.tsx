// A keyed, presentation-only sweep: no timers, navigation lock or delayed actions.
export function MenuReveal({step}: {step:string}) {
  return <div className={`menu-reveal reveal-${step}`} aria-hidden="true"><i /><b /></div>;
}
