import assert from 'node:assert/strict';
import { interactiveTarget, handlePointerOut } from '../modules/ui/event-target.ts';

// Minimal DOM stub: instanceof target + closest routing.
globalThis.Element = class {};
const button = new globalThis.Element();
button.closest = (selector) => (selector === 'button,[role="button"]' ? button : null);
const span = new globalThis.Element();
span.closest = () => null;

assert.equal(interactiveTarget(button), button);
assert.equal(interactiveTarget(span), null);
assert.equal(interactiveTarget(null), null);
assert.equal(interactiveTarget('text'), null);

// Hover clears only when the pointer truly left the hovered target.
let hoverCleared = 0;
handlePointerOut(button, button, () => hoverCleared++);
handlePointerOut(span, button, () => hoverCleared++);
handlePointerOut(null, button, () => hoverCleared++);
assert.equal(hoverCleared, 1);
console.log('PASS eventTarget: closest match/miss/guards, hover-leave clear.');
