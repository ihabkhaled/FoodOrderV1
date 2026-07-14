import { readFile } from 'node:fs/promises';

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

const rootPackage = await readJson('../package.json');
const functionsPackage = await readJson('../functions/package.json');
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

const failures = [];
if (!semver.test(rootPackage.version)) {
  failures.push(`Root package version is not a stable semantic version: ${rootPackage.version}`);
}
if (functionsPackage.version !== rootPackage.version) {
  failures.push(
    `Version mismatch: package.json=${rootPackage.version}, functions/package.json=${functionsPackage.version}`,
  );
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(`Release version integrity verified: ${rootPackage.version}`);
