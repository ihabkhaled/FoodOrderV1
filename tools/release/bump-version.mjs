#!/usr/bin/env node
/**
 * Single-owner version bump tool for FoodOrderV1.
 *
 * Bumps the semantic version in ONE place-of-record (package.json) and keeps
 * every derived version in sync:
 *   - package.json           "version"
 *   - android/app/build.gradle  versionName (= semver) + versionCode (auto +1)
 *   - CHANGELOG.md           prepends a dated section
 *   - release-notes/vX.Y.Z.md  scaffolds notes from a template (if absent)
 *
 * It does NOT commit, tag, or push — the release skill (skills/versioning)
 * owns that flow so humans/CI stay in control of git history.
 *
 * Usage:
 *   node tools/release/bump-version.mjs <patch|minor|major> ["summary line"]
 *   node tools/release/bump-version.mjs 1.2.3 ["summary line"]   (explicit)
 *   npm run release:patch -- "fix: ..."   (thin wrappers)
 *
 * Bump level is chosen by PROMPT DENSITY (see rules/versioning.md):
 *   patch = localized fix/copy/style   minor = new feature/flow   major = breaking/architecture
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (...p) => join(root, ...p);

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const parse = (v) => {
  const m = SEMVER.exec(v);
  if (!m) throw new Error(`Not a semver: ${v}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
};
const bump = (v, level) => {
  const s = parse(v);
  if (level === 'major') return `${s.major + 1}.0.0`;
  if (level === 'minor') return `${s.major}.${s.minor + 1}.0`;
  if (level === 'patch') return `${s.major}.${s.minor}.${s.patch + 1}`;
  if (SEMVER.test(level)) return level; // explicit version
  throw new Error(`Bump level must be patch|minor|major or an explicit X.Y.Z, got: ${level}`);
};

const [, , levelArg, ...summaryParts] = process.argv;
if (!levelArg) {
  console.error('Usage: node tools/release/bump-version.mjs <patch|minor|major|X.Y.Z> ["summary"]');
  process.exit(1);
}
const summary = summaryParts.join(' ').trim();

// package.json — the single place-of-record
const pkgPath = rel('package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const current = pkg.version;
const next = bump(current, levelArg);
if (parse(next) && next === current) throw new Error('Next version equals current version.');
pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// functions/package.json — MUST match root (quality:release enforces equality)
const functionsPkgPath = rel('functions', 'package.json');
if (existsSync(functionsPkgPath)) {
  const functionsPkg = JSON.parse(readFileSync(functionsPkgPath, 'utf8'));
  functionsPkg.version = next;
  writeFileSync(functionsPkgPath, `${JSON.stringify(functionsPkg, null, 2)}\n`);
}

// Android gradle — versionName mirrors semver; versionCode is a monotonic integer
const gradlePath = rel('android', 'app', 'build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
const codeMatch = /versionCode\s+(\d+)/.exec(gradle);
const nextCode = codeMatch ? Number(codeMatch[1]) + 1 : 1;
gradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${nextCode}`)
  .replace(/versionName\s+"[^"]*"/, `versionName "${next}"`);
writeFileSync(gradlePath, gradle);

// CHANGELOG.md — prepend a dated entry (date passed in to stay deterministic)
const today = process.env.BUMP_DATE ?? new Date().toISOString().slice(0, 10);
const changelogPath = rel('CHANGELOG.md');
const header = `## [${next}] - ${today}`;
const entry = `${header}\n\n- ${summary || 'Release ' + next}\n\n`;
if (existsSync(changelogPath)) {
  const existing = readFileSync(changelogPath, 'utf8');
  const marker = '<!-- releases -->';
  writeFileSync(
    changelogPath,
    existing.includes(marker) ? existing.replace(marker, `${marker}\n\n${entry.trim()}`) : `${existing}\n${entry}`,
  );
} else {
  writeFileSync(
    changelogPath,
    `# Changelog\n\nAll notable changes follow [Keep a Changelog](https://keepachangelog.com) and Semantic Versioning.\n\n<!-- releases -->\n\n${entry}`,
  );
}

// release-notes/vX.Y.Z.md — scaffold if not already authored
const notesDir = rel('release-notes');
mkdirSync(notesDir, { recursive: true });
const notesPath = join(notesDir, `v${next}.md`);
if (!existsSync(notesPath)) {
  writeFileSync(
    notesPath,
    `# FoodOrderV1 v${next}\n\n${summary || 'Describe this release.'}\n\n## Highlights\n\n- \n\n## Android APK\n\n- File: FoodOrderV1-v${next}-debug.apk\n- versionCode ${nextCode} / versionName ${next}\n- SHA-256: (filled at release)\n\n## Known limitations\n\n- \n`,
  );
}

console.log(JSON.stringify({ from: current, to: next, androidVersionCode: nextCode, notes: `release-notes/v${next}.md` }, null, 2));
