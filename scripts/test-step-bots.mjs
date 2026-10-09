import assert from 'node:assert/strict';
import { stepBots } from '../modules/gameplay/ai-movement.ts';
import { CHARACTER_BY_ID } from '../lib/characters.ts';
import { createTeamComboState } from '../modules/gameplay/team-combo.ts';

const me = {
  id: 'you',
  team: 'blue',
  characterId: 'raja',
  controlled: true,
  x: 0,
  y: 0,
  vx: 9,
  vy: 9,
  state: 'ACTIVE',
  exitOrder: 1,
  boost: 99,
  aiSeed: 0,
  prisonIndex: 0,
  boostReadyAt: 0,
  waterEnteredAt: 0,
};
const bot = (over = {}) => ({
  id: 'bot',
  team: 'red',
  characterId: 'robot',
  controlled: false,
  x: 10,
  y: 10,
  vx: 7,
  vy: 7,
  state: 'ACTIVE',
  exitOrder: 1,
  boost: 50,
  aiSeed: 0,
  prisonIndex: 0,
  boostReadyAt: 0,
  waterEnteredAt: 0,
  ...over,
});
const world = (players, calls, over = {}) => ({
  players,
  rescueRequest: null,
  refills: [],
  bases: { blue: { x: 0, y: 0 }, red: { x: 100, y: 0 } },
  worldWidth: 1538,
  worldHeight: 1096,
  aiProfile: { prediction: 1, playerBias: 2, threatRadius: 400, rescueCutoff: 1, steerDistance: 104 },
  isKanal: false,
  teamCombos: { blue: createTeamComboState(), red: createTeamComboState() },
  speedMultiplier: 1,
  boostThreshold: -0.15,
  boostDrainMultiplier: 0.66,
  move: (p, x, y, speed) => calls.push(['move', p.id, speed]),
  navigate: (p, desired, now, steer) => {
    calls.push(['navigate', p.id, steer]);
    return { x: 200, y: 0 };
  },
  rajaMultiplier: () => 1,
  ...over,
});

const stats = CHARACTER_BY_ID.robot;

// The human (players[0]) is never touched or moved.
let calls = [];
const roster = [me, bot()];
let w = world(roster, calls);
stepBots({ team: 'blue' }, 1492, 0.1, w);
assert.ok(!calls.some(([name, id]) => name === 'move' && id === 'you'));
assert.equal(me.vx, 9);

// Enemy bot: steer = profile distance (104), boost on (sin peak), speed with boost.
calls = [];
const enemy = bot();
w = world([me, enemy], calls);
stepBots({ team: 'blue' }, 1492, 0.1, w);
assert.deepEqual(calls[0], ['navigate', 'bot', 104]);
const expectedBoostSpeed =
  stats.speed * 1 * 1 * 1 * stats.boostMultiplier;
assert.deepEqual(calls.find(([n]) => n === 'move'), ['move', 'bot', expectedBoostSpeed]);
assert.ok(enemy.boost < 50, 'boost drained');
assert.equal(enemy.boostReadyAt, 1492 + 20000);

// Trough (sin low): no boost drain, base speed multiplier 1.
calls = [];
const ally = bot({ team: 'blue' });
w = world([me, ally], calls);
stepBots({ team: 'blue' }, 4465, 0.1, w);
assert.deepEqual(calls[0], ['navigate', 'bot', 78], 'friendly steer = 78');
assert.equal(ally.boost, 50);
assert.deepEqual(calls.find(([n]) => n === 'move'), ['move', 'bot', stats.speed]);

// Prisoner and kanal swimmers stop without deciding or moving.
for (const over of [{ state: 'PRISONER' }, { waterEnteredAt: 5 }]) {
  calls = [];
  const frozen = bot(over);
  w = world([me, frozen], calls, over.waterEnteredAt ? { isKanal: true } : {});
  stepBots({ team: 'blue' }, 1492, 0.1, w);
  assert.equal(frozen.vx, 0);
  assert.equal(frozen.vy, 0);
  assert.deepEqual(calls, []);
}
console.log('PASS stepBots: human skip, steer split, boost on/off math, stop states.');
