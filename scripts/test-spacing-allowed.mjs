import assert from 'node:assert/strict';
import { spacingPositionAllowed } from '../modules/gameplay/collision-navigation.ts';

const free = () => false;
const blocked = () => true;
const base = ({ p, x, y, world } = {}) => ({
  p: { state: 'ACTIVE', baseCharge: 0, baseChargeTime: 1, x: 0, y: 0, ...p },
  x: x ?? 50,
  y: y ?? 50,
  world: {
    kanal: false,
    waterBlocksAt: free,
    waterAt: free,
    fortCoreAt: free,
    obstacleAt: free,
    homeBase: { x: 0, y: 0 },
    baseRadius: 118,
    ...world,
  },
});

// Clear ground passes.
{
  const { p, x, y, world } = base();
  assert.equal(spacingPositionAllowed(p, x, y, world), true);
}
// Obstacle blocks.
{
  const { p, x, y, world } = base({ world: { obstacleAt: blocked } });
  assert.equal(spacingPositionAllowed(p, x, y, world), false);
}
// Non-kanal water alone does NOT block (only obstacles do); dry passes.
{
  const { p, x, y, world } = base({ world: { waterAt: blocked } });
  assert.equal(spacingPositionAllowed(p, x, y, world), true);
}
// Kanal: ring blocks, dry target entering fort core blocks.
{
  const { p, x, y, world } = base({ world: { kanal: true, waterBlocksAt: blocked } });
  assert.equal(spacingPositionAllowed(p, x, y, world), false);
}
{
  const { p, x, y, world } = base({
    world: { kanal: true, fortCoreAt: (fx, fy) => fx === x && fy === y },
  });
  assert.equal(spacingPositionAllowed(p, x, y, world), false);
}
// Undercharged IN_BASE player leaving home radius is rejected;
// charged or staying home passes.
{
  const p = { state: 'IN_BASE', baseCharge: 0, baseChargeTime: 5, x: 0, y: 0 };
  const { world } = base();
  assert.equal(spacingPositionAllowed(p, 200, 200, world), false);
  assert.equal(spacingPositionAllowed(p, 10, 10, world), true);
  assert.equal(
    spacingPositionAllowed({ ...p, baseCharge: 5 }, 200, 200, world),
    true,
  );
}
console.log('PASS spacingPositionAllowed: clear, obstacle, water, kanal, base-charge.');
