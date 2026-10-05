// Match loop driver: requestAnimationFrame mechanics plus per-frame
// sequencing only. Update, render, and snapshot authorship stay with the
// caller as narrow callbacks. Holds no game rules and no match state.
export type MatchFrameCallbacks = {
  tick: (dt: number, now: number) => void;
  render: (now: number) => void;
  commit: (now: number) => void;
};

export function startMatchLoop(callbacks: MatchFrameCallbacks): () => void {
  let raf = 0;
  let last = performance.now();
  let stopped = false;
  const loop = (now: number) => {
    if (stopped) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    callbacks.tick(dt, now);
    if (stopped) return;
    callbacks.render(now);
    if (stopped) return;
    callbacks.commit(now);
    if (stopped) return;
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}
