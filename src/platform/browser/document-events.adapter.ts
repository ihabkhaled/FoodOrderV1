/** Notifies the listener of every document pointerdown; returns cleanup. */
export const subscribeToPointerDown = (
  listener: (target: EventTarget | null) => void,
): (() => void) => {
  const handlePointerDown = (event: PointerEvent): void => {
    listener(event.target);
  };
  document.addEventListener('pointerdown', handlePointerDown);
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
  };
};
