import { type RefObject, useEffect, useRef } from 'react';

/**
 * Owns the imperative `<dialog>` lifecycle: opening moves focus into the
 * modal via `showModal()`, closing returns it to the trigger via `close()`.
 */
export const useConfirmDialog = (open: boolean): RefObject<HTMLDialogElement | null> => {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return dialog;
};
