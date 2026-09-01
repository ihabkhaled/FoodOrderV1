#!/usr/bin/env node
/**
 * Maps every deployed Cloud Function to the source files it actually depends
 * on, so a deploy can skip functions whose code did not change.
 *
 * The previous resolver used a hand-written list of "isolated" files and fell
 * back to deploying all 62 functions for anything else — including
 * notificationCore.ts, which four modules import and nine do not. A full
 * deploy takes thirty-five minutes, so the fallback was the common case and
 * the cost was paid on almost every release.
 *
 * The graph is derived, never listed. It reads entry.ts (the deploy root) to
 * learn which name comes from which module — including aliases such as
 * `inviteFriendToGroupV150 as inviteFriendToGroup`, where the deployed name
 * does not appear in the source module at all — then walks local imports to
 * close over shared helpers.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SOURCE_DIRECTORY = 'functions/src';
const ENTRY_FILE = `${SOURCE_DIRECTORY}/entry.ts`;

/** `import x from './y.js'`, `export * from './y.js'`, and bare `import './y.js'`. */
const LOCAL_MODULE_PATTERN = /(?:from\s+|import\s+)'\.\/([A-Za-z0-9_.-]+?)(?:\.js)?'/gu;

/** A v2 function export: `export const name = onCall(...)` / `onDocumentX(...)`. */
const FUNCTION_EXPORT_PATTERN = /^export const ([A-Za-z0-9_]+) = on[A-Z]/gmu;

/** `export { a, b as c } from './module.js'` */
const NAMED_REEXPORT_PATTERN =
  /export\s*\{([^}]*)\}\s*from\s*'\.\/([A-Za-z0-9_.-]+?)(?:\.js)?'/gsu;

/** `export * from './module.js'` */
const STAR_REEXPORT_PATTERN = /export\s*\*\s*from\s*'\.\/([A-Za-z0-9_.-]+?)(?:\.js)?'/gu;

/** `import './module.js'` with no bindings — runs for every function. */
const SIDE_EFFECT_IMPORT_PATTERN = /^import\s+'\.\/([A-Za-z0-9_.-]+?)(?:\.js)?';/gmu;

const sourcePath = (moduleName) => `${SOURCE_DIRECTORY}/${moduleName}.ts`;

export const readSourceModules = (root = process.cwd()) => {
  const directory = path.join(root, SOURCE_DIRECTORY);
  const modules = new Map();
  for (const entry of readdirSync(directory)) {
    if (!entry.endsWith('.ts')) continue;
    modules.set(
      entry.replace(/\.ts$/u, ''),
      readFileSync(path.join(directory, entry), 'utf8'),
    );
  }
  return modules;
};

/** Direct local imports of one module, by module name. */
export const directImports = (source) =>
  new Set([...source.matchAll(LOCAL_MODULE_PATTERN)].map((match) => match[1]));

/**
 * Every module a module depends on, itself included. Cycles terminate because
 * a module already in the set is never expanded twice.
 */
export const transitiveImports = (moduleName, modules, seen = new Set()) => {
  if (seen.has(moduleName)) return seen;
  seen.add(moduleName);
  const source = modules.get(moduleName);
  if (!source) return seen;
  for (const dependency of directImports(source)) {
    transitiveImports(dependency, modules, seen);
  }
  return seen;
};

export const exportedFunctionNames = (source) =>
  [...String(source).matchAll(FUNCTION_EXPORT_PATTERN)].map((match) => match[1]).sort();

/**
 * Deployed function name -> the module that defines it, read from entry.ts.
 *
 * Aliases matter: entry.ts deploys `inviteFriendToGroup`, a name that exists
 * nowhere in socialV150.ts. Reading the source modules alone would miss it and
 * quietly leave a changed function running old code.
 */
export const deployedFunctionSources = (modules) => {
  const entry = modules.get('entry');
  if (!entry) throw new Error(`Missing ${ENTRY_FILE}`);
  const sources = new Map();

  for (const match of entry.matchAll(NAMED_REEXPORT_PATTERN)) {
    const [, clause, moduleName] = match;
    for (const binding of clause.split(',')) {
      const parts = binding.trim().split(/\s+as\s+/u);
      const exportedName = (parts[1] ?? parts[0] ?? '').trim();
      if (exportedName) sources.set(exportedName, moduleName);
    }
  }

  for (const match of entry.matchAll(STAR_REEXPORT_PATTERN)) {
    const moduleName = match[1];
    // `export *` re-exports whatever the module exports, including anything it
    // re-exports in turn, so the whole subtree contributes its function names.
    for (const candidate of transitiveImports(moduleName, modules)) {
      for (const name of exportedFunctionNames(modules.get(candidate) ?? '')) {
        if (!sources.has(name)) sources.set(name, candidate);
      }
    }
  }

  return sources;
};

/** Modules imported by entry.ts for their side effects: they affect everything. */
export const globalModules = (modules) => {
  const entry = modules.get('entry') ?? '';
  const global = new Set(['entry']);
  for (const match of entry.matchAll(SIDE_EFFECT_IMPORT_PATTERN)) {
    for (const dependency of transitiveImports(match[1], modules)) {
      global.add(dependency);
    }
  }
  return global;
};

/**
 * Deployed function name -> the set of repository paths it depends on.
 */
export const buildFunctionDependencyGraph = (root = process.cwd()) => {
  const modules = readSourceModules(root);
  const sources = deployedFunctionSources(modules);
  const global = globalModules(modules);

  const dependencies = new Map();
  for (const [name, moduleName] of sources) {
    dependencies.set(
      name,
      new Set(
        [...transitiveImports(moduleName, modules)].map((candidate) =>
          sourcePath(candidate),
        ),
      ),
    );
  }

  return {
    dependencies,
    globalPaths: new Set([...global].map((candidate) => sourcePath(candidate))),
    knownPaths: new Set([...modules.keys()].map((candidate) => sourcePath(candidate))),
  };
};

/**
 * The functions a set of changed files requires deploying.
 *
 * Returns `null` for "deploy everything" whenever the change cannot be proven
 * narrow: a global module, or any functions-related file outside the graph
 * (package.json, tsconfig, the compiled engine package). Falling back is
 * always safe; guessing narrow is not.
 */
export const resolveFunctionTargetsFromGraph = (changedFunctionFiles, root = process.cwd()) => {
  if (changedFunctionFiles.length === 0) return [];
  const { dependencies, globalPaths, knownPaths } = buildFunctionDependencyGraph(root);

  for (const file of changedFunctionFiles) {
    if (globalPaths.has(file)) return null;
    if (!knownPaths.has(file)) return null;
  }

  const changed = new Set(changedFunctionFiles);
  const targets = [];
  for (const [name, paths] of dependencies) {
    for (const candidate of paths) {
      if (changed.has(candidate)) {
        targets.push(name);
        break;
      }
    }
  }
  return targets.sort();
};
