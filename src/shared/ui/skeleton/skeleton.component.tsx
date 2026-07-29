import type { SkeletonProps } from './skeleton.types';

/**
 * Decorative placeholder blocks. Always `aria-hidden`: the surrounding
 * `SkeletonSection` owns the single spoken "loading" announcement.
 */
export function Skeleton({ variant, count = 1 }: SkeletonProps) {
  return (
    <div className={`skeleton skeleton-${variant}`} aria-hidden="true">
      {Array.from({ length: count }, (_unused, index) => (
        <span className="skeleton-block" key={index} />
      ))}
    </div>
  );
}
