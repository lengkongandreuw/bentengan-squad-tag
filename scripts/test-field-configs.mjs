import assert from 'node:assert/strict';
import { GUIDE_FIELD_CONFIGS, buildFieldConfigs } from '../modules/world/map-data/guide-fields.ts';

assert.deepEqual(GUIDE_FIELD_CONFIGS.map((field) => field.id), ['kampung', 'pasar', 'taman', 'kanal', 'kanal2']);
const built = buildFieldConfigs(GUIDE_FIELD_CONFIGS);
const expect = {
  kampung: { w: 1769, h: 1260, obs: 29, dec: 3, base: [202, 585, 1567, 585], prison0: [226, 897, 243, 185], obs0: [317, 170, 153, 38, 'warung'] },
  pasar: { w: 1923, h: 1082, obs: 26, dec: 1, base: [196, 523, 1727, 523], prison0: [274, 142, 275, 198], obs0: [756, 296, 143, 50, 'map2BarrierRed'] },
  taman: { w: 1923, h: 1082, obs: 36, dec: 0, base: [173, 520, 1746, 520], prison0: [474, 756, 206, 186], obs0: [46, 87, 250, 60, 'parkCornerNW'] },
  kanal: { w: 1954, h: 1065, obs: 35, dec: 0, base: [207, 513, 1746, 513], prison0: [204, 615, 176, 152], obs0: [27, 83, 656, 57, 'jungleNW'] },
  kanal2: { w: 2883, h: 1296, obs: 35, dec: 2, base: [297, 571, 2583, 571], prison0: [455, 344, 165, 143], obs0: [1347, 633, 190, 67, 'kanalNusaFountain'] },
};
assert.deepEqual(built.map((field) => field.id), ['kampung', 'pasar', 'taman', 'kanal', 'kanal2']);
for (const field of built) {
  const want = expect[field.id];
  assert.equal(field.width, want.w, `${field.id} width`);
  assert.equal(field.height, want.h, `${field.id} height`);
  assert.equal(field.obstacles.length, want.obs, `${field.id} obstacle count`);
  assert.equal(field.decorations.length, want.dec, `${field.id} decoration count`);
  assert.deepEqual([field.bases.blue.x, field.bases.blue.y, field.bases.red.x, field.bases.red.y], want.base, `${field.id} bases`);
  const prison = field.prisons.blue;
  assert.deepEqual([prison.x, prison.y, prison.w, prison.h], want.prison0, `${field.id} blue prison`);
  const first = field.obstacles[0];
  assert.deepEqual([first.x, first.y, first.w, first.h, first.asset], want.obs0, `${field.id} first obstacle`);
}
console.log('PASS field configs: ids, dimensions, counts, bases, prisons, first obstacle per map.');
