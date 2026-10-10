import assert from 'node:assert/strict';
import { GUIDE_FIELD_CONFIGS, buildFieldConfigs } from '../modules/world/map-data/guide-fields.ts';

assert.deepEqual(GUIDE_FIELD_CONFIGS.map((field) => field.id), ['kampung', 'pasar', 'taman', 'kanal', 'kanal2']);
const built = buildFieldConfigs(GUIDE_FIELD_CONFIGS);
const expect = {
  kampung: { w: 1769, h: 1260, obs: 29, dec: 3, base: [202, 585, 1567, 585], prison0: [226, 897, 243, 185], obs0: [317, 170, 153, 38, 'warung'] },
  pasar: { w: 2100, h: 1050, obs: 71, dec: 6, base: [180, 555, 1920, 555], prison0: [325, 170, 270, 185], obs0: [950, 540, 200, 50, 'map2Center'] },
  taman: { w: 1920, h: 960, obs: 47, dec: 0, base: [150, 430, 1770, 430], prison0: [497, 631, 185, 179], obs0: [888, 365, 144, 95, 'flowerBedSmall'] },
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
