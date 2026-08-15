import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

export const STABLE_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

export const readJsonFile = (filePath) =>
  JSON.parse(readFileSync(filePath, 'utf8'));

export const writeJsonFile = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

export const parseStableVersion = (version) => {
  const match = STABLE_SEMVER_PATTERN.exec(version);
  if (!match) {
    throw new Error(`Expected a stable semantic version, received: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

export const compareStableVersions = (leftVersion, rightVersion) => {
  const left = parseStableVersion(leftVersion);
  const right = parseStableVersion(rightVersion);

  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }

  return 0;
};

/**
 * A release branch owns a major/minor patch line, not only its first patch.
 * `release/1.9.0` can therefore ship 1.9.1, 1.9.2, and later 1.9.x fixes on
 * the same branch, but it must never admit a lower patch or another line.
 */
export const isReleaseBranchVersionCompatible = (
  branchVersion,
  repositoryVersion,
) => {
  const branch = parseStableVersion(branchVersion);
  const repository = parseStableVersion(repositoryVersion);

  return (
    repository.major === branch.major &&
    repository.minor === branch.minor &&
    repository.patch >= branch.patch
  );
};

export const isSameVersionMaintenanceBranch = (branchName) =>
  /^(?:fix|hotfix|dependabot)\//u.test(String(branchName));

export const resolveNextVersion = (currentVersion, requestedVersion) => {
  const current = parseStableVersion(currentVersion);

  if (requestedVersion === 'major') return `${current.major + 1}.0.0`;
  if (requestedVersion === 'minor') return `${current.major}.${current.minor + 1}.0`;
  if (requestedVersion === 'patch') {
    return `${current.major}.${current.minor}.${current.patch + 1}`;
  }
  if (STABLE_SEMVER_PATTERN.test(requestedVersion)) return requestedVersion;

  throw new Error(
    `Version must be patch, minor, major, or an explicit X.Y.Z value. Received: ${requestedVersion}`,
  );
};

const synchronizePackageManifest = (filePath, nextVersion) => {
  const manifest = readJsonFile(filePath);
  manifest.version = nextVersion;
  writeJsonFile(filePath, manifest);
};

const synchronizePackageLock = (filePath, nextVersion) => {
  if (!existsSync(filePath)) return;

  const lock = readJsonFile(filePath);
  lock.version = nextVersion;
  if (lock.packages?.['']) lock.packages[''].version = nextVersion;
  writeJsonFile(filePath, lock);
};

const synchronizeAndroidVersion = (filePath, nextVersion) => {
  const current = readFileSync(filePath, 'utf8');
  const currentName = /versionName\s+"([^"]+)"/u.exec(current)?.[1];
  const codeMatch = /versionCode\s+(\d+)/u.exec(current);
  const currentCode = codeMatch ? Number(codeMatch[1]) : 0;
  const nextCode = currentName === nextVersion ? currentCode : currentCode + 1;
  const updated = current
    .replace(/versionCode\s+\d+/u, `versionCode ${nextCode}`)
    .replace(/versionName\s+"[^"]*"/u, `versionName "${nextVersion}"`);

  writeFileSync(filePath, updated);
  return nextCode;
};

const synchronizeIosVersion = (filePath, nextVersion) => {
  const current = readFileSync(filePath, 'utf8');
  const currentMarketingVersion =
    /MARKETING_VERSION = ([^;]+);/u.exec(current)?.[1] ?? null;
  const buildMatches = [
    ...current.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/gu),
  ];
  const currentBuild = Math.max(
    0,
    ...buildMatches.map((match) => Number(match[1])),
  );
  const nextBuild =
    currentMarketingVersion === nextVersion ? currentBuild : currentBuild + 1;
  const updated = current
    .replace(
      /MARKETING_VERSION = [^;]+;/gu,
      `MARKETING_VERSION = ${nextVersion};`,
    )
    .replace(
      /CURRENT_PROJECT_VERSION = \d+;/gu,
      `CURRENT_PROJECT_VERSION = ${nextBuild};`,
    );

  writeFileSync(filePath, updated);
  return nextBuild;
};

const ensureChangelogEntry = ({ filePath, nextVersion, summary, date }) => {
  const header = `## [${nextVersion}] - ${date}`;
  const entry = `${header}\n\n- ${summary || `Release ${nextVersion}`}\n`;
  const marker = '<!-- releases -->';
  const existing = existsSync(filePath)
    ? readFileSync(filePath, 'utf8')
    : '# Changelog\n\n<!-- releases -->\n';

  if (existing.includes(header)) return;

  const updated = existing.includes(marker)
    ? existing.replace(marker, `${marker}\n\n${entry}`)
    : `${existing.trimEnd()}\n\n${entry}`;
  writeFileSync(filePath, updated);
};

const ensureReleaseNotes = ({
  notesDirectory,
  nextVersion,
  androidVersionCode,
  summary,
}) => {
  mkdirSync(notesDirectory, { recursive: true });
  const notesPath = join(notesDirectory, `v${nextVersion}.md`);
  if (existsSync(notesPath)) return notesPath;

  writeFileSync(
    notesPath,
    `# FoodOrderV1 v${nextVersion}\n\n${summary || 'Describe this release.'}\n\n## Highlights\n\n- \n\n## Android APK\n\n- File: FoodOrderV1-v${nextVersion}-debug.apk\n- versionCode ${androidVersionCode} / versionName ${nextVersion}\n- SHA-256: (filled at release)\n\n## Known limitations\n\n- \n`,
  );
  return notesPath;
};

export const synchronizeRepositoryVersion = ({
  rootDirectory,
  nextVersion,
  summary,
  date = new Date().toISOString().slice(0, 10),
}) => {
  parseStableVersion(nextVersion);

  synchronizePackageManifest(join(rootDirectory, 'package.json'), nextVersion);
  synchronizePackageManifest(
    join(rootDirectory, 'functions', 'package.json'),
    nextVersion,
  );
  synchronizePackageLock(join(rootDirectory, 'package-lock.json'), nextVersion);
  synchronizePackageLock(
    join(rootDirectory, 'functions', 'package-lock.json'),
    nextVersion,
  );

  const androidVersionCode = synchronizeAndroidVersion(
    join(rootDirectory, 'android', 'app', 'build.gradle'),
    nextVersion,
  );
  const iosBuildNumber = synchronizeIosVersion(
    join(rootDirectory, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
    nextVersion,
  );

  ensureChangelogEntry({
    filePath: join(rootDirectory, 'CHANGELOG.md'),
    nextVersion,
    summary,
    date,
  });
  const notesPath = ensureReleaseNotes({
    notesDirectory: join(rootDirectory, 'release-notes'),
    nextVersion,
    androidVersionCode,
    summary,
  });

  return { androidVersionCode, iosBuildNumber, notesPath };
};

/**
 * Build numbers count builds *of one version*, not builds of the repository.
 *
 * They used to come straight from GITHUB_RUN_NUMBER, a repository-wide counter
 * that never resets, so `1.8.0-347` said nothing about how many times 1.8.0 had
 * been built. Deriving the number from the tags that already exist makes it
 * per-version and self-healing: a version nobody has released yet starts at 0,
 * and bumping the version resets the counter without anyone remembering to.
 *
 * `channel` is 'main' for release builds (`v1.8.0-3`) and 'dev' for branch
 * prereleases (`v1.8.0-dev.3-1a2b3c4`, the short SHA keeping tags unique when
 * two branches build the same version).
 */
export const buildNumberPattern = (baseVersion, channel) => {
  const escaped = baseVersion.replaceAll('.', String.raw`\.`);
  return channel === 'dev'
    ? new RegExp(String.raw`^v${escaped}-dev\.(\d+)(?:-[0-9a-f]{7,40})?$`, 'u')
    : new RegExp(String.raw`^v${escaped}-(\d+)$`, 'u');
};

export const resolveNextBuildNumber = ({ baseVersion, channel, tags }) => {
  parseStableVersion(baseVersion);
  if (channel !== 'main' && channel !== 'dev') {
    throw new Error(`Channel must be main or dev. Received: ${channel}`);
  }

  const pattern = buildNumberPattern(baseVersion, channel);
  let highest = -1;
  for (const tag of tags) {
    const match = pattern.exec(String(tag).trim());
    if (match) highest = Math.max(highest, Number(match[1]));
  }

  return highest + 1;
};
