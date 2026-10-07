import assert from 'node:assert/strict';
import { createDrawPlayer } from '../modules/ui/draw-player.ts';

const recorder = () => {
  const ops = [];
  const ctx = {
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    save: () => ops.push(['save']),
    restore: () => ops.push(['restore']),
    beginPath: () => ops.push(['beginPath']),
    closePath: () => ops.push(['closePath']),
    translate: (...a) => ops.push(['translate', ...a]),
    scale: (...a) => ops.push(['scale', ...a]),
    rotate: (...a) => ops.push(['rotate', ...a]),
    moveTo: (...a) => ops.push(['moveTo', ...a]),
    lineTo: (...a) => ops.push(['lineTo', ...a]),
    quadraticCurveTo: (...a) => ops.push(['quadraticCurveTo', ...a]),
    ellipse: (...a) => ops.push(['ellipse', ...a]),
    arc: (...a) => ops.push(['arc', ...a]),
    fill: () => ops.push(['fill']),
    stroke: () => ops.push(['stroke']),
    fillRect: (...a) => ops.push(['fillRect', ...a]),
    fillText: (...a) => ops.push(['fillText', ...a]),
    drawImage: (...a) => ops.push(['drawImage', ...a]),
    roundRect: (...a) => ops.push(['roundRect', ...a]),
    measureText: (t) => ({ width: t.length * 5 }),
  };
  return { ops, ctx };
};

const image = (complete, naturalWidth = 7 * 128, naturalHeight = 6 * 136) => ({
  complete,
  naturalWidth,
  naturalHeight,
  marker: 'img',
});

const worldOf = (rec, over = {}) => ({
  getContext: () => rec.ctx,
  kanal: false,
  isWaterAt: () => false,
  getPhase: () => 'PLAYING',
  getRoundWinner: () => undefined,
  getTeamCombos: () => ({ blue: { surgeUntil: 0 }, red: { surgeUntil: 0 } }),
  getUltimateBuffUntil: () => 0,
  getUltimateMeter: () => 0,
  rajaCastMs: 3200,
  kakaCastMs: 3600,
  kakaFrames: 9,
  getSpriteImage: () => image(true),
  getSeriesImage: () => image(true),
  getSprintDustImage: () => image(false, 0, 0),
  getKakaUltimateImage: () => image(true, 4608, 424),
  studioResolve: () => null,
  ...over,
});

const player = (over = {}) => ({
  id: 'p1',
  name: 'KAKA',
  team: 'blue',
  characterId: 'kaka',
  controlled: false,
  state: 'ACTIVE',
  x: 400,
  y: 500,
  vx: 0,
  vy: 0,
  boost: 50,
  baseCharge: 0,
  fortCharge: 0,
  exitOrder: 3,
  aiSeed: 0.5,
  actionUntil: 0,
  parkourUntil: 0,
  ultimateShieldUntil: 0,
  rescueShieldUntil: 0,
  fallNoticeUntil: 0,
  waterEnteredAt: 0,
  waterFallUntil: 0,
  ...over,
});

// Healthy sprite: character sheet blitted + name label + exit badge.
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec));
  draw(player(), player({ team: 'blue' }), 1000);
  const draws = rec.ops.filter((o) => o[0] === 'drawImage');
  assert.ok(draws.length >= 1, 'sprite sheet drawn');
  const texts = rec.ops.filter((o) => o[0] === 'fillText').map((o) => o[1]);
  assert.ok(texts.includes('KAKA'), 'name label');
  assert.ok(texts.includes('3'), 'exit order badge');
}
// Incomplete sprite → placeholder circle, no sheet drawImage of the sheet (dust excluded).
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec, { getSpriteImage: () => image(false, 0, 0) }));
  draw(player(), player(), 0);
  assert.equal(rec.ops.filter((o) => o[0] === 'drawImage').length, 0);
  assert.ok(rec.ops.some((o) => o[0] === 'arc'), 'placeholder circle');
}
// Prisoner: bar across shoulders, GHOST/KEMBALI absent, exit badge absent.
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec));
  draw(player({ state: 'PRISONER', rescueShieldUntil: 0 }), player(), 1000);
  const texts = rec.ops.filter((o) => o[0] === 'fillText').map((o) => o[1]);
  assert.ok(!texts.includes('3'), 'no exit badge for prisoner');
  // prisoner shoulder bar: a moveTo (x-20) lineTo (x+20) at y+2
  const bar = rec.ops.some((o) => o[0] === 'moveTo' && o[1] === 400 - 20 && o[2] === 500 + 2);
  assert.ok(bar, 'prison bar drawn');
}
// Round over: winner gets victory columns path (still draws the sheet).
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec, {
    getPhase: () => 'ROUND_OVER',
    getRoundWinner: () => 'blue',
  }));
  draw(player(), player(), 1000);
  assert.ok(rec.ops.filter((o) => o[0] === 'drawImage').length >= 1);
}
// Controlled HUD: stamina roundRects + star label prefix.
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec));
  draw(player({ controlled: true }), player({ team: 'blue' }), 1000);
  assert.ok(rec.ops.some((o) => o[0] === 'roundRect'), 'stamina bar via roundRect');
  const texts = rec.ops.filter((o) => o[0] === 'fillText').map((o) => o[1]);
  assert.ok(texts.some((t) => t.startsWith('★ ')), 'starred name');
}
// Ultimate shield aura draws green ring; shield badge when shield window active.
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec));
  draw(player({ ultimateShieldUntil: 5000 }), player(), 1000);
  const fills = rec.ops.filter((o) => o[0] === 'fill').length;
  assert.ok(fills >= 2, 'aura circles filled');
}
// Surge ring while team combo active.
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec, {
    getTeamCombos: () => ({ blue: { surgeUntil: 9999 }, red: { surgeUntil: 0 } }),
  }));
  draw(player(), player({ team: 'blue' }), 1000);
  const strokes = rec.ops.filter((o) => o[0] === 'stroke').length;
  assert.ok(strokes >= 3, 'gold surge ring stroked');
}
// Water: ripple ellipses + waterline; fall notice shows OOOPSS while active.
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec, {
    isWaterAt: () => true,
  }));
  draw(player({ fallNoticeUntil: 5000 }), player(), 1000);
  const texts = rec.ops.filter((o) => o[0] === 'fillText').map((o) => o[1]);
  assert.ok(texts.includes('OOOPSS... HATI-HATI'), 'fall notice');
  assert.ok(texts.includes('AIR DALAM · PARKOUR'), 'deep water label');
}
// Kaka shield ultimate swaps to the strip image (wide source frame).
{
  const rec = recorder();
  const draw = createDrawPlayer(worldOf(rec));
  draw(player({ action: 'ultimate', actionUntil: 3000 }), player(), 1000);
  const strip = rec.ops.find((o) => o[0] === 'drawImage' && o[1] && o[1].naturalWidth === 4608);
  assert.ok(strip, 'kaka ultimate strip used');
  // strip frame width = 4608/9 = 512
  assert.equal(strip[4], 512);
}

console.log('PASS createDrawPlayer: sheet blit, fallback, prisoner, result, HUD, aura, surge, water+notice, kaka strip.');
