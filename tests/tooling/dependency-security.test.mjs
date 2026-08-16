import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

const compare = (left, right) => {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

const resolvedVersions = (packageName) =>
  Object.entries(lock.packages)
    .filter(([path]) => path.endsWith(`node_modules/${packageName}`))
    .map(([path, metadata]) => ({ path, version: metadata.version }));

const assertEveryResolvedVersionIsSafe = (packageName, isSafe) => {
  const resolved = resolvedVersions(packageName);
  assert.ok(resolved.length > 0, `${packageName} must be present in package-lock.json`);
  const unsafe = resolved.filter(({ version }) => !isSafe(version));
  assert.deepEqual(unsafe, [], `${packageName} contains a vulnerable resolved version`);
};

test('security-sensitive transitive dependencies stay above patched floors', () => {
  assertEveryResolvedVersionIsSafe('js-yaml', (version) => {
    const major = Number(version.split('.')[0]);
    if (major === 3) return compare(version, '3.15.1') >= 0;
    if (major === 4) return compare(version, '4.3.1') >= 0;
    if (major === 5) return compare(version, '5.2.1') >= 0;
    return major > 5;
  });

  assertEveryResolvedVersionIsSafe(
    'postcss',
    (version) => compare(version, '8.5.23') >= 0,
  );
  assertEveryResolvedVersionIsSafe(
    'hono',
    (version) => compare(version, '4.12.34') >= 0,
  );
  assertEveryResolvedVersionIsSafe('uuid', (version) => {
    const major = Number(version.split('.')[0]);
    if (major < 11) return false;
    if (major === 11) return compare(version, '11.1.1') >= 0;
    if (major === 12) return compare(version, '12.0.1') >= 0;
    if (major === 13) return compare(version, '13.0.1') >= 0;
    return major >= 14;
  });
  assertEveryResolvedVersionIsSafe('brace-expansion', (version) => {
    const major = Number(version.split('.')[0]);
    if (major === 1) return compare(version, '1.1.18') >= 0;
    if (major === 2) return compare(version, '2.1.4') >= 0;
    if (major === 3) return compare(version, '3.0.6') >= 0;
    if (major === 4) return false;
    if (major === 5) return compare(version, '5.0.9') >= 0;
    return major > 5;
  });
  assertEveryResolvedVersionIsSafe('nanoid', (version) => {
    const major = Number(version.split('.')[0]);
    if (major < 3) return false;
    if (major === 3) return compare(version, '3.3.18') >= 0;
    if (major === 4) return false;
    if (major === 5) return compare(version, '5.1.6') >= 0;
    return major > 5;
  });
  assertEveryResolvedVersionIsSafe('tar', (version) => {
    const major = Number(version.split('.')[0]);
    if (major === 7) return compare(version, '7.5.21') >= 0;
    return major > 7;
  });
});
