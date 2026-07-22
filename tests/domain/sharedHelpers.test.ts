import { describe, expect, it } from 'vitest';

import {
  createId,
  formatDateTime,
  formatList,
  formatMoney,
  formatNumber,
  isEmail,
  nowIso,
  pluralCategory,
  roundMoney,
  selectPlural,
  validatePassword,
} from '@/shared/helpers';

describe('validation.helper', () => {
  it('accepts well-formed addresses and trims surrounding whitespace', () => {
    expect(isEmail('user@example.com')).toBe(true);
    expect(isEmail('  user@example.com  ')).toBe(true);
    expect(isEmail('first.last@sub.example.co')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isEmail('')).toBe(false);
    expect(isEmail('plainaddress')).toBe(false);
    expect(isEmail('user@nodot')).toBe(false);
    expect(isEmail('user@.com')).toBe(false);
    expect(isEmail('user @example.com')).toBe(false);
  });

  it('requires eight characters, a letter, and a digit', () => {
    expect(validatePassword('a1b2c3')).toBe('passwordTooShort');
    expect(validatePassword('12345678')).toBe('passwordTooShort');
    expect(validatePassword('abcdefgh')).toBe('passwordTooShort');
    expect(validatePassword('abcdefg1')).toBeNull();
    expect(validatePassword('PASSWORD1')).toBeNull();
  });
});

describe('date.helper', () => {
  it('produces a parseable ISO timestamp', () => {
    const value = nowIso();
    expect(new Date(value).toISOString()).toBe(value);
  });

  it('formats timestamps for the default and Arabic locales', () => {
    const value = '2026-07-16T12:30:00.000Z';
    expect(formatDateTime(value)).toContain('2026');
    expect(formatDateTime(value, 'ar')).toBeTruthy();
    expect(formatDateTime(value, 'ar')).not.toBe(formatDateTime(value));
  });
});

describe('id.helper', () => {
  it('prefixes generated identifiers and keeps them unique', () => {
    const first = createId('bucket');
    const second = createId('bucket');
    expect(first).toMatch(/^bucket_[0-9a-f-]{36}$/);
    expect(first).not.toBe(second);
  });

  it('falls back to the generic prefix', () => {
    expect(createId()).toMatch(/^id_[0-9a-f-]{36}$/);
  });
});

describe('money.helper', () => {
  it('rounds to two decimals with epsilon correction', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(10)).toBe(10);
  });

  it('formats currency for the default and explicit locales', () => {
    expect(formatMoney(12.5, 'USD')).toContain('12.50');
    expect(formatMoney(12.5, 'EGP', 'ar')).toBeTruthy();
  });
});

describe('intl.helper', () => {
  it('formats numbers and lists with locale-aware Intl APIs', () => {
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
    expect(formatNumber(0.42, 'de', { style: 'percent' })).toContain('42');
    expect(formatList(['apples', 'rice'], 'en')).toBe('apples and rice');
    expect(formatList(['A', 'B', 'C'], 'en', { type: 'disjunction' })).toContain('or');
  });

  it('selects cardinal and ordinal plural categories with an other fallback', () => {
    expect(pluralCategory(1, 'en')).toBe('one');
    expect(pluralCategory(2, 'en', { type: 'ordinal' })).toBe('two');
    expect(selectPlural(1, 'en', { one: 'item', other: 'items' })).toBe('item');
    expect(selectPlural(2, 'en', { one: 'item', other: 'items' })).toBe('items');
  });

  it('falls back to the other form when a plural category has no entry', () => {
    // Arabic resolves 2 to the "two" category, which this form set omits.
    expect(pluralCategory(2, 'ar')).toBe('two');
    expect(selectPlural(2, 'ar', { one: 'عنصر', other: 'عناصر' })).toBe('عناصر');
    expect(selectPlural(1, 'en', { other: 'items' })).toBe('items');
  });
});
