/**
 * Path classification helpers shared by the architecture rules.
 *
 * Rules receive absolute filenames from ESLint; everything here normalizes to
 * a repo-relative, forward-slash path before matching so behavior is
 * identical on Windows and POSIX runners.
 */

/** Normalize an absolute or relative filename to a src-rooted posix path. */
export const toRepoPath = (filename) => {
  const posix = String(filename).replaceAll('\\', '/');
  const index = posix.lastIndexOf('/src/');
  if (index === -1) return posix.startsWith('src/') ? posix : posix.replace(/^.*?\//u, '');
  return posix.slice(index + 1);
};

export const isInside = (repoPath, directory) =>
  repoPath === directory || repoPath.startsWith(`${directory}/`);

/** The architectural layer of a file, or null when outside the new layout. */
export const layerOf = (repoPath) => {
  if (isInside(repoPath, 'src/app')) return 'app';
  if (isInside(repoPath, 'src/modules')) return 'modules';
  if (isInside(repoPath, 'src/shared')) return 'shared';
  if (isInside(repoPath, 'src/platform')) return 'platform';
  if (isInside(repoPath, 'src/packages')) return 'packages';
  return null;
};

/** Module name for files under src/modules/<name>/, else null. */
export const moduleOf = (repoPath) => {
  const match = /^src\/modules\/([^/]+)\//u.exec(repoPath);
  return match ? match[1] : null;
};

/** Package owner name for files under src/packages/<name>/, else null. */
export const packageOf = (repoPath) => {
  const match = /^src\/packages\/([^/]+)\//u.exec(repoPath);
  return match ? match[1] : null;
};

export const isComponentFile = (repoPath) => /\.component\.tsx?$/u.test(repoPath);

export const isHookFile = (repoPath) =>
  /\.hook\.tsx?$/u.test(repoPath) || /\/hooks\/[^/]+\.tsx?$/u.test(repoPath);

/** Files allowed to call project-owned custom hooks (but never built-ins). */
export const isHookConsumerFile = (repoPath) =>
  /\.container\.tsx$/u.test(repoPath) ||
  /\.routes\.tsx$/u.test(repoPath) ||
  /\/(providers|shell|router)\/[^/]+\.tsx$/u.test(repoPath);

/**
 * Resolve a relative import specifier against the importing file so layer
 * rules also see `../../modules/...` style escapes, not only `@/` aliases.
 */
export const resolveImportPath = (repoPath, specifier) => {
  if (specifier.startsWith('@/')) return `src/${specifier.slice(2)}`;
  if (!specifier.startsWith('.')) return null;
  const segments = repoPath.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') segments.pop();
    else segments.push(part);
  }
  return segments.join('/');
};
