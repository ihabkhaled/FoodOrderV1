import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import {
  classifyTask,
  discoverDomains,
  rulesForTask,
  testsForDomains,
  validationForRisk,
} from '../../scripts/knowledge/routing.mjs';
import { extractObligations, summarizeSource } from '../../scripts/knowledge/compile-context.mjs';

const tracked = execFileSync('git', ['ls-files'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const domains = discoverDomains(tracked);

test('every discovered domain points at paths that exist', () => {
  // The regression this guards: the previous hand-written table still listed
  // src/pages, src/components, src/state, src/services and src/lib after the
  // v1.6.0 migration deleted them, so most tasks fell back to a generic scope.
  for (const domain of domains) {
    assert.ok(domain.paths.length > 0, `${domain.id} has no paths`);
    for (const candidate of domain.paths) {
      assert.ok(
        tracked.some((file) => file === candidate || file.startsWith(`${candidate}/`)),
        `${domain.id} points at missing path ${candidate}`,
      );
    }
  }
});

test('every feature module is routable', () => {
  const modules = [
    ...new Set(tracked.filter((f) => f.startsWith('src/modules/')).map((f) => f.split('/')[2])),
  ];
  const routed = new Set(domains.map((domain) => domain.id));
  for (const module of modules) {
    assert.ok(routed.has(module), `module ${module} is not routable`);
  }
});

test('representative tasks resolve to their owning domain', () => {
  const expectations = [
    ['add password reset', 'auth'],
    ['fix bucket sharing bug', 'group-orders'],
    ['add a new locale to the public site', 'public-content'],
    ['change firestore ownership rules', 'firestore-rules'],
    ['fix a notification trigger quota', 'notifications'],
  ];
  for (const [task, expected] of expectations) {
    const result = classifyTask(task, domains);
    const ids = result.domains.map((domain) => domain.id);
    assert.ok(ids.includes(expected), `"${task}" resolved to ${ids.join(',') || 'nothing'}`);
    assert.ok(result.confidence >= 0.6, `"${task}" confidence ${result.confidence}`);
  }
});

test('a security-touching task escalates to the critical lane', () => {
  // A feature module can outscore firestore-rules; the lane must still be the
  // riskiest domain touched, not the highest-scoring one.
  const result = classifyTask('change firestore ownership rules', domains);
  assert.equal(result.risk, 'critical');
  assert.ok(validationForRisk(result.risk).includes('npm run test:rules'));
});

test('an unmatched task reports itself instead of guessing', () => {
  const result = classifyTask('zzzz nonsense qqqq', domains);
  assert.equal(result.unmatched, true);
  assert.equal(result.domains.length, 0);
});

test('non-negotiable rules are always included', () => {
  const rules = rulesForTask('rename a variable', []);
  assert.ok(rules.includes('00-non-negotiable-rules'));
  assert.ok(rules.includes('01-architecture-and-dependency-direction'));
});

test('tests resolve for a known domain', () => {
  const matched = classifyTask('fix bucket sharing bug', domains).domains;
  assert.ok(testsForDomains(matched, tracked).length > 0);
});

test('summarizeSource lists exported symbols only', () => {
  const symbols = summarizeSource(
    'const hidden = 1;\nexport const shown = 2;\nexport function alsoShown() {}\n',
  );
  assert.deepEqual(symbols, ['shown', 'alsoShown']);
});

test('extractObligations keeps imperatives and drops prose', () => {
  const obligations = extractObligations(
    '# Rule\n\nSome explanatory prose.\n\n- Components must stay hook-free.\n- This is background colour.\n- Never bypass the gate.\n',
  );
  assert.deepEqual(obligations, ['Components must stay hook-free.', 'Never bypass the gate.']);
});
