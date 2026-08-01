#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { readJsonFile } from './versioning-core.mjs';

export const BRIEF_START = '<!-- release-brief:start -->';
export const BRIEF_END = '<!-- release-brief:end -->';

/**
 * Pulls the "## Highlights" bullets out of a release-notes file.
 *
 * The notes are the single source of truth for what a release contains, so the
 * pull request repeats them rather than inviting a second, drifting summary.
 */
export const extractHighlights = (notes) => {
  const lines = notes.split('\n');
  const start = lines.findIndex((line) => /^##\s+Highlights\s*$/u.test(line));
  if (start === -1) return [];

  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/u.test(line)) break;
    collected.push(line);
  }
  return collected.join('\n').trim().split('\n').filter(Boolean);
};

const briefSection = ({ version, highlights, artifact }) => {
  const bullets = highlights.length > 0
    ? highlights.join('\n')
    : '- See the release notes for the full change list.';
  const artifactLine = artifact
    ? `**Build:** [\`${artifact.version}\`](${artifact.url}) — debug APK attached to the prerelease.`
    : '**Build:** the branch prerelease publishes the APK once every gate passes.';

  return [
    BRIEF_START,
    '',
    `## v${version}`,
    '',
    artifactLine,
    '',
    '### Highlights',
    '',
    bullets,
    '',
    `Full notes: [\`release-notes/v${version}.md\`](release-notes/v${version}.md)`,
    '',
    BRIEF_END,
  ].join('\n');
};

/**
 * Rewrites only the managed block, so anything the author typed around it
 * survives every later push. A pull request body is the author's, not ours.
 */
export const buildPullRequestBody = ({
  version,
  notes,
  existingBody = '',
  artifact = null,
}) => {
  const section = briefSection({
    version,
    highlights: extractHighlights(notes),
    artifact,
  });
  const body = existingBody ?? '';
  const start = body.indexOf(BRIEF_START);
  const end = body.indexOf(BRIEF_END);

  if (start !== -1 && end !== -1 && end > start) {
    return `${body.slice(0, start)}${section}${body.slice(end + BRIEF_END.length)}`;
  }

  const authored = body.trim();
  return authored.length > 0 ? `${authored}\n\n${section}\n` : `${section}\n`;
};

const argumentValue = (name) => {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
};

const isDirectRun = process.argv[1]?.endsWith('pull-request-brief.mjs');

if (isDirectRun) {
  const root = process.cwd();
  const version =
    argumentValue('version') ?? readJsonFile(join(root, 'package.json')).version;
  const notesPath = join(root, 'release-notes', `v${version}.md`);
  if (!existsSync(notesPath)) {
    process.stderr.write(
      `Missing release notes: release-notes/v${version}.md\n` +
        'Every pull request ships its release notes; run npm run release:start first.\n',
    );
    process.exitCode = 1;
  } else {
    const bodyPath = argumentValue('body-file');
    const outputPath = argumentValue('out');
    const artifactUrl = argumentValue('artifact-url');
    const artifactVersion = argumentValue('artifact-version');

    const merged = buildPullRequestBody({
      version,
      notes: readFileSync(notesPath, 'utf8'),
      existingBody:
        bodyPath && existsSync(bodyPath) ? readFileSync(bodyPath, 'utf8') : '',
      artifact:
        artifactUrl && artifactVersion
          ? { url: artifactUrl, version: artifactVersion }
          : null,
    });

    if (outputPath) writeFileSync(outputPath, merged);
    else process.stdout.write(merged);
  }
}
