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
