import type { ToastState } from '@/modules/session';

interface ToastViewportProps {
  toast: ToastState | null;
}

/** Bottom-anchored toast rendered while a session toast is active. */
export function ToastViewport({ toast }: ToastViewportProps) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.kind}`} role="status">
      <span>{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          className="toast-action"
          onClick={toast.action.onClick}
        >
          {toast.action.label}
        </button>
      ) : null}
    </div>
  );
}
