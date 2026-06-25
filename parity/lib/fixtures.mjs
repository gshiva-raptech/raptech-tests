// parity/lib/fixtures.mjs
// Reusable fixtures for action cases (edit / details / view-entity / delete) that
// need an existing org to operate on. Creates a throwaway org in the migrated app
// so each case is self-contained and never depends on pre-existing data.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORG_BASE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../test-data/TC-ORG-001.json'), 'utf8'));

// A complete, unique org dataset (valid against the post-fix create form).
export function makeOrgData(prefix = 'ZZ Fixture Org') {
  const stamp = Date.now().toString().slice(-6) + String(Math.floor(Math.random() * 900 + 100));
  return {
    ...ORG_BASE,
    stamp,
    name: `${prefix} ${stamp}`,
    displayName: `Fixture ${stamp}`,
    emailId: `fixture${stamp}@example.com`,
    entityAlias: `FX${stamp}`,
    viewAlias: `FXV${stamp}`,
  };
}

// Create a migrated org (assumes page is already logged in as super admin).
// Fills all required fields incl. Product + Allow-Price-Change (now enforced).
// Returns { orgId, afterUrl }.
export async function createMigratedOrg(page, base, forms, data) {
  const MIG = base.replace(/\/+$/, '');
  await page.goto(`${MIG}/admin/organizations`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.click('#btnNew');
  await page.waitForTimeout(1800);
  for (const [id, v] of Object.entries({
    name: data.name, displayName: data.displayName, firstName: data.firstName, lastName: data.lastName,
    address1: data.address1, phoneNo: data.phoneNo, email: data.emailId, city: data.city,
    postalCode: data.postalCode, entityAlias: data.entityAlias, viewAlias: data.viewAlias,
  })) await forms.fillById(page, id, v);
  await forms.migratedChooseMs(page, 'country', data.country);
  await page.waitForTimeout(1500);
  await forms.migratedChooseMs(page, 'state', data.state);
  await page.selectOption('#enterprisePlanId', { label: data.enterprisePlan }).catch(() => {});
  await page.selectOption('#dateFormat', { label: data.dateFormat }).catch(() => {});
  await forms.migratedChooseMs(page, 'currencyId', data.currency, { startsWith: true });
  await forms.migratedTickLabel(page, 'contracts1');       // Product = Contract
  await forms.migratedTickLabel(page, 'poVariablePrice1'); // Allow Price Change = Yes
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.getByRole('button', { name: /create organization/i }).click(),
  ]);
  await page.waitForTimeout(2500);
  const afterUrl = page.url();
  const m = afterUrl.match(/organizations\/(\d+)/);
  if (!m) throw new Error(`fixture org create failed (url=${afterUrl})`);
  return { orgId: m[1], afterUrl };
}

// Fetch the migrated active-org rows via the JSON endpoint (authenticated session).
// Reliable way to assert presence/absence without UI search.
export async function fetchActiveOrgRows(page, base) {
  const MIG = base.replace(/\/+$/, '');
  return page.evaluate(async (u) => {
    const r = await fetch(u, { headers: { Accept: 'application/json' } });
    return r.ok ? await r.json() : null;
  }, `${MIG}/admin/organizations/rows`);
}

/* ── Roles ── */

export function makeRoleName(prefix = 'ZZ Role') {
  return `${prefix} ${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
}

// Create a role (assumes logged in as super admin). name + group required.
export async function createMigratedRole(page, base, name, group = 'Company') {
  const MIG = base.replace(/\/+$/, '');
  await page.goto(`${MIG}/admin/roles/new`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.selectOption('#roleGroup', group).catch(() => {});
  await page.fill('#name', name).catch(() => {});
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.getByRole('button', { name: /create role/i }).click(),
  ]);
  await page.waitForTimeout(1500);
  const m = page.url().match(/roles\/(\d+)/);
  if (!m) throw new Error(`role create failed (url=${page.url()})`);
  return { roleId: m[1], name };
}

export async function fetchRoleRows(page, base) {
  const MIG = base.replace(/\/+$/, '');
  return page.evaluate(async (u) => {
    const r = await fetch(u, { headers: { Accept: 'application/json' } });
    return r.ok ? await r.json() : null;
  }, `${MIG}/admin/roles/rows`);
}

/* ── Org parameter set/read (for business-rule tests) ── */
// Read an org parameter's enabled state (admin page, already in the target org context).
export async function readOrgParamState(adminPage, base, orgId, paramId) {
  const MIG = base.replace(/\/+$/, '');
  await adminPage.goto(`${MIG}/admin/org-parameter?orgId=${orgId}`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(400);
  return adminPage.evaluate(pid => { const cb = document.querySelector(`input[name="enable_${pid}"]`); return cb ? cb.checked : null; }, paramId);
}
// Enable/disable an org parameter and save (admin).
export async function setOrgParam(adminPage, base, orgId, paramId, enabled) {
  const MIG = base.replace(/\/+$/, '');
  await adminPage.goto(`${MIG}/admin/org-parameter?orgId=${orgId}`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(400);
  await adminPage.evaluate(({ pid, en }) => {
    const cb = document.querySelector(`input[name="enable_${pid}"]`);
    if (cb) { cb.checked = en; cb.dispatchEvent(new Event('change', { bubbles: true })); }
  }, { pid: paramId, en: enabled });
  await Promise.all([
    adminPage.waitForLoadState('networkidle').catch(() => {}),
    adminPage.getByRole('button', { name: /save\/update/i }).click(),
  ]);
  await adminPage.waitForTimeout(900);
}

// Signature of a form's controls (names + readonly/required markers) + visible sections.
// readonly and required are SEPARATE markers (a field can swap between them — e.g. an
// auto-gen id becomes readonly AND drops required; lumping them hides the change).
export async function formSignature(orgUserPage) {
  return orgUserPage.evaluate(() => {
    const c = [...document.querySelectorAll('form [name]')].map(e =>
      `${e.tagName}|${e.getAttribute('name')}|${e.type || ''}|${(e.readOnly || e.disabled) ? 'ro' : ''}|${(e.required || e.closest('[data-req="1"]')) ? 'req' : ''}`);
    const s = [...document.querySelectorAll('.section')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.id);
    return JSON.stringify([...new Set(c)].sort()) + '#' + JSON.stringify(s.sort());
  });
}

// Toggle an org param off→on and report whether the org user's form at `url` changes.
// Restores the original param state. Returns { accessible, differs }.
export async function paramFormEffect(adminPage, base, orgId, paramId, orgUserPage, url) {
  const MIG = base.replace(/\/+$/, '');
  const orig = await readOrgParamState(adminPage, base, orgId, paramId);
  const sig = async () => {
    const r = await orgUserPage.goto(`${MIG}${url}`, { waitUntil: 'networkidle' }).catch(() => null);
    await orgUserPage.waitForTimeout(600);
    const ok = !!(r && r.ok()) && !/signin/i.test(orgUserPage.url());
    return { ok, s: await formSignature(orgUserPage) };
  };
  await setOrgParam(adminPage, base, orgId, paramId, false); const off = await sig();
  await setOrgParam(adminPage, base, orgId, paramId, true); const on = await sig();
  await setOrgParam(adminPage, base, orgId, paramId, orig === null ? false : orig);
  return { accessible: off.ok && on.ok, differs: off.s !== on.s };
}

/* ── Org switcher (config tabs target the session-active org) ── */
// Switch the super-admin's active org via POST /switch-org/{orgId}. Requires a
// page already loaded (for the CSRF meta tags). Returns the HTTP status.
export async function switchOrg(page, base, orgId) {
  const MIG = base.replace(/\/+$/, '');
  return page.evaluate(async (a) => {
    const h = (document.querySelector('meta[name=_csrf_header]') || {}).content;
    const t = (document.querySelector('meta[name=_csrf]') || {}).content;
    const r = await fetch(`${a.MIG}/switch-org/${a.orgId}`, {
      method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow',
    });
    return r.status;
  }, { MIG, orgId });
}
