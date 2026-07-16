// Deep type-only import: the data-access helpers build on this file, so
// importing the module's public surface here would create an import cycle.
import type { CurrencyCode } from '@/modules/data-access/types/domain.types';

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const formatMoney = (
  value: number,
  currency: CurrencyCode,
  locale = 'en',
): string => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
