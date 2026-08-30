import { LoaderCircle } from '@/packages/icons';

interface LoadingProps {
  label: string;
}

/**
 * A plain rotating loader, used when nothing about the eventual layout is
 * known yet — boot, a route transition, a gate.
 *
 * It deliberately shows no skeleton bars. A skeleton is a promise about the
 * shape of what is coming, so it belongs only where that shape is known:
 * lists, cards, and tiles use `SkeletonSection` instead. Bars here promised a
 * layout that never arrived.
 */
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
      <strong className="loading-copy">{label}</strong>
    </div>
  );
}
