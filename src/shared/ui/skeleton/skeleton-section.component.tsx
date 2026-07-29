import { Skeleton } from './skeleton.component';
import type { SkeletonSectionProps } from './skeleton.types';

/**
 * One loading region. Screens compose several of these so each section can
 * resolve on its own instead of blanking the whole page.
 */
export function SkeletonSection({
  label,
  variant,
  count = 1,
}: SkeletonSectionProps) {
  return (
    <div role="status" aria-label={label} aria-live="polite" aria-busy="true">
      <Skeleton variant={variant} count={count} />
    </div>
  );
}
