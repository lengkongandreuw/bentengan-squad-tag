// Nearest interactive (button-like) ancestor of an event target, or null.
// Pure DOM query used by the UI-tone hover/click guards.
export const interactiveTarget = (target: EventTarget | null) =>
  target instanceof Element
    ? (target.closest('button,[role="button"]') as HTMLElement | null)
    : null;

// Hover-leave guard: clears the hovered target only when the pointer truly
// left it (not when moving between its children).
export const handlePointerOut = (
  target: EventTarget | null,
  lastHoverTarget: EventTarget | null,
  onClearHover: () => void,
): void => {
  if (interactiveTarget(target) === lastHoverTarget) onClearHover();
};
