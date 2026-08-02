#!/usr/bin/env node
import { join } from 'node:path';
import process from 'node:process';

import { readJsonFile, resolveNextBuildNumber } from './versioning-core.mjs';

/**
 * Prints the next build number for the current version on the given channel.
 *
 * Existing tags arrive on stdin, one per line, so this stays a pure function of
 * its input and the caller decides where the list comes from (`gh release list`
 * in CI, `git tag` locally). Reading them here would tie the tool to a network
 * call that cannot be tested.
 *
 *   gh release list --limit 300 --json tagName --jq '.[].tagName' \
 *     | node tools/release/next-build-number.mjs --channel=dev
 */
const argumentValue = (name) => {
  const prefix = `--${name}=`;
  const found = process.argv.find((argument) => argument.startsWith(prefix));
  return found?.slice(prefix.length);
};

const readStdin = async () => {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const channel = argumentValue('channel') ?? 'dev';
const baseVersion =
  argumentValue('base') ??
  readJsonFile(join(process.cwd(), 'package.json')).version;

const tags = (await readStdin())
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

try {
  process.stdout.write(
    `${resolveNextBuildNumber({ baseVersion, channel, tags })}\n`,
  );
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
}
