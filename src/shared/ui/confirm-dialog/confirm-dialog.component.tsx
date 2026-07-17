import type { RefObject } from 'react';

interface ConfirmDialogViewProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
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
  onConfirm,
  onCancel,
}: ConfirmDialogViewProps) {
  return (
    <dialog ref={dialogRef} onCancel={onCancel} className="dialog">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="dialog-actions">
        <button className="button secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className={`button ${danger ? 'danger' : ''}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
