/** Local downloads are explicit user actions; no garden data is uploaded. */
export function downloadJson(filename: string, data: string): void {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const gardenSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'garden';

export const backupDate = (): string => new Date().toISOString().slice(0, 10);
