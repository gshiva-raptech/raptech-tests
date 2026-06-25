// parity/lib/findings.mjs
// Writes a fixer-handoff "finding" folder (ERROR.md + INSTRUCTIONS.md + screenshots)
// under parity/findings/ and appends a row to parity/findings/INDEX.md.
// A finding is what the TESTING session hands to the FIXING session.
import fs from 'fs';
import path from 'path';
import { PARITY_DIR } from './config.mjs';

const FINDINGS_DIR = path.join(PARITY_DIR, 'findings');

function nextFindingId() {
  if (!fs.existsSync(FINDINGS_DIR)) return 'F-0001';
  const ids = fs.readdirSync(FINDINGS_DIR)
    .map(d => (d.match(/^F-(\d{4})/) || [])[1]).filter(Boolean).map(Number);
  return 'F-' + String((ids.length ? Math.max(...ids) : 0) + 1).padStart(4, '0');
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
const today = () => new Date().toISOString().slice(0, 10);

/**
 * finding = {
 *   caseId, title, instance, urlPath, module, subModule, priority='Medium',
 *   expected, actual, evidence,            // strings (legacy vs migrated, + how observed)
 *   hints,                                 // optional: where in the code to look
 *   screenshots: [{ label, srcPath }],     // copied into the finding's screenshots/
 * }
 */
export function writeFinding(finding) {
  if (!fs.existsSync(FINDINGS_DIR)) fs.mkdirSync(FINDINGS_DIR, { recursive: true });
  const id = nextFindingId();
  const dir = path.join(FINDINGS_DIR, `${id}-${slug(finding.title)}`);
  const shotDir = path.join(dir, 'screenshots');
  fs.mkdirSync(shotDir, { recursive: true });

  const shotNames = [];
  for (const s of finding.screenshots || []) {
    if (s.srcPath && fs.existsSync(s.srcPath)) {
      const dest = path.join(shotDir, `${slug(s.label)}${path.extname(s.srcPath) || '.png'}`);
      fs.copyFileSync(s.srcPath, dest);
      shotNames.push(path.basename(dest));
    }
  }

  fs.writeFileSync(path.join(dir, 'ERROR.md'), renderError(id, finding, shotNames));
  fs.writeFileSync(path.join(dir, 'INSTRUCTIONS.md'), renderInstructions(id, finding));
  appendIndex(id, finding);
  return { id, dir };
}

function renderError(id, f, shots) {
  return `# ${id} — ${f.title}

| Field | Value |
|---|---|
| Case | ${f.caseId || '-'} |
| Instance | ${f.instance || '-'} |
| URL path | ${f.urlPath || '-'} |
| Module / Sub Module | ${f.module || '-'} / ${f.subModule || '-'} |
| Priority | ${f.priority || 'Medium'} |
| Status | Open |
| Found | parity testing session, ${today()} |

## Expected (legacy = source of truth)
${f.expected || '-'}

## Actual (migrated)
${f.actual || '-'}

## Evidence / how observed
${f.evidence || '-'}

## Screenshots
${shots.length ? shots.map(s => `- \`screenshots/${s}\``).join('\n') : '- (none)'}
`;
}

function renderInstructions(id, f) {
  return `# Fix request — ${id}: ${f.title}

> For the FIXING Claude session. Read \`parity/FIXER_BRIEF.md\` first (standing rules:
> legacy is source of truth, match it exactly, do NOT git commit, leave for human build).

## The gap
- **Expected (legacy):** ${f.expected || '-'}
- **Actual (migrated):** ${f.actual || '-'}
- See \`ERROR.md\` in this folder for evidence + screenshots.

## Where to look${f.hints ? `\n${f.hints}` : '\n- (start from the URL path above; read the legacy screen, then the migrated controller + template + service)'}

## Definition of done
- Migrated behaviour matches legacy for this case.
- Re-run the parity case and confirm it passes:
  \`node parity/run-case.mjs --case ${f.caseId || '<CASE>'} --instance ${f.instance || '<instance>'}\`
- Update this finding's row in \`parity/findings/INDEX.md\` → **Fixed** with a one-line note.
- Log root cause + files changed in the migrated repo's \`summary.md\` (per its CLAUDE.md).
- Do **NOT** \`git commit\`. Leave changes uncommitted for the human to build/test/commit.
`;
}

function appendIndex(id, f) {
  const idx = path.join(FINDINGS_DIR, 'INDEX.md');
  const header = `# Findings index

Status board for the testing → fixing handoff. **Owner** = which session currently holds it
(testing | fixing | human). Tester sets Open; fixer sets Fixed/Partially/Need-Info.

| ID | Title | Case | Instance | Status | Owner | Updated |
|---|---|---|---|---|---|---|
`;
  if (!fs.existsSync(idx)) fs.writeFileSync(idx, header);
  const row = `| ${id} | ${f.title} | ${f.caseId || '-'} | ${f.instance || '-'} | Open | fixing | ${today()} |\n`;
  fs.appendFileSync(idx, row);
}
