import { LoaderCircle } from '@/packages/icons';

interface LoadingProps {
  label: string;
}

export function Loading({ label }: LoadingProps) {
  return (
    <div
      className="loading"
      role="status"
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
    >
      <span className="loading-orbit" aria-hidden="true">
        <LoaderCircle className="spin" />
      </span>
      <span className="loading-copy">
        <strong>{label}</strong>
        <span>{label}</span>
      </span>
      <span className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}
