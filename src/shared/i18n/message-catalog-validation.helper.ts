export type MessageCatalogValidationIssueCode =
  | 'blank-value'
  | 'interpolation-mismatch'
  | 'missing-key'
  | 'non-string-value'
  | 'untranslated-catalog'
  | 'unknown-key';

export interface MessageCatalogValidationIssue {
  readonly code: MessageCatalogValidationIssueCode;
  readonly key: string;
  readonly locale: string;
  readonly message: string;
}

type MessageCatalog = Readonly<Record<string, unknown>>;
type MessageCatalogs = Readonly<Record<string, MessageCatalog>>;

interface KeyValidationResult {
  readonly identicalToReference: boolean;
  readonly issues: readonly MessageCatalogValidationIssue[];
}

const MINIMUM_UNTRANSLATED_CHECK_KEYS = 5;
const UNTRANSLATED_VALUE_RATIO = 0.8;

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const interpolationTokens = (message: string): readonly string[] =>
  [...message.matchAll(/\{([^{}]+)\}/g)]
    .map((match) => match[1] ?? '')
    .toSorted(compareText);

const sameTokens = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((token, index) => token === right[index]);

const formatTokens = (tokens: readonly string[]): string => JSON.stringify(tokens);

const validateValue = (
  locale: string,
  key: string,
  value: unknown,
): MessageCatalogValidationIssue | undefined => {
  if (typeof value !== 'string') {
    return {
      code: 'non-string-value',
      key,
      locale,
      message: `[${locale}] key "${key}" must be a string.`,
    };
  }

  if (value.trim().length === 0) {
    return {
      code: 'blank-value',
      key,
      locale,
      message: `[${locale}] key "${key}" must not be blank.`,
    };
  }

  return undefined;
};

const missingKeyIssue = (
  locale: string,
  key: string,
): MessageCatalogValidationIssue => ({
  code: 'missing-key',
  key,
  locale,
  message: `[${locale}] missing key "${key}".`,
});

const interpolationIssue = (
  locale: string,
  key: string,
  expectedTokens: readonly string[],
  actualTokens: readonly string[],
): MessageCatalogValidationIssue => ({
  code: 'interpolation-mismatch',
  key,
  locale,
  message:
    `[${locale}] key "${key}" interpolation tokens differ: ` +
    `expected ${formatTokens(expectedTokens)}, received ${formatTokens(actualTokens)}.`,
});

const validateKnownKey = (
  referenceLocale: string,
  referenceCatalog: MessageCatalog,
  locale: string,
  catalog: MessageCatalog,
  key: string,
): KeyValidationResult => {
  if (!Object.hasOwn(catalog, key)) {
    return { identicalToReference: false, issues: [missingKeyIssue(locale, key)] };
  }

  const value = catalog[key];
  const valueIssue = validateValue(locale, key, value);
  if (valueIssue) return { identicalToReference: false, issues: [valueIssue] };

  const referenceValue = referenceCatalog[key];
  if (
    locale === referenceLocale ||
    typeof referenceValue !== 'string' ||
    referenceValue.trim().length === 0 ||
    typeof value !== 'string'
  ) {
    return { identicalToReference: false, issues: [] };
  }

  const expectedTokens = interpolationTokens(referenceValue);
  const actualTokens = interpolationTokens(value);
  const issues = sameTokens(expectedTokens, actualTokens)
    ? []
    : [interpolationIssue(locale, key, expectedTokens, actualTokens)];

  return { identicalToReference: value === referenceValue, issues };
};

const unknownKeyIssues = (
  locale: string,
  localeKeys: readonly string[],
  referenceKeySet: ReadonlySet<string>,
): readonly MessageCatalogValidationIssue[] =>
  localeKeys
    .filter((key) => !referenceKeySet.has(key))
    .map((key) => ({
      code: 'unknown-key',
      key,
      locale,
      message: `[${locale}] unknown key "${key}".`,
    }));

const untranslatedCatalogIssue = (
  referenceLocale: string,
  locale: string,
  referenceKeyCount: number,
  identicalValueCount: number,
): MessageCatalogValidationIssue | undefined => {
  if (locale === referenceLocale || referenceKeyCount < MINIMUM_UNTRANSLATED_CHECK_KEYS) {
    return undefined;
  }

  const identicalValueRatio = identicalValueCount / referenceKeyCount;
  if (identicalValueRatio < UNTRANSLATED_VALUE_RATIO) return undefined;

  const percentage = Math.round(identicalValueRatio * 100);
  return {
    code: 'untranslated-catalog',
    key: '*',
    locale,
    message:
      `[${locale}] catalog appears untranslated: ${identicalValueCount} of ` +
      `${referenceKeyCount} values (${percentage}%) match ${referenceLocale}.`,
  };
};

const validateLocale = (
  referenceLocale: string,
  referenceCatalog: MessageCatalog,
  referenceKeys: readonly string[],
  referenceKeySet: ReadonlySet<string>,
  locale: string,
  catalog: MessageCatalog,
): readonly MessageCatalogValidationIssue[] => {
  const keyResults = referenceKeys.map((key) =>
    validateKnownKey(referenceLocale, referenceCatalog, locale, catalog, key),
  );
  const identicalValueCount = keyResults.filter(
    ({ identicalToReference }) => identicalToReference,
  ).length;
  const localeKeys = Object.keys(catalog).toSorted(compareText);
  const issues = [
    ...keyResults.flatMap(({ issues: keyIssues }) => keyIssues),
    ...unknownKeyIssues(locale, localeKeys, referenceKeySet),
  ];
  const untranslatedIssue = untranslatedCatalogIssue(
    referenceLocale,
    locale,
    referenceKeys.length,
    identicalValueCount,
  );

  return untranslatedIssue ? [...issues, untranslatedIssue] : issues;
};

const issueOrder = (
  left: MessageCatalogValidationIssue,
  right: MessageCatalogValidationIssue,
): number =>
  compareText(left.locale, right.locale) ||
  compareText(left.key, right.key) ||
  compareText(left.code, right.code);

export const validateMessageCatalogs = (
  catalogs: MessageCatalogs,
  referenceLocale = 'en',
): readonly MessageCatalogValidationIssue[] => {
  const referenceCatalog = catalogs[referenceLocale];
  if (!referenceCatalog) {
    throw new Error(`Reference locale "${referenceLocale}" is missing.`);
  }

  const referenceKeys = Object.keys(referenceCatalog).toSorted(compareText);
  const referenceKeySet = new Set(referenceKeys);
  return Object.keys(catalogs)
    .toSorted(compareText)
    .flatMap((locale) => {
      const catalog = catalogs[locale];
      return catalog
        ? validateLocale(
            referenceLocale,
            referenceCatalog,
            referenceKeys,
            referenceKeySet,
            locale,
            catalog,
          )
        : [];
    })
    .toSorted(issueOrder);
};

export const assertMessageCatalogsValid = (
  catalogs: MessageCatalogs,
  referenceLocale = 'en',
): void => {
  const issues = validateMessageCatalogs(catalogs, referenceLocale);
  if (issues.length === 0) return;

  const issueDetails = issues.map(({ message }) => `- ${message}`).join('\n');
  throw new Error(`Message catalog validation failed:\n${issueDetails}`);
};
