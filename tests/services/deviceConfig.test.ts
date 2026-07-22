import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  getPreference: vi.fn<(key: string) => Promise<string | null>>(),
  setPreference: vi.fn<(key: string, value: string) => Promise<void>>(),
}));

const browserMocks = vi.hoisted(() => ({
  getBrowserLanguages: vi.fn<() => readonly string[]>(),
}));

vi.mock('@/platform/storage/preferences.adapter', () => storageMocks);
vi.mock('@/platform/browser/browser-language.adapter', () => browserMocks);

import {
  loadDeviceConfig,
  saveDeviceConfig,
} from '@/platform/device/device-config.adapter';

describe('device locale preference', () => {
  beforeEach(() => {
    storageMocks.getPreference.mockReset();
    storageMocks.setPreference.mockReset();
    browserMocks.getBrowserLanguages.mockReset();
    storageMocks.getPreference.mockResolvedValue(null);
    storageMocks.setPreference.mockResolvedValue();
    browserMocks.getBrowserLanguages.mockReturnValue(['fr-CA', 'en-US']);
  });

  it('detects the browser locale when no explicit preference exists', async () => {
    await expect(loadDeviceConfig()).resolves.toMatchObject({ locale: 'fr' });
  });

  it('prefers stored locale, currency, and theme values', async () => {
    storageMocks.getPreference.mockImplementation((key) => {
      const values: Readonly<Record<string, string>> = {
        locale: 'de',
        currency: 'EUR',
        theme: 'dark',
      };
      return Promise.resolve(values[key] ?? null);
    });

    await expect(loadDeviceConfig()).resolves.toEqual({
      locale: 'de',
      currency: 'EUR',
      theme: 'dark',
    });
  });

  it('persists explicit locale changes through the preference adapter', async () => {
    await saveDeviceConfig({ locale: 'it', theme: 'light' });

    expect(storageMocks.setPreference).toHaveBeenCalledTimes(2);
    expect(storageMocks.setPreference).toHaveBeenCalledWith('locale', 'it');
    expect(storageMocks.setPreference).toHaveBeenCalledWith('theme', 'light');
  });
});
