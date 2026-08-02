import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

const parseStableVersion = (version) => {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const compareVersions = (leftVersion, rightVersion) => {
  const left = parseStableVersion(leftVersion);
  const right = parseStableVersion(rightVersion);
  if (!left || !right) return null;

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
};

const readAndroidVersion = async () => {
  const gradle = await readFile(
    new URL('../android/app/build.gradle', import.meta.url),
    'utf8',
  );
  return /versionName\s+"([^"]+)"/u.exec(gradle)?.[1] ?? null;
};

const readIosVersion = async () => {
  const project = await readFile(
    new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url),
    'utf8',
  );
  return /MARKETING_VERSION = ([^;]+);/u.exec(project)?.[1] ?? null;
};

const rootPackage = await readJson('../package.json');
const rootLock = await readJson('../package-lock.json');
const functionsPackage = await readJson('../functions/package.json');
const functionsLock = await readJson('../functions/package-lock.json');
const androidVersion = await readAndroidVersion();
const iosVersion = await readIosVersion();
const failures = [];

if (!parseStableVersion(rootPackage.version)) {
  failures.push(
    `Root package version must be a stable semantic version: ${rootPackage.version}`,
  );
}

for (const [label, version] of [
  ['functions/package.json', functionsPackage.version],
  ['package-lock.json', rootLock.version],
  ['package-lock.json root package', rootLock.packages?.['']?.version],
  ['functions/package-lock.json', functionsLock.version],
  ['functions/package-lock.json root package', functionsLock.packages?.['']?.version],
  ['Android versionName', androidVersion],
  ['iOS MARKETING_VERSION', iosVersion],
]) {
  if (version !== rootPackage.version) {
    failures.push(
      `Version mismatch: package.json=${rootPackage.version}, ${label}=${String(version)}`,
    );
  }
}

const baseVersion = process.env.BASE_VERSION?.trim();
if (
  process.env.GITHUB_EVENT_NAME === 'pull_request' &&
  baseVersion &&
  parseStableVersion(baseVersion)
) {
  // Feature releases bump the version; hotfixes ship as another build of the
  // version already on main. A same-version pull request is therefore allowed
  // from a fix branch — the tag-derived build number still increases, so every
  // merge stays uniquely identifiable — while a release branch must move the
  // version forward. Nothing may ever move it backward.
  const headBranch = process.env.GITHUB_HEAD_REF?.trim() ?? '';
  const isHotfixBranch = /^(?:fix|hotfix)\//u.test(headBranch);
  const comparison = compareVersions(rootPackage.version, baseVersion);
  if (comparison === null) {
    failures.push(
      `Unable to compare PR versions ${rootPackage.version} and ${baseVersion}.`,
    );
  } else if (comparison < 0) {
    failures.push(
      `Pull requests must never lower the stable source version: base=${baseVersion}, head=${rootPackage.version}.`,
    );
  } else if (comparison === 0 && !isHotfixBranch) {
    failures.push(
      `Pull requests must increase the stable source version above main: base=${baseVersion}, head=${rootPackage.version}. ` +
        `To ship a hotfix as a new build of ${baseVersion} instead, use a fix/* or hotfix/* branch.`,
    );
  } else if (comparison === 0) {
    console.log(
      `Hotfix branch ${headBranch} keeps version ${baseVersion}; it ships as a new build number.`,
    );
  }
}

const notesUrl = new URL(
  `../release-notes/v${rootPackage.version}.md`,
  import.meta.url,
);
if (!existsSync(notesUrl)) {
  failures.push(`Missing release notes: release-notes/v${rootPackage.version}.md`);
}

const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
if (!changelog.includes(`## [${rootPackage.version}]`)) {
  failures.push(`CHANGELOG.md has no ${rootPackage.version} release entry.`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(
  `Release version integrity verified: ${rootPackage.version}${baseVersion && baseVersion !== rootPackage.version ? ` > ${baseVersion}` : ''}`,
);
