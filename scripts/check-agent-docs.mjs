#!/usr/bin/env node
/**
 * Governance-doc integrity gate.
 *
 * Fails (exit 1) unless every agent entry point exists, carries the
 * `Governance-Version: 1` marker, AGENTS.md links to the architecture doc and
 * the non-negotiable rules, and CLAUDE.md points back to AGENTS.md.
 *
 * ESM, zero dependencies. Wired into package.json by the release orchestrator.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const MARKER = "Governance-Version: 1";
const ENTRYPOINTS = [
  "AGENTS.md",
  "CLAUDE.md",
  ".github/copilot-instructions.md",
  ".cursorrules",
];

let failures = 0;

function check(label, ok) {
  if (ok) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${label}`);
  }
  return ok;
}

function readOrNull(relPath) {
  try {
    return readFileSync(path.join(root, relPath), "utf8");
  } catch {
    return null;
  }
}

const contents = new Map();
for (const file of ENTRYPOINTS) {
  const text = readOrNull(file);
  contents.set(file, text);
  if (check(`${file} exists`, text !== null) && text !== null) {
    check(`${file} contains "${MARKER}"`, text.includes(MARKER));
  }
}

const agents = contents.get("AGENTS.md");
if (agents !== null && agents !== undefined) {
  check(
    "AGENTS.md links to architecture/README.md",
    agents.includes("architecture/README.md"),
  );
  check(
    "AGENTS.md links to rules/00-non-negotiable-rules.md",
    agents.includes("rules/00-non-negotiable-rules.md"),
  );
}

const claude = contents.get("CLAUDE.md");
if (claude !== null && claude !== undefined) {
  check("CLAUDE.md references AGENTS.md", claude.includes("AGENTS.md"));
}

if (failures > 0) {
  console.error(`Agent governance check failed: ${failures} problem(s).`);
  process.exit(1);
}
console.log("Agent governance check passed.");
