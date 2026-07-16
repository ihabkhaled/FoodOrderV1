export const getViewportScrollTop = (): number =>
  document.scrollingElement?.scrollTop ?? window.scrollY;

export const scrollViewportToTop = (): void => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
};
