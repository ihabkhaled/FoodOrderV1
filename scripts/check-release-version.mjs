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

const rootPackage = await readJson('../package.json');
const functionsPackage = await readJson('../functions/package.json');
const androidVersion = await readAndroidVersion();
const failures = [];

if (!parseStableVersion(rootPackage.version)) {
  failures.push(
    `Root package version must be a stable semantic version: ${rootPackage.version}`,
  );
}
if (functionsPackage.version !== rootPackage.version) {
  failures.push(
    `Version mismatch: package.json=${rootPackage.version}, functions/package.json=${functionsPackage.version}`,
  );
}
if (androidVersion !== rootPackage.version) {
  failures.push(
    `Version mismatch: package.json=${rootPackage.version}, Android versionName=${androidVersion}`,
  );
}

const baseVersion = process.env.BASE_VERSION;
if (baseVersion) {
  const comparison = compareVersions(rootPackage.version, baseVersion);
  if (comparison === null) {
    failures.push(`Unable to compare PR versions ${rootPackage.version} and ${baseVersion}.`);
  } else if (comparison <= 0) {
    failures.push(
      `A pull request must increase the source version: base=${baseVersion}, head=${rootPackage.version}`,
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
  `Release version integrity verified: ${rootPackage.version}${baseVersion ? ` > ${baseVersion}` : ''}`,
);
