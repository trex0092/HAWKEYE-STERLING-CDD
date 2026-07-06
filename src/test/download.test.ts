/**
 * Unit tests for the client-side download helpers (src/lib/download.ts).
 * The DOM/URL side effects are stubbed so we assert behaviour, not navigation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadJson, downloadText } from '@/lib/download';

describe('download helpers', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloadJson builds a pretty-printed application/json blob and downloads it', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    downloadJson('report.json', { entity: 'Acme', band: 'EDD' });

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await blob.text())).toEqual({ entity: 'Acme', band: 'EDD' });
    expect(await blob.text()).toContain('\n'); // pretty-printed

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('report.json');
    expect(anchor.href).toContain('blob:mock-url');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(document.body.contains(anchor)).toBe(false); // cleaned up
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('downloadText builds a text/plain blob with the given contents', async () => {
    downloadText('draft.txt', 'AI-assisted narrative');
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/plain');
    expect(await blob.text()).toBe('AI-assisted narrative');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
  });
});
