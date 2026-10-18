import { useEffect, useRef } from 'react';

/** Native top-layer dialogs make the background inert, including nested dialogs. */
export function useModalDialog(open: boolean, onDismiss?: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => { dismiss.current = onDismiss; });
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    const cancel = (event: Event) => {
      if(event.target!==dialog)return;
      event.preventDefault();
      dismiss.current?.();
    };
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || (event.target instanceof Element && event.target.closest('dialog') !== dialog)) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex]:not([tabindex="-1"])'))
        .filter(node => node.tabIndex >= 0 && node.getClientRects().length > 0 && node.closest('dialog') === dialog);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('keydown', trapTab);
    if (!dialog.open) dialog.showModal();
    (dialog.querySelector<HTMLElement>('[data-dialog-primary], [autofocus]') ??
      dialog.querySelector<HTMLElement>('button:not(:disabled), input, select'))?.focus({ preventScroll: true });
    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.removeEventListener('keydown', trapTab);
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
