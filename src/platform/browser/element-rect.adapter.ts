export interface ElementRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** Viewport-relative box of a rendered element, or null when it is absent. */
export const measureElementRect = (
  element: Element | null,
): ElementRect | null => {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

/**
 * Re-measure trigger: anything that can move an element under the spotlight.
 * Scroll is captured so nested scroll containers are covered too.
 */
export const subscribeToViewportChanges = (
  listener: () => void,
): (() => void) => {
  window.addEventListener('resize', listener, { passive: true });
  window.addEventListener('scroll', listener, { passive: true, capture: true });
  return () => {
    window.removeEventListener('resize', listener);
    window.removeEventListener('scroll', listener, { capture: true });
  };
};

/** True when the visitor asked for reduced motion. */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
