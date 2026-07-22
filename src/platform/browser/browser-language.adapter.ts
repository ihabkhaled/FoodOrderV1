export const getBrowserLanguages = (): readonly string[] => {
  if (navigator.languages.length > 0) return [...navigator.languages];
  return navigator.language ? [navigator.language] : [];
};
