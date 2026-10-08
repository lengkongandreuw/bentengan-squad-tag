# Runtime performance diagnostics

Open the game with `?performance=1`, then start a match. No admin server restart is needed for game code changes.

The game canvas exposes `data-runtime-performance`, refreshed about once per second:

```js
JSON.parse(document.querySelector('canvas[data-runtime-performance]').dataset.runtimePerformance)
```

- `frames`: rendered frames in this sampling window (not a normalized FPS figure).
- `updateMs`: average synchronous simulation work, including the scheduled AI route.
- `drawMs`: average CPU time issuing canvas draw calls; not GPU completion time.
- `hudMs`: average synchronous HUD preparation/enqueue time; does not include subsequent React rendering.
- `worstWorkMs`: longest synchronous loop workload in this window, not frame interval.
- `routeQueue`: pending AI route requests.

Compare the same map, character lineup, camera, viewport and crowded encounter. Browser Performance tools are needed to measure GPU, React commits, GC and actual frame intervals. The optional diagnostics are off by default and do not log every frame.

AI routes use the same collision sampling and tie-breaking as before, but A* uses a binary priority queue instead of scanning the entire open set. Requests are coalesced per actor and serviced FIFO, at most one per frame. Cached routes/local collision-aware steering keep actors moving while waiting. A single difficult route can still consume a frame; the queue limits simultaneous route solves, not execution time of one solve.

Closed scoreboard rows are not rebuilt every HUD tick; opening the board and round/match results rebuild them. Movement, tag checks, image resolution, DPR, smoothing and animation frame rate are unchanged.

Regression harness:

```powershell
node --test scripts/test-route-performance.mjs scripts/test-click-navigation.mjs scripts/test-runtime-performance.mjs scripts/test-flight-ultimate.mjs
```

The harness compares exact routes to the original implementation and reports route-search timing only. It is not an end-to-end FPS benchmark.
