import { readFile } from 'node:fs/promises';

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

const rootPackage = await readJson('../package.json');
const functionsPackage = await readJson('../functions/package.json');
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Compare two stable semver strings. Returns >0 if a>b, 0 if equal, <0 if a<b. */
const compareSemver = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
};

const failures = [];
if (!semver.test(rootPackage.version)) {
  failures.push(`Root package version is not a stable semantic version: ${rootPackage.version}`);
}
if (functionsPackage.version !== rootPackage.version) {
  failures.push(
    `Version mismatch: package.json=${rootPackage.version}, functions/package.json=${functionsPackage.version}`,
  );
}

// Pull-request gate: a branch/PR MUST bump the version above main before merge.
// New feature branches bump MINOR by default (see rules/versioning.md); patch/major
// per prompt density. BASE_VERSION is main's version, provided by CI on PR events.
// (On push to `main` no BASE_VERSION is set, so this check is skipped there — the
//  build number `X.Y.Z-<run>` is applied at APK/release time, not in package.json.)
const baseVersion = process.env.BASE_VERSION?.trim();
if (process.env.GITHUB_EVENT_NAME === 'pull_request' && baseVersion && semver.test(baseVersion)) {
  if (semver.test(rootPackage.version) && compareSemver(rootPackage.version, baseVersion) <= 0) {
    failures.push(
      `Pull requests must bump the version above main (${baseVersion}); current is ${rootPackage.version}. ` +
        `Run "npm run release:minor -- \\"summary\\"" on the branch (new feature branches bump MINOR by default; ` +
        `use release:patch/major per rules/versioning.md), then commit the bump.`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(`Release version integrity verified: ${rootPackage.version}`);
