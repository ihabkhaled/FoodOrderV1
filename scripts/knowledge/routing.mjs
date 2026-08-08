/**
 * Task routing for the knowledge context compiler.
 *
 * Domains are DERIVED from the repository, never listed by hand. The previous
 * hand-maintained table still pointed at src/pages, src/components, src/state,
 * src/services and src/lib — directories the v1.6.0 module migration deleted —
 * so seven of its twelve paths matched nothing and almost every task fell back
 * to a generic src/app listing. Deriving the map means a new module is routable
 * the moment it exists, and a deleted one cannot linger.
 */

/** Synonyms a person uses that do not appear in the directory name. */
const DOMAIN_ALIASES = {
  social: ['friend', 'friends', 'request', 'invite', 'invitation', 'group'],
  'group-orders': ['share', 'sharing', 'bucket share', 'member', 'members', 'round'],
  buckets: ['bucket', 'item', 'items', 'template', 'price', 'pricing', 'vat'],
  orders: ['order', 'receipt', 'total', 'checkout'],
  'order-sessions': ['session', 'round', 'organizer'],
  auth: ['login', 'sign in', 'sign up', 'signin', 'signup', 'password', 'account', 'register'],
  notifications: ['notification', 'push', 'tray', 'fcm', 'badge'],
  settings: ['setting', 'preference', 'privacy', 'theme', 'dark mode', 'consent'],
  'public-content': ['landing', 'marketing', 'seo', 'locale', 'language', 'translation', 'og', 'open graph', 'preview card', 'sitemap'],
  billing: ['payment', 'subscription', 'invoice'],
  telemetry: ['analytics', 'diagnostics', 'tracking', 'insight'],
  dashboard: ['home', 'overview'],
  'data-access': ['repository', 'firestore', 'query', 'persistence'],
  session: ['session'],
  'session-invites': ['invite', 'join code'],
};

/** Cross-cutting areas that are not feature modules. */
const STATIC_DOMAINS = [
  {
    id: 'firestore-rules',
    risk: 'critical',
    keys: ['firestore rule', 'security rule', 'permission', 'ownership', 'access control'],
    paths: ['firestore.rules', 'storage.rules'],
    rules: ['13-security'],
  },
  {
    id: 'release-tooling',
    risk: 'standard',
    keys: ['release', 'version', 'bump', 'changelog', 'apk', 'build number', 'tag', 'prerelease'],
    paths: ['tools/release', 'scripts/check-release-version.mjs'],
    rules: ['20-release-gates', 'versioning'],
  },
  {
    id: 'ci-workflows',
    risk: 'standard',
    keys: ['ci', 'workflow', 'github action', 'gate', 'pipeline', 'deploy'],
    paths: ['.github/workflows'],
    rules: ['20-release-gates'],
  },
  {
    id: 'firebase-functions',
    risk: 'critical',
    keys: ['cloud function', 'callable', 'trigger', 'firebase function', 'quota'],
    paths: ['functions/src'],
    rules: ['06-services-and-gateways', '13-security'],
  },
  {
    id: 'platform',
    risk: 'standard',
    keys: ['capacitor', 'android', 'ios', 'native', 'device', 'storage adapter', 'browser'],
    paths: ['src/platform'],
    rules: ['09-capacitor-platform-boundaries'],
  },
  {
    id: 'shared-ui',
    risk: 'standard',
    keys: ['shared component', 'design system', 'button', 'layout', 'accessibility'],
    paths: ['src/shared'],
    rules: ['03-components', '14-accessibility'],
  },
  {
    id: 'packages',
    risk: 'standard',
    keys: ['package facade', 'library wrapper', 'dependency', 'upgrade'],
    paths: ['src/packages'],
    rules: ['08-package-ownership'],
  },
  {
    id: 'app-shell',
    risk: 'standard',
    keys: ['route', 'routing', 'navigation', 'shell', 'sidebar', 'provider'],
    paths: ['src/app'],
    rules: ['10-routing'],
  },
  {
    id: 'public-prerender',
    risk: 'standard',
    keys: ['prerender', 'public site', 'static site', 'meta tag', 'robots', 'feed'],
    paths: ['scripts/public-content'],
    rules: ['15-internationalization'],
  },
];

/** Rules that always apply, regardless of task. */
export const ALWAYS_RULES = ['00-non-negotiable-rules', '01-architecture-and-dependency-direction'];

const RULES_BY_KEYWORD = [
  { keys: ['test', 'spec', 'coverage', 'e2e'], rules: ['16-testing-and-coverage'] },
  { keys: ['locale', 'language', 'translation', 'i18n', 'rtl'], rules: ['15-internationalization'] },
  { keys: ['accessib', 'aria', 'screen reader', 'contrast'], rules: ['14-accessibility'] },
  { keys: ['hook', 'effect', 'state'], rules: ['05-hooks-and-effects', '11-state-management'] },
  { keys: ['component', 'ui', 'screen', 'page'], rules: ['03-components', '04-containers'] },
  { keys: ['type', 'interface', 'enum', 'constant'], rules: ['07-types-interfaces-enums-constants'] },
  { keys: ['error', 'exception', 'failure'], rules: ['12-error-handling'] },
  { keys: ['security', 'auth', 'permission', 'privacy', 'secret'], rules: ['13-security'] },
];

const SKILLS_BY_KEYWORD = [
  { keys: ['new module', 'feature module'], skill: 'create-feature-module' },
  { keys: ['route', 'routing', 'navigation'], skill: 'add-route' },
  { keys: ['component'], skill: 'create-component' },
  { keys: ['container'], skill: 'create-container' },
  { keys: ['hook'], skill: 'create-hook' },
  { keys: ['service', 'gateway'], skill: 'create-service-or-gateway' },
  { keys: ['locale', 'language', 'translation', 'i18n'], skill: 'add-i18n-key' },
  { keys: ['capacitor', 'plugin', 'native'], skill: 'add-capacitor-plugin' },
  { keys: ['e2e', 'playwright', 'browser test'], skill: 'write-e2e-tests' },
  { keys: ['unit test', 'vitest'], skill: 'write-unit-tests' },
  { keys: ['release note'], skill: 'write-release-notes' },
  { keys: ['version branch', 'start branch'], skill: 'start-version-branch' },
  { keys: ['eslint', 'typecheck', 'lint error'], skill: 'fix-eslint-typecheck' },
];

/** High-risk words escalate the validation lane no matter which domain matched. */
const CRITICAL_SIGNALS = ['security', 'permission', 'firestore rule', 'auth', 'privacy', 'delete account', 'token', 'secret'];

/**
 * Builds the domain table from the files that actually exist.
 */
export const discoverDomains = (files) => {
  const moduleNames = [
    ...new Set(
      files
        .filter((f) => f.startsWith('src/modules/'))
        .map((f) => f.split('/')[2])
        .filter(Boolean),
    ),
  ].sort();

  const moduleDomains = moduleNames.map((name) => ({
    id: name,
    risk: 'standard',
    keys: [name, name.replaceAll('-', ' '), ...(DOMAIN_ALIASES[name] ?? [])],
    paths: [`src/modules/${name}`],
    rules: ['02-feature-modules'],
  }));

  return [
    ...moduleDomains,
    // Keep only paths that exist, then only domains that kept one. A domain
    // listing an optional file (storage.rules) must not advertise a path that
    // resolves to nothing.
    ...STATIC_DOMAINS.map((domain) => ({
      ...domain,
      paths: domain.paths.filter((p) => files.some((f) => f === p || f.startsWith(`${p}/`))),
    })).filter((domain) => domain.paths.length > 0),
  ];
};

const scoreDomain = (query, domain) =>
  domain.keys.reduce((total, key) => (query.includes(key) ? total + key.length : total), 0);

/**
 * Picks the domains a task touches. Returns every domain that scored, best
 * first, so a cross-cutting task keeps both sides instead of silently losing
 * one to a single-winner tie-break.
 */
export const classifyTask = (task, domains) => {
  const query = String(task).toLowerCase();
  const scored = domains
    .map((domain) => ({ ...domain, score: scoreDomain(query, domain) }))
    .filter((domain) => domain.score > 0)
    .sort((left, right) => right.score - left.score);

  const critical = CRITICAL_SIGNALS.some((signal) => query.includes(signal));
  const matched = scored.slice(0, 3);

  if (matched.length === 0) {
    return {
      domains: [],
      risk: critical ? 'critical' : 'fast',
      confidence: 0,
      unmatched: true,
    };
  }

  const top = matched[0].score;
  // The riskiest domain the task touches sets the lane. Taking the highest
  // scorer's risk let a Firestore-rules change ride in on a standard lane
  // whenever a feature module happened to match more strongly.
  const anyCritical = matched.some((domain) => domain.risk === 'critical');
  return {
    domains: matched,
    risk: critical || anyCritical ? 'critical' : matched[0].risk,
    // Confidence tracks how decisively the top domain won, not a fixed constant.
    confidence: Number(Math.min(0.95, 0.5 + top / 40).toFixed(2)),
    unmatched: false,
  };
};

export const rulesForTask = (task, matchedDomains) => {
  const query = String(task).toLowerCase();
  const fromKeywords = RULES_BY_KEYWORD.filter((entry) =>
    entry.keys.some((key) => query.includes(key)),
  ).flatMap((entry) => entry.rules);
  const fromDomains = matchedDomains.flatMap((domain) => domain.rules ?? []);
  return [...new Set([...ALWAYS_RULES, ...fromDomains, ...fromKeywords])];
};

export const skillsForTask = (task) => {
  const query = String(task).toLowerCase();
  return [
    ...new Set(
      SKILLS_BY_KEYWORD.filter((entry) => entry.keys.some((key) => query.includes(key))).map(
        (entry) => entry.skill,
      ),
    ),
  ];
};

/**
 * Tests that exercise a domain: same-named specs plus the module's own tests.
 */
export const testsForDomains = (matchedDomains, files) => {
  const tests = files.filter((f) => f.startsWith('tests/') && /\.(test|spec)\.[tj]sx?$/u.test(f));
  const wanted = new Set();
  for (const domain of matchedDomains) {
    const needles = [domain.id, domain.id.replaceAll('-', '')];
    for (const test of tests) {
      const lower = test.toLowerCase();
      if (needles.some((needle) => lower.includes(needle))) wanted.add(test);
    }
  }
  return [...wanted].sort();
};

/** Validation scaled to risk — a fast lane must not demand the full suite. */
export const validationForRisk = (risk) => {
  if (risk === 'critical') {
    return [
      'npm run lint',
      'npm run typecheck',
      'npm run test:ai',
      'npm run test:rules',
      'npm run build',
    ];
  }
  if (risk === 'standard') {
    return ['npm run lint:ai', 'npm run typecheck:ai', 'npm run test:ai'];
  }
  return ['npm run lint:ai', 'npm run typecheck:ai'];
};
