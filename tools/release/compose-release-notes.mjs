#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { readJsonFile } from './versioning-core.mjs';

/**
 * Builds the body of a GitHub release from the version's release notes.
 *
 * Prereleases used to carry one generated sentence ("Automated prerelease from
 * branch X. Every mandatory branch gate passed for commit Y."), which told a
 * reader nothing about what the build contains. The notes are already written
 * and already gated by `quality:release`, so every release publishes them and
 * appends only the facts that belong to the build itself.
 */
export const composeReleaseNotes = ({
  version,
  notes,
  buildVersion,
  commit,
  branch = '',
  prerelease = false,
}) => {
  const trimmed = notes.trim();
  if (trimmed.length === 0) {
    throw new Error(`Release notes for v${version} are empty.`);
  }

  const provenance = [
    '',
    '---',
    '',
    '## This build',
    '',
    `- Version: \`${buildVersion}\``,
    `- Commit: \`${commit}\``,
  ];
  if (branch) provenance.push(`- Branch: \`${branch}\``);
  provenance.push(
    prerelease
      ? '- Every mandatory branch gate passed before this prerelease was published.'
      : '- Every mandatory gate passed on `main` before this release was published.',
    '',
    `Source notes: \`release-notes/v${version}.md\`.`,
    '',
  );

  return `${trimmed}\n${provenance.join('\n')}`;
};

const argumentValue = (name) => {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
};

const isDirectRun = process.argv[1]?.endsWith('compose-release-notes.mjs');

if (isDirectRun) {
  const root = process.cwd();
  const version =
    argumentValue('version') ?? readJsonFile(join(root, 'package.json')).version;
  const notesPath = join(root, 'release-notes', `v${version}.md`);

  if (!existsSync(notesPath)) {
    process.stderr.write(
      `Missing release notes: release-notes/v${version}.md\n` +
        'Every release publishes its notes; see rules/20-release-gates.md.\n',
    );
    process.exitCode = 1;
  } else {
    const body = composeReleaseNotes({
      version,
      notes: readFileSync(notesPath, 'utf8'),
      buildVersion: argumentValue('build-version') ?? version,
      commit: argumentValue('commit') ?? '',
      branch: argumentValue('branch') ?? '',
      prerelease: process.argv.includes('--prerelease'),
    });

    const outputPath = argumentValue('out');
    if (outputPath) writeFileSync(outputPath, body);
    else process.stdout.write(body);
  }
}
