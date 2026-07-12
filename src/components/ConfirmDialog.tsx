import { useEffect, useRef } from 'react';

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string; cancelLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <dialog ref={dialog} onCancel={onCancel} className="dialog"><h2>{title}</h2><p>{message}</p><div className="dialog-actions"><button className="button secondary" onClick={onCancel}>{cancelLabel}</button><button className={`button ${danger ? 'danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button></div></dialog>;
}
