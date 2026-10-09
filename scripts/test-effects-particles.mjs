import assert from 'node:assert/strict';
import { burst } from '../modules/ui/effects-particles.ts';

// Deterministic Math.random: alternating sequence so angles/vary differ.
const original = Math.random;
let seq = 0;
Math.random = () => [0, 0.5, 0.25, 0.75][seq++ % 4];

try {
  // Count, origin, life, color.
  const particles = burst(100, 200, '#abcdef', 7);
  assert.equal(particles.length, 7);
  for (const p of particles) {
    assert.equal(p.x, 100);
    assert.equal(p.y, 200);
    assert.equal(p.life, 0.65);
    assert.equal(p.color, '#abcdef');
    const speed = Math.hypot(p.vx, p.vy);
    assert.ok(speed >= 30 && speed <= 110, `speed ${speed} outside 30..110 envelope`);
  }
  // Default count is 12.
  assert.equal(burst(0, 0, '#fff').length, 12);
  // Same random sequence → same output (pure given the PRNG stream).
  seq = 0;
  const again = burst(100, 200, '#abcdef', 7);
  seq = 0;
  const third = burst(100, 200, '#abcdef', 7);
  assert.deepEqual(again, third);
  // Zero count yields nothing.
  assert.equal(burst(0, 0, '#000', 0).length, 0);
} finally {
  Math.random = original;
}

console.log('PASS burst: count, origin, envelope, default, purity, zero-count.');
