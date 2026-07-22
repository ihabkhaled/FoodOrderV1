export interface BrowserBootstrapContext {
  root: HTMLElement | null;
  pathname: string;
  prerenderedPublicContent: boolean;
}

export const getBrowserBootstrapContext = (): BrowserBootstrapContext => {
  const root = document.querySelector<HTMLElement>('#root');
  return {
    root,
    pathname: location.pathname,
    prerenderedPublicContent: root?.dataset['publicPrerendered'] === 'true',
  };
};

export const replaceBrowserPath = (pathname: string): void => {
  history.replaceState(history.state, '', pathname);
};
