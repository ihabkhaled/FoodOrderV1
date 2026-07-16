import { toRepoPath } from '../shared/paths.mjs';

/**
 * Absolute route paths come from typed route constants and builders owned by
 * each module's `routes/` layer. Inline `'/...'` literals in `to=` props or
 * `navigate()` calls silently break when a route moves.
 */
const isRouteOwnerFile = (repoPath) =>
  /\.routes\.tsx?$/u.test(repoPath) ||
  /-route-paths\.constants\.ts$/u.test(repoPath) ||
  /-route-builders\.helper\.ts$/u.test(repoPath) ||
  /\/routes\/[^/]+$/u.test(repoPath);

const isAbsolutePathLiteral = (node) =>
  node?.type === 'Literal' && typeof node.value === 'string' && node.value.startsWith('/');

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Absolute route paths belong in route constants/builders, not inline literals.',
    },
    schema: [],
    messages: {
      inlineRoute:
        "Inline route path '{{path}}'. Use the owning module's route constants or a typed route builder.",
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    if (isRouteOwnerFile(repoPath)) return {};
    const report = (node) => {
      context.report({ node, messageId: 'inlineRoute', data: { path: node.value } });
    };
    return {
      JSXAttribute(node) {
        if (
          node.name.type === 'JSXIdentifier' &&
          (node.name.name === 'to' || node.name.name === 'href') &&
          isAbsolutePathLiteral(node.value)
        )
          report(node.value);
      },
      CallExpression(node) {
        const callee = node.callee;
        const isNavigate =
          (callee.type === 'Identifier' && callee.name === 'navigate') ||
          (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'navigate');
        if (isNavigate && isAbsolutePathLiteral(node.arguments[0])) report(node.arguments[0]);
      },
    };
  },
};
