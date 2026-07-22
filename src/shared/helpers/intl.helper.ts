import type { Locale } from '@/shared/types';

export type PluralCategory = Intl.LDMLPluralRule;

export type PluralForms<Value> = Readonly<
  Partial<Record<PluralCategory, Value>> & { other: Value }
>;

export const formatNumber = (
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string => new Intl.NumberFormat(locale, options).format(value);

export const formatList = (
  values: readonly string[],
  locale: Locale,
  options?: Intl.ListFormatOptions,
): string => new Intl.ListFormat(locale, options).format(values);

export const pluralCategory = (
  value: number,
  locale: Locale,
  options?: Intl.PluralRulesOptions,
): PluralCategory => new Intl.PluralRules(locale, options).select(value);

export const selectPlural = <Value>(
  value: number,
  locale: Locale,
  forms: PluralForms<Value>,
  options?: Intl.PluralRulesOptions,
): Value => forms[pluralCategory(value, locale, options)] ?? forms.other;
