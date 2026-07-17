import { ConfirmDialogView } from './confirm-dialog.component';
import { useConfirmDialog } from './use-confirm-dialog.hook';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useConfirmDialog(open);
  return (
    <ConfirmDialogView
      dialogRef={dialogRef}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      danger={danger}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
