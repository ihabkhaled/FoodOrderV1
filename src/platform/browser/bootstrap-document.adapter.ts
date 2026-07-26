export interface BrowserBootstrapContext {
  root: HTMLElement | null;
  pathname: string;
  requestedLocale: string | null;
  prerenderedPublicContent: boolean;
}

export const getBrowserBootstrapContext = (): BrowserBootstrapContext => {
  const root = document.querySelector<HTMLElement>('#root');
  return {
    root,
    pathname: location.pathname,
    requestedLocale: new URLSearchParams(location.search).get('lang'),
    prerenderedPublicContent: root?.dataset['publicPrerendered'] === 'true',
  };
};

export const replaceBrowserPath = (pathname: string): void => {
  history.replaceState(
    history.state,
    '',
    `${pathname}${location.search}${location.hash}`,
  );
};
