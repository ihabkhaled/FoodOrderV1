import { toRepoPath } from '../shared/paths.mjs';

/**
 * Files in the new layout declare their architectural responsibility through
 * their suffix. A file whose name carries no recognized responsibility suffix
 * has no defined owner layer and is rejected.
 */
const allowedTsx = /\.(component|container|provider|routes)\.tsx$/u;
const allowedTs =
  /\.(hook|service|gateway|repository|queries|mutations|store|selectors|schema|mapper|helper|utils|factory|constants|types|interfaces|enums|variants|errors|adapter|api)\.tsx?$/u;
const exemptNames = new Set(['index.ts', 'index.tsx', 'main.tsx', 'vite-env.d.ts']);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Source files must carry a recognized architectural responsibility suffix.',
    },
    schema: [],
    messages: {
      badSuffix:
        "'{{base}}' has no architectural suffix. Name files `<name>.<responsibility>.ts(x)` (component, container, hook, service, gateway, helper, constants, types, ...) or `index.ts`.",
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    const base = repoPath.split('/').pop() ?? '';
    if (
      exemptNames.has(base) ||
      base.endsWith('.d.ts') ||
      allowedTsx.test(base) ||
      allowedTs.test(base)
    )
      return {};
    return {
      Program(node) {
        context.report({ node, messageId: 'badSuffix', data: { base } });
      },
    };
  },
};
