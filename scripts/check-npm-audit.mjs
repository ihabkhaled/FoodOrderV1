#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const ALLOWED_ADVISORIES = new Set();

const audit = spawnSync(
  process.execPath,
  [
    process.env.npm_execpath ?? '',
    'audit',
    '--omit=dev',
    '--audit-level=high',
    '--json',
  ],
  {
    encoding: 'utf8',
  },
);

if (!audit.stdout) {
  process.stderr.write(audit.stderr || 'npm audit returned no report.\n');
  process.exit(audit.status ?? 1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  process.stderr.write(audit.stdout);
  process.stderr.write(audit.stderr);
  process.exit(audit.status ?? 1);
}

const blocking = [];
const vulnerabilities = report.vulnerabilities ?? {};
const isAllowedVulnerability = (packageName, visited = new Set()) => {
  if (visited.has(packageName)) return false;
  visited.add(packageName);
  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return false;
  return vulnerability.via.every((item) => {
    if (typeof item === 'string') {
      return isAllowedVulnerability(item, visited);
    }
    const advisoryId = new URL(item.url).pathname.split('/').pop();
    return advisoryId !== undefined && ALLOWED_ADVISORIES.has(advisoryId);
  });
};

for (const [packageName, vulnerability] of Object.entries(
  vulnerabilities,
)) {
  if (!['high', 'critical'].includes(vulnerability.severity)) continue;
  const advisoryIds = vulnerability.via
    .filter((item) => typeof item === 'object')
    .map((item) => new URL(item.url).pathname.split('/').pop())
    .filter(Boolean);
  if (!isAllowedVulnerability(packageName)) {
    blocking.push({ packageName, advisoryIds, severity: vulnerability.severity });
  }
}

if (blocking.length > 0) {
  process.stderr.write(
    `Blocking npm audit findings:\n${JSON.stringify(blocking, null, 2)}\n`,
  );
  process.exit(1);
}

const allowed = [...ALLOWED_ADVISORIES].filter((id) =>
  Object.values(report.vulnerabilities ?? {}).some((vulnerability) =>
    vulnerability.via.some(
      (item) => typeof item === 'object' && item.url.endsWith(id),
    ),
  ),
);
process.stdout.write(
  allowed.length > 0
    ? `npm audit passed with documented advisory exceptions: ${allowed.join(', ')}.\n`
    : 'npm audit passed with no high or critical production findings.\n',
);
