import type { Rule } from 'eslint';

declare const plugin: {
  meta: { name: string; version: string };
  rules: Record<string, Rule.RuleModule>;
};

export default plugin;
