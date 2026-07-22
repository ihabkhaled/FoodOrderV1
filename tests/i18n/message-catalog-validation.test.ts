import { describe, expect, it } from 'vitest';

import { groupOrderMessages } from '@/modules/group-orders/i18n/group-order-messages.constants';
import { ORDER_SESSION_MESSAGES } from '@/modules/order-sessions/i18n/order-session-messages.constants';
import { SESSION_INVITE_MESSAGES } from '@/modules/session-invites/i18n/session-invite-messages.constants';
import { SETTINGS_MESSAGES } from '@/modules/settings/i18n/settings-messages.constants';
import { socialMessages } from '@/modules/social/i18n/social-messages.constants';
import { SUPPORTED_LOCALES } from '@/shared/i18n';
import {
  assertMessageCatalogsValid,
  validateMessageCatalogs,
} from '@/shared/i18n/message-catalog-validation.helper';
import { messages } from '@/shared/i18n/messages.constants';

const APP_CATALOGS = [
  { name: 'core', catalogs: messages },
  { name: 'group orders', catalogs: groupOrderMessages },
  { name: 'social', catalogs: socialMessages },
  { name: 'settings', catalogs: SETTINGS_MESSAGES },
  { name: 'order sessions', catalogs: ORDER_SESSION_MESSAGES },
  { name: 'session invites', catalogs: SESSION_INVITE_MESSAGES },
] as const;

const compareLocale = (left: string, right: string): number =>
  left.localeCompare(right, 'en');

describe.each(APP_CATALOGS)('$name catalog', ({ catalogs }) => {
  it('contains every supported locale with exact key and interpolation parity', () => {
    expect(Object.keys(catalogs).toSorted(compareLocale)).toEqual(
      [...SUPPORTED_LOCALES].toSorted(compareLocale),
    );
    expect(validateMessageCatalogs(catalogs)).toEqual([]);
    expect(() => {
      assertMessageCatalogsValid(catalogs);
    }).not.toThrow();
  });
});

describe('message catalog validation failures', () => {
  it('reports missing and unknown keys in deterministic order', () => {
    expect(
      validateMessageCatalogs({
        en: { alpha: 'Alpha', beta: 'Beta' },
        ar: { alpha: 'Translated alpha', extra: 'Extra' },
      }),
    ).toEqual([
      {
        code: 'missing-key',
        key: 'beta',
        locale: 'ar',
        message: '[ar] missing key \u0022beta\u0022.',
      },
      {
        code: 'unknown-key',
        key: 'extra',
        locale: 'ar',
        message: '[ar] unknown key \u0022extra\u0022.',
      },
    ]);
  });

  it('rejects blank and non-string values', () => {
    expect(
      validateMessageCatalogs({
        en: { alpha: 'Alpha', beta: 'Beta' },
        ar: { alpha: ' '.repeat(3), beta: 7 },
      }),
    ).toEqual([
      {
        code: 'blank-value',
        key: 'alpha',
        locale: 'ar',
        message: '[ar] key \u0022alpha\u0022 must not be blank.',
      },
      {
        code: 'non-string-value',
        key: 'beta',
        locale: 'ar',
        message: '[ar] key \u0022beta\u0022 must be a string.',
      },
    ]);
  });

  it('compares interpolation token multisets while allowing reordered tokens', () => {
    expect(
      validateMessageCatalogs({
        en: {
          duplicate: '{count} of {count} for {name}',
          reordered: '{first} then {second}',
        },
        ar: {
          duplicate: '{count} for {name}',
          reordered: '{second} then {first}',
        },
      }),
    ).toEqual([
      {
        code: 'interpolation-mismatch',
        key: 'duplicate',
        locale: 'ar',
        message:
          '[ar] key \u0022duplicate\u0022 interpolation tokens differ: expected [\u0022count\u0022,\u0022count\u0022,\u0022name\u0022], received [\u0022count\u0022,\u0022name\u0022].',
      },
    ]);
  });

  it('rejects a catalog that is overwhelmingly identical to English', () => {
    expect(
      validateMessageCatalogs({
        en: { alpha: 'A', beta: 'B', delta: 'D', epsilon: 'E', gamma: 'G' },
        it: { alpha: 'A', beta: 'B', delta: 'D', epsilon: 'Tradotto', gamma: 'G' },
      }),
    ).toEqual([
      {
        code: 'untranslated-catalog',
        key: '*',
        locale: 'it',
        message: '[it] catalog appears untranslated: 4 of 5 values (80%) match en.',
      },
    ]);
  });

  it('throws one deterministic error containing every validation issue', () => {
    expect(() => {
      assertMessageCatalogsValid({
        en: { alpha: 'Alpha', beta: '{count} beta' },
        ar: { alpha: '', beta: 'Beta' },
      });
    }).toThrow(
      'Message catalog validation failed:\n' +
        '- [ar] key \u0022alpha\u0022 must not be blank.\n' +
        '- [ar] key \u0022beta\u0022 interpolation tokens differ: expected [\u0022count\u0022], received [].',
    );
  });

  it('rejects a missing reference locale', () => {
    expect(() => validateMessageCatalogs({ ar: { alpha: 'Alpha' } })).toThrow(
      'Reference locale \u0022en\u0022 is missing.',
    );
  });
});
