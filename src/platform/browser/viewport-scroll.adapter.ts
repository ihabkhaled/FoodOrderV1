export const getViewportScrollTop = (): number =>
  document.scrollingElement?.scrollTop ?? window.scrollY;
