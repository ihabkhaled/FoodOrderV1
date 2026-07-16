/** In-tab application event bus built on window events. */
export const dispatchAppEvent = (name: string): void => {
  window.dispatchEvent(new Event(name));
};

export const subscribeToAppEvent = (name: string, listener: () => void): (() => void) => {
  window.addEventListener(name, listener);
  return () => {
    window.removeEventListener(name, listener);
  };
};
