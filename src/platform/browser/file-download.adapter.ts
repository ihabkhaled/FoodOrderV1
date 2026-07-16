/** Client-side file download used by the privacy data export. */
export const downloadTextFile = (
  fileName: string,
  content: string,
  mimeType = 'application/json',
): void => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};
