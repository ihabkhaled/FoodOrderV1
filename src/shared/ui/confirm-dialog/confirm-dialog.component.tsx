import type { RefObject } from 'react';

import { LoaderCircle } from '@/packages/icons';

interface ConfirmDialogViewProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialogView({
  dialogRef,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogViewProps) {
  return (
    <dialog ref={dialogRef} onCancel={onCancel} className="dialog">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="dialog-actions">
        <button
          className="button secondary"
          disabled={busy}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          className={`button ${danger ? 'danger' : ''}`}
          disabled={busy}
          aria-busy={busy}
          onClick={onConfirm}
        >
          {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
