import assert from 'node:assert/strict';
import { uiAsset, matchEventFrames, roundResultAssets, loadingUiFrame, loadingUiFrames } from '../modules/ui/ui-assets.ts';

const sources = {
  mapArtwork: (id) => (id === 'studio-mine' ? 'CUSTOM' : null),
  publicAsset: (file) => `PUBLIC:${file}`,
};

// Plain files get the ui-v2 prefix with the default asset version.
assert.equal(uiAsset('controls/back.webp', sources), 'PUBLIC:ui-v2/controls/back.webp?v=8');
// Team-red controls carry the newer asset version.
assert.equal(uiAsset('controls/team-red-active.webp', sources), 'PUBLIC:ui-v2/controls/team-red-active.webp?v=9');
// kampung3d preview falls back to the kampung card.
assert.equal(uiAsset('fields/kampung3d.webp', sources), 'PUBLIC:ui-v2/fields/kampung.webp?v=8');
// Custom studio maps resolve through mapArtwork, falling back to kampung.
assert.equal(uiAsset('fields/studio-mine.webp', sources), 'CUSTOM');
assert.equal(uiAsset('fields/studio-other.webp', sources), 'PUBLIC:ui-v2/fields/kampung.webp');
// Non-studio field ids never hit the custom branch.
assert.equal(uiAsset('fields/kanal2.webp', sources), 'PUBLIC:ui-v2/fields/kanal2.webp?v=8');

// Match-event frames route through the same resolvers.
const frames = matchEventFrames(sources);
assert.equal(frames.tag, 'PUBLIC:arena-ui/match-events/notification-tag.png.PNG?v=3');
assert.equal(frames.rescue, frames['rescue-request']);

// Round-result assets: blue shows the red-victory card and vice versa (mirrored labels).
const results = roundResultAssets(sources);
assert.equal(results.blue, 'PUBLIC:arena-ui/match-events/merah-menang.png?v=3');
assert.equal(results.red, 'PUBLIC:arena-ui/match-events/hijau-menang.png?v=3');

// Loading frames: red gets the 00 opener, green starts at 20; milestones floor.
assert.equal(loadingUiFrame('red', 0, sources), 'PUBLIC:loading-ui/TEAM MERAH LOADING 00_.png?v=1');
assert.equal(loadingUiFrame('red', 81, sources), 'PUBLIC:loading-ui/TEAM MERAH LOADING 80_.png?v=1');
assert.equal(loadingUiFrame('green', 100, sources), 'PUBLIC:loading-ui/TEAM HIJAU LOADING 100_.png?v=1');
assert.deepEqual(loadingUiFrames(sources).length, 11);
console.log('PASS uiAsset: versioning, kampung3d rewrite, custom-map routing, event frames, result assets.');
