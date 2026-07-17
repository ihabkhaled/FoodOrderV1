import type { ToastState } from '@/modules/session';

interface ToastViewportProps {
  toast: ToastState | null;
}

/** Bottom-anchored toast rendered while a session toast is active. */
export function ToastViewport({ toast }: ToastViewportProps) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.kind}`} role="status">
      {toast.message}
    </div>
  );
}
