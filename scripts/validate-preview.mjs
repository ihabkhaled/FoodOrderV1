import { spawnSync } from 'node:child_process';

const validationSteps = [
  ['npm', ['run', 'knowledge:validate']],
  ['npm', ['run', 'format:check']],
  ['npm', ['--prefix', 'functions', 'ci']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'typecheck:tsc']],
  ['npm', ['run', 'functions:validate']],
  ['npm', ['run', 'test']],
  ['npm', ['run', 'test:coverage']],
  ['npm', ['run', 'quality:circular']],
  ['npm', ['run', 'quality:dead-code']],
  ['npm', ['run', 'quality:release']],
  ['npm', ['run', 'quality:agent-docs']],
  ['npm', ['run', 'security:audit']],
  ['npm', ['--prefix', 'functions', 'audit', '--audit-level=high']],
  ['npm', ['run', 'build']],
];

for (const [command, arguments_] of validationSteps) {
  const label = `${command} ${arguments_.join(' ')}`;
  process.stdout.write(`\n=== Preview gate: ${label} ===\n`);
  const result = spawnSync(command, arguments_, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: 'true' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(`Preview validation failed: ${label}\n`);
    process.exit(result.status ?? 1);
  }
}

process.stdout.write('\nAll non-emulator preview quality gates passed.\n');
