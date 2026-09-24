import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyDiscoveryText } from './Codex';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Codex-Clipboard', () => {
  it('meldet Erfolg nur nach einem erfolgreichen writeText-Aufruf', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyDiscoveryText('lifeseed:beleg')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('lifeseed:beleg');
  });

  it('meldet keinen Erfolg, wenn die Clipboard-API ablehnt', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyDiscoveryText('lifeseed:beleg')).resolves.toBe(false);
    expect(writeText).toHaveBeenCalledWith('lifeseed:beleg');
  });
});
