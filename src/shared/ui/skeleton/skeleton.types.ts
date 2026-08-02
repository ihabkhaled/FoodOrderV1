export type SkeletonVariant = 'text' | 'card' | 'row' | 'stat' | 'circle';

export interface SkeletonProps {
  readonly variant: SkeletonVariant;
  /** How many placeholder blocks to draw. Defaults to one. */
  readonly count?: number;
}

export interface SkeletonSectionProps extends SkeletonProps {
  /** Announced to assistive technology while the section is still loading. */
  readonly label: string;
}
