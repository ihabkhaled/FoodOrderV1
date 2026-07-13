#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const shouldWrite = process.argv.includes('--write');

const excludedPaths = [
  '.git',
  '.husky/_',
  '.ai/local',
  'node_modules',
  'dist',
  'coverage',
  'android',
  'ios',
  'playwright-report',
  'test-results',
  'ui-shots',
];

const supportedExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

const supportedNames = new Set([
  '.editorconfig',
  '.env.example',
  '.gitignore',
]);

const toRelativePath = (absolutePath) =>
  path.relative(root, absolutePath).split(path.sep).join('/');

const isExcluded = (absolutePath) => {
  const relativePath = toRelativePath(absolutePath);

  return excludedPaths.some(
    (excludedPath) =>
      relativePath === excludedPath ||
      relativePath.startsWith(`${excludedPath}/`),
  );
};

const isSupportedFile = (fileName) =>
  supportedExtensions.has(path.extname(fileName)) ||
  supportedNames.has(fileName);

const normalizeText = (value) =>
  `${value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n*$/, '')}\n`;

const walk = async (directory) => {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);

    if (isExcluded(absolutePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
      continue;
    }

    if (isSupportedFile(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files.sort();
};

const failures = [];

for (const file of await walk(root)) {
  const original = await readFile(file, 'utf8');
  const normalized = normalizeText(original);

  if (original === normalized) {
    continue;
  }

  if (shouldWrite) {
    await writeFile(file, normalized);
  } else {
    failures.push(toRelativePath(file));
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Formatting check passed.');
