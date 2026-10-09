import assert from 'node:assert/strict';
import {
  handleContextMenu,
  handleStopForMenu,
  handleStopWhenHidden,
} from '../modules/gameplay/input-navigation.ts';

globalThis.Element = class {};

// contextmenu is suppressed only while playing.
let prevented = 0;
handleContextMenu({ preventDefault: () => prevented++ }, 'playing');
handleContextMenu({ preventDefault: () => prevented++ }, 'menu');
assert.equal(prevented, 1);

// Menu interaction clears the mouse route; canvas clicks do not.
const button = new globalThis.Element();
button.closest = (selector) => (selector === 'button,input,select,[role="button"]' ? button : null);
const canvas = new globalThis.Element();
canvas.closest = () => null;
let cleared = 0;
const clearer = () => cleared++;
handleStopForMenu({ target: button }, clearer);
handleStopForMenu({ target: canvas }, clearer);
handleStopForMenu({ target: null }, clearer);
assert.equal(cleared, 1);

// Hidden tabs clear the mouse route; visible tabs do nothing.
handleStopWhenHidden(true, clearer);
handleStopWhenHidden(false, clearer);
assert.equal(cleared, 2);
console.log('PASS inputGuards: contextmenu gate, menu-interaction clear, hidden-tab clear.');
