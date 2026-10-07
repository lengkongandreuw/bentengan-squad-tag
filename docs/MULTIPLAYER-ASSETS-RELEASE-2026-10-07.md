# Multiplayer artwork and quality-preserving asset release

The landing multiplayer button uses the supplied artwork, converted to a 1024px
lossless WebP for a maximum 320px display. This resizing concerns the UI button
only; character/map sprite resolution, frame count and FPS are not reduced.
The button retains its accessible name, hover/focus feedback and lobby action.

Shared runtime packing trims transparent padding and deduplicates pixel-identical
poses within an atlas, retaining independent logical frames and trim offsets.
Visible RGB/alpha, pivots, scales, mirroring, and animation timing are preserved.
Current measured character packing remains 731.8 → 392.8 MiB single-RGBA proxy;
deduplication adds protection against repeated poses but did not yield an
additional material memory reduction on these already-packed character atlases.
Map packing reduces eleven unique atlases 78.06 → 58.54 MiB; Arena Benteng 1's
referenced map-image proxy becomes 110.39 → 90.89 MiB. These are not browser RAM
or mobile FPS measurements. Current-map loading and viewport/collision indexing
avoid retaining/rendering unneeded map resources.

This release integrates pending UI accessibility/gameplay guidance and map P1/P2
fixes from the local development sequence. Existing local map changes are kept;
no forced remote reset, overwrite or force push is used. Source editor sprites
and map assets remain available. Runtime manifests fall back safely for new clips.

Verification includes lossless alpha/visible-pixel checks for all generated
sprite and map atlases, identical-pose deduplication with different offsets,
collision/performance parity, game core/multiplayer/map-editor tests, TypeScript,
Pages production build, and desktop/portrait/landscape functional browser checks.
The older performance harness was updated to exercise the extracted shared
tag-contact rules rather than look for a removed inline implementation.

Deployment completion must be confirmed by GitHub Actions and public
`build-info.json` serving the pushed commit and map revision.
