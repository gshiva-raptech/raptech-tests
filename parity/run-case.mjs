// parity/run-case.mjs — parameterized parity-test runner.
//
// Usage:
//   node parity/run-case.mjs --case TC-ORG-001 --instance local-dev
//   node parity/run-case.mjs --case TC-ORG-001 --instance local-dev --headed --keep
//   node parity/run-case.mjs --case TC-NEW-001 --instance local-dev          (Track B = migrated only)
//
// Flags:
//   --case <ID>        case id (matched against case filenames under cases/**)
//   --instance <name>  instance key from instances.json
//   --headed           run with a visible browser
//   --keep             keep screenshots dir (otherwise temp)
//   --no-findings      do not auto-write a finding folder on mismatch
//
// A Track A case exports: { id, title, track:'A', role, data(), runLegacy(ctx), runMigrated(ctx), compare(leg, mig, data) }
// A Track B case exports: { id, title, track:'B', role, data(), runMigrated(ctx), check(mig, data) }
// ctx = { page, base, creds, data, forms, shot(name) }  (shot returns a screenshot file path)
// compare()/check() return an array of { aspect, legacy?, migrated, expected?, ok, severity, note }.
import { chromium } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getInstance, resolveCreds, migratedBase, legacyBase, legacySignInUrl, PARITY_DIR,
} from './lib/config.mjs';
import * as forms from './lib/forms.mjs';
import { writeFinding } from './lib/findings.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── args ── */
function parseArgs(argv) {
  const a = { flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--headed') a.flags.headed = true;
    else if (t === '--keep') a.flags.keep = true;
    else if (t === '--no-findings') a.flags.noFindings = true;
    else if (t === '--case') a.case = argv[++i];
    else if (t === '--instance') a.instance = argv[++i];
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));
if (!args.case || !args.instance) {
  console.error('Usage: node parity/run-case.mjs --case <ID> --instance <name> [--headed] [--keep] [--no-findings]');
  process.exit(2);
}

/* ── locate the case module by id (filename match) ── */
function findCaseFile(dir, id) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { const hit = findCaseFile(p, id); if (hit) return hit; }
    else if (entry.name.endsWith('.mjs') && entry.name.includes(id)) return p;
  }
  return null;
}
const caseFile = findCaseFile(path.join(__dirname, 'cases'), args.case);
if (!caseFile) { console.error(`Case "${args.case}" not found under parity/cases/`); process.exit(2); }

const tc = (await import(caseFile)).default;
const inst = getInstance(args.instance);

/* ── screenshot dir ── */
const shotRoot = args.flags.keep
  ? path.join(PARITY_DIR, '.runs', `${tc.id}-${args.instance}-${Date.now()}`)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'parity-'));
fs.mkdirSync(shotRoot, { recursive: true });
const shotFn = (prefix) => (name) => {
  const file = path.join(shotRoot, `${prefix}-${name}.png`);
  return file; // case calls page.screenshot({ path: ctx.shot('x') })
};

console.log(`\n▶ ${tc.id} — ${tc.title}  [track ${tc.track}]  instance=${args.instance}`);
console.log(`  migrated: ${migratedBase(inst) || '(none)'}`);
if (tc.track === 'A') console.log(`  legacy:   ${legacyBase(inst) || '(none)'}`);

const data = tc.data ? tc.data() : {};
const role = tc.role || 'superadmin';
const browser = await chromium.launch({ headless: !args.flags.headed });

let results = [];
let shots = [];
try {
  if (tc.track === 'A') {
    // legacy first (creates the golden record), then migrated with the same data
    const legCtx = await browser.newContext();
    const legPage = await legCtx.newPage();
    const legacyResult = await tc.runLegacy({
      page: legPage, base: legacyBase(inst), signInUrl: legacySignInUrl(inst),
      creds: resolveCreds(inst, 'legacy', role), data, forms, shot: shotFn('legacy'),
    });
    await legCtx.close();

    const migCtx = await browser.newContext();
    const migPage = await migCtx.newPage();
    const migratedResult = await tc.runMigrated({
      page: migPage, base: migratedBase(inst),
      creds: resolveCreds(inst, 'migrated', role), data, forms, shot: shotFn('migrated'),
    });
    await migCtx.close();

    results = tc.compare(legacyResult, migratedResult, data) || [];
    shots = collectShots(legacyResult, migratedResult);
  } else {
    // Track B — migrated only
    const migCtx = await browser.newContext();
    const migPage = await migCtx.newPage();
    const migratedResult = await tc.runMigrated({
      page: migPage, base: migratedBase(inst),
      creds: resolveCreds(inst, 'migrated', role), data, forms, shot: shotFn('migrated'),
    });
    await migCtx.close();
    results = tc.check(migratedResult, data) || [];
    shots = collectShots(null, migratedResult);
  }
} finally {
  await browser.close();
}

/* ── accepted exceptions (user-labelled "migrated is correct" diffs) ── */
const acceptedAspects = loadAcceptedAspects(tc.id);
const isAccepted = (aspect) => acceptedAspects.some(a => aspect.toLowerCase().includes(a.toLowerCase()));

/* ── report ── */
console.log('\n──────── RESULT ────────');
let failed = 0;
for (const r of results) {
  if (!r.ok && isAccepted(r.aspect)) r.accepted = true;
  const mark = r.ok ? 'PASS ✅' : r.accepted ? 'ACCEPTED ⊙' : (r.severity === 'warn' ? 'WARN ⚠️ ' : 'FAIL ❌');
  if (!r.ok && !r.accepted && r.severity !== 'warn') failed++;
  const cmp = tc.track === 'A'
    ? ` (legacy=${fmt(r.legacy)} | migrated=${fmt(r.migrated)})`
    : ` (migrated=${fmt(r.migrated)}${r.expected !== undefined ? ` | expected=${fmt(r.expected)}` : ''})`;
  console.log(`${mark}  ${r.aspect}${cmp}${r.accepted ? ' — accepted exception' : (r.note ? ' — ' + r.note : '')}`);
}
console.log('────────────────────────');

/* ── auto-write a finding on real mismatch (excluding accepted exceptions) ── */
const mismatches = results.filter(r => !r.ok && !r.accepted && r.severity !== 'warn');
if (mismatches.length && !args.flags.noFindings) {
  const lines = mismatches.map(r => {
    const ref = tc.track === 'A' ? `legacy: ${fmt(r.legacy)}` : `expected: ${fmt(r.expected)}`;
    return `- **${r.aspect}** — ${ref} · migrated: ${fmt(r.migrated)}${r.note ? ' (' + r.note + ')' : ''}`;
  });
  const { id, dir } = writeFinding({
    caseId: tc.id, title: tc.title + ' — parity mismatch', instance: args.instance,
    urlPath: tc.urlPath || '', module: tc.module || '', subModule: tc.subModule || '',
    priority: tc.priority || 'Medium',
    expected: (tc.track === 'A' ? 'Migrated must match legacy:\n' : 'Migrated must match legacy spec:\n') + lines.join('\n'),
    actual: mismatches.map(r => `${r.aspect}: migrated=${fmt(r.migrated)}`).join('; '),
    evidence: `Auto-captured by parity runner (case ${tc.id}, instance ${args.instance}).`,
    hints: tc.hints || '',
    screenshots: shots,
  });
  console.log(`\n📝 Finding written: ${id}  → ${path.relative(PARITY_DIR, dir)}`);
  console.log('   Hand parity/' + path.relative(PARITY_DIR, dir) + '/INSTRUCTIONS.md to the fixing session.');
} else if (!mismatches.length) {
  console.log('\n✅ Parity holds — no finding written.');
}

if (!args.flags.keep) fs.rmSync(shotRoot, { recursive: true, force: true });
process.exit(failed ? 1 : 0);

/* ── helpers ── */
function fmt(v) { return v === undefined || v === null ? '—' : String(v); }

// Accepted exceptions: diffs a human labelled "migrated is correct" so they stop
// flagging. parity/exceptions.json = { "<caseId>": { acceptedAspects: ["..."], note } }.
function loadAcceptedAspects(caseId) {
  try {
    const file = path.join(PARITY_DIR, 'exceptions.json');
    if (!fs.existsSync(file)) return [];
    const all = JSON.parse(fs.readFileSync(file, 'utf8'));
    return (all[caseId] && all[caseId].acceptedAspects) || [];
  } catch { return []; }
}
function collectShots(leg, mig) {
  const out = [];
  for (const [obj, who] of [[leg, 'legacy'], [mig, 'migrated']]) {
    if (obj && obj.shots) for (const [label, p] of Object.entries(obj.shots)) out.push({ label: `${who}-${label}`, srcPath: p });
  }
  return out;
}
