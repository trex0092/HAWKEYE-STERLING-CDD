/** Trigger a client-side download of a Blob under the given filename. */
function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Trigger a client-side download of a JSON payload. */
export function downloadJson(filename: string, data: unknown): void {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
}

/** Trigger a client-side download of plain text (e.g. an AI-assisted draft). */
export function downloadText(filename: string, text: string): void {
  downloadBlob(filename, new Blob([text], { type: 'text/plain' }));
}
