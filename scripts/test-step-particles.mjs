import assert from 'node:assert/strict';
import { stepParticles } from '../modules/ui/effects-particles.ts';

const particle = (over = {}) => ({
  x: 100, y: 200, vx: 50, vy: -30, life: 0.65, color: '#fff', ...over,
});

// One tick: position integrates, velocity decays by 0.94, life drops.
{
  const p = particle();
  const survivors = stepParticles([p], 0.1);
  assert.equal(survivors.length, 1);
  assert.equal(p.x, 100 + 50 * 0.1);
  assert.equal(p.y, 200 + -30 * 0.1);
  assert.ok(Math.abs(p.vx - 50 * 0.94) < 1e-12);
  assert.ok(Math.abs(p.vy - -30 * 0.94) < 1e-12);
  assert.ok(Math.abs(p.life - 0.55) < 1e-12);
}
// Dead particles are dropped; survivors returned as a fresh list.
{
  const alive = particle({ life: 0.5 });
  const dying = particle({ life: 0.05 });
  const survivors = stepParticles([alive, dying], 0.1);
  assert.deepEqual(survivors, [alive]);
  assert.equal(survivors.length, 1);
}
// Zero dt only decays nothing (life unchanged when dt=0).
{
  const p = particle({ life: 0.5, vx: 10, vy: 10, x: 0, y: 0 });
  stepParticles([p], 0);
  assert.equal(p.life, 0.5);
  assert.equal(p.x, 0);
}
// Mutates the same objects (draw reads position from them in place).
{
  const p = particle();
  const survivors = stepParticles([p], 0.1);
  assert.equal(survivors[0], p);
}
// Empty list → empty list.
assert.deepEqual(stepParticles([], 0.1), []);

console.log('PASS stepParticles: integration, 0.94 decay, life drop, culling, identity, empty.');
