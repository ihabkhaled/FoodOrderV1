#!/usr/bin/env node
/**
 * AI-facing command wrappers and repository-intelligence doctor.
 *
 * Every wrapper answers one question: did this pass, and if not, what is the
 * smallest thing I need to read to fix it? A passing suite prints a single
 * line; the full log always stays on disk for the rare case it is needed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const logDirectory = path.join(os.tmpdir(), 'foodorder-ai-logs');

const runCapture = (commandLine) => {
  // A single shell string, not an argv array: Node refuses to spawn npm.cmd
  // without a shell, and passing args alongside `shell` triggers DEP0190. The
  // command lines here are literals defined below, never user input.
  const result = spawnSync(commandLine, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    code: result.status ?? 1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
};

const writeLog = (name, output) => {
  mkdirSync(logDirectory, { recursive: true });
  const file = path.join(logDirectory, `${name}.log`);
  writeFileSync(file, output, 'utf8');
  return file;
};

/** Lines that change what happens next: failures, errors, and their locations. */
const FAILURE_PATTERNS = [
  /^\s*(FAIL|✕|×|✗)\s/u,
  /\berror\b/iu,
  /\bfailed\b/iu,
  /^\s*Expected\b/u,
  /^\s*Received\b/u,
  /^\s*AssertionError/u,
  /\bat .*\.(ts|tsx|mjs|js):\d+/u,
  /^.*\.(ts|tsx|mjs|js)\(\d+,\d+\):/u,
];

const relevantLines = (output, limit = 40) => {
  const lines = output.split(/\r?\n/u);
  const kept = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (FAILURE_PATTERNS.some((pattern) => pattern.test(line))) {
      kept.push(line.length > 220 ? `${line.slice(0, 217)}...` : line.trimEnd());
    }
    if (kept.length >= limit) break;
  }
  return kept;
};

const summarizeCounts = (output) => {
  const tests = /Tests\s+(\d+)\s+passed(?:\s*\|\s*(\d+)\s+failed)?/u.exec(output);
  const files = /Test Files\s+(\d+)\s+passed/u.exec(output);
  if (tests) {
    return `${tests[1]} tests passed${tests[2] ? `, ${tests[2]} failed` : ''}${files ? ` (${files[1]} files)` : ''}`;
  }
  return null;
};

const wrap = (name, commandLine) => {
  const { code, output } = runCapture(commandLine);
  const logFile = writeLog(name, output);
  if (code === 0) {
    const summary = summarizeCounts(output);
    console.log(`PASS ${name}${summary ? ` — ${summary}` : ''}`);
    return 0;
  }
  const lines = relevantLines(output);
  console.log(`FAIL ${name}`);
  if (lines.length > 0) console.log(lines.join('\n'));
  else console.log(output.split(/\r?\n/u).slice(-25).join('\n'));
  console.log(`\nFull log: ${logFile}`);
  return code;
};

/**
 * Repository intelligence health.
 *
 * The check that matters most is domain-path drift: the routing table used to
 * be hand-written and silently pointed at directories the v1.6.0 migration had
 * deleted, which sent nearly every task to a generic fallback. Domains are
 * derived now, so this asserts the derivation still resolves.
 */
const doctor = async () => {
  const findings = [];
  const tracked = execFileSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const { discoverDomains } = await import('./knowledge/routing.mjs');
  const domains = discoverDomains(tracked);
  if (domains.length < 5) findings.push(`Only ${domains.length} domains discovered; routing will be vague.`);

  for (const domain of domains) {
    const missing = domain.paths.filter(
      (candidate) => !tracked.some((file) => file === candidate || file.startsWith(`${candidate}/`)),
    );
    if (missing.length > 0) findings.push(`Domain ${domain.id} points at missing paths: ${missing.join(', ')}`);
  }

  const modules = [...new Set(tracked.filter((f) => f.startsWith('src/modules/')).map((f) => f.split('/')[2]))];
  const routed = new Set(domains.map((d) => d.id));
  for (const module of modules) {
    if (!routed.has(module)) findings.push(`Module ${module} is not routable.`);
  }

  for (const required of ['.aiignore', 'rules/00-non-negotiable-rules.md', 'scripts/knowledge/routing.mjs']) {
    if (!existsSync(path.join(root, required))) findings.push(`Missing ${required}`);
  }

  let bootBytes = 0;
  for (const file of ['CLAUDE.md', '.ai/BOOTSTRAP.md']) {
    if (!existsSync(path.join(root, file))) continue;
    bootBytes += Buffer.byteLength(await readFile(path.join(root, file), 'utf8'));
  }
  if (bootBytes > 16000) {
    findings.push(`Always-loaded boot context is ${bootBytes} bytes (~${Math.round(bootBytes / 4)} tokens); target under 16000.`);
  }

  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  for (const script of ['test:ai', 'lint:ai', 'typecheck:ai', 'ai:context', 'ai:doctor']) {
    if (!packageJson.scripts?.[script]) findings.push(`Missing script ${script}`);
  }

  console.log(`Domains routable: ${domains.length} (${modules.length} feature modules)`);
  console.log(`Boot context: ${bootBytes} bytes (~${Math.round(bootBytes / 4)} tokens)`);
  if (findings.length === 0) {
    console.log('ai:doctor PASS — repository intelligence is consistent.');
    return 0;
  }
  console.log(`\nai:doctor found ${findings.length} issue(s):`);
  for (const finding of findings) console.log(`- ${finding}`);
  return 1;
};

const [command] = process.argv.slice(2);
const commands = {
  test: () => wrap('test', 'npm run test'),
  lint: () => wrap('lint', 'npm run lint'),
  typecheck: () => wrap('typecheck', 'npm run typecheck'),
  build: () => wrap('build', 'npm run build'),
  doctor,
};

if (!commands[command]) {
  console.error(`Usage: node scripts/ai.mjs <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}
process.exitCode = (await commands[command]()) ?? 0;
