/**
 * Compiles a task context bundle.
 *
 * The previous context command answered "read these 15 files", which cost one
 * tool round-trip and the file's full token weight per entry. This compiles the
 * answer instead: exported symbols, rule obligations, and the tests that cover
 * the area, so a single read replaces the fan-out.
 */

const EXPORT_PATTERN =
  /^export\s+(?:default\s+)?(?:async\s+)?(?:const|let|function|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/gmu;

/** Signature-level view of a file: what it offers, not how it works. */
export const summarizeSource = (content) => {
  const symbols = [...content.matchAll(EXPORT_PATTERN)].map((match) => match[1]);
  return [...new Set(symbols)];
};

/**
 * The obligations of a rule document, not its prose.
 *
 * Rules are written for humans and run to hundreds of lines; the enforceable
 * part is the imperative bullets. Keeping only those preserves the obligation
 * while dropping the narrative around it.
 */
export const extractObligations = (content, limit = 6) => {
  const lines = content.split('\n');
  const obligations = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!/^[-*]\s+/u.test(line)) continue;
    const text = line.replace(/^[-*]\s+/u, '').replace(/\*\*/gu, '');
    if (!/\b(must|never|always|required|prohibited|forbidden|only|do not)\b/iu.test(text)) continue;
    obligations.push(text.length > 160 ? `${text.slice(0, 157)}...` : text);
    if (obligations.length >= limit) break;
  }
  return obligations;
};

const bullet = (items) => (items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : '- (none)');

export const renderBundle = ({
  task,
  mode,
  risk,
  confidence,
  domains,
  ruleDigests,
  skills,
  sources,
  tests,
  validation,
  cost,
  unmatched,
}) => {
  const sourceLines = sources.map((source) => {
    const symbols = source.symbols.length > 0 ? source.symbols.slice(0, 12).join(', ') : '(no exports)';
    return `- \`${source.path}\` — ${symbols}`;
  });

  const ruleSections = ruleDigests.map(
    (digest) => `### ${digest.id}\n${bullet(digest.obligations)}\n\nSOURCE: \`rules/${digest.id}.md\``,
  );

  return `# Task context

TASK: ${task}
MODE: ${mode}
RISK: ${risk}
DOMAIN: ${domains.length > 0 ? domains.join(', ') : 'unresolved'}
CONFIDENCE: ${confidence}
${unmatched ? '\n> No domain matched. Widen the task wording or pass --files=. Do not assume this scope is complete.\n' : ''}
## Mandatory rules

${ruleSections.join('\n\n') || '- (none)'}

## Playbooks

${bullet(skills.map((skill) => `\`skills/${skill}.md\``))}

## Likely source files

${sourceLines.length > 0 ? sourceLines.join('\n') : '- (none resolved)'}

## Likely tests

${bullet(tests.map((test) => `\`${test}\``))}

## Required validation

${bullet(validation.map((command) => `\`${command}\``))}

## Cost

- Rules loaded: ${cost.rulesLoaded}/${cost.rulesTotal}
- Skills loaded: ${cost.skillsLoaded}/${cost.skillsTotal}
- Source files scoped: ${cost.sourceCount}
- Bundle tokens: ~${cost.bundleTokens}
- Reading those files instead: ~${cost.rawTokens}
- Reduction: ${cost.reductionPercent}%
`;
};
