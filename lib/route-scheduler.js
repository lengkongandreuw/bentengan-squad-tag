// Coalesce requests by actor and solve at most one route per game frame.
// Map insertion order keeps frequently changing targets from starving other actors.
export function createRouteScheduler() {
  const pending = new Map();
  return {
    /** @param {string} id @param {() => void} solve */
    request(id, solve) { pending.set(id, solve); },
    /** @param {string} id */
    cancel(id) { pending.delete(id); },
    clear() { pending.clear(); },
    get size() { return pending.size; },
    run() {
      const next = pending.entries().next();
      if (next.done) return false;
      const [id, solve] = next.value;
      pending.delete(id);
      solve();
      return true;
    },
  };
}
