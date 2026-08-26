import type { ReactNode } from 'react';

import { LoaderCircle } from '@/packages/icons';

export interface BusyButtonProps {
  /** Label shown when idle. */
  children: ReactNode;
  /** Label shown while the operation runs; falls back to the idle label. */
  busyLabel?: string;
  busy: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  icon?: ReactNode;
}

/**
 * A button for an operation that writes something.
 *
 * Anything that adds, saves, deletes, or shares has to be pressable exactly
 * once: a second press while the first request is in flight produces a
 * duplicate write, and on a slow connection an unchanged button looks broken
 * enough to invite that second press. This disables itself for the duration,
 * swaps in a spinner, and announces the state with `aria-busy` so a screen
 * reader is told what a sighted user can see.
 *
 * It does not own the busy flag. The calling view model already knows when its
 * request settles, and duplicating that here would let the two disagree.
 */
export function BusyButton({
  children,
  busyLabel,
  busy,
  onClick,
  disabled = false,
  type = 'button',
  className = 'button',
  icon,
}: BusyButtonProps) {
  return (
    <button
      type={type}
      className={className}
      disabled={busy || disabled}
      aria-busy={busy}
      {...(onClick ? { onClick } : {})}
    >
      {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : icon}
      {busy ? (busyLabel ?? children) : children}
    </button>
  );
}
