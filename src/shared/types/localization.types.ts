/**
 * Localization primitives shared across every layer above packages. The
 * domain model (modules/data-access) and the platform device configuration
 * both build on these unions, so they live in shared to keep the dependency
 * direction one-way.
 */
export type Locale = 'en' | 'ar';
export type Theme = 'system' | 'light' | 'dark';
export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED';
