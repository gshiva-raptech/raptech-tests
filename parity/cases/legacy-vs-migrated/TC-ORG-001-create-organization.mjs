// TC-ORG-001 — Create Organization (super admin) — Track A (legacy vs migrated)
//
// Creates the SAME organization in legacy and migrated, then compares the
// observable outcome: did it create, and what STATUS does a brand-new org get.
// This is the case that originally surfaced the two regressions (default status
// Inactive; Product/Allow-Price-Change not required). Re-run after a fix to
// confirm parity holds.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../test-data/TC-ORG-001.json'), 'utf8'));

export default {
  id: 'TC-ORG-001',
  title: 'Create Organization',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/organizations/new',
  module: 'Admin Settings',
  subModule: 'Organization',
  hints: '- Migrated default status: OrganizationServiceImpl.create() (status 1 = Active).\n'
       + '- Migrated required Product/Allow-Price-Change: OrganizationController.createOrg() validation.\n'
       + '- Legacy: addOrganization.jsp / saveOrUpdateOrganization.action.',

  data() {
    const stamp = Date.now().toString().slice(-7);
    return {
      ...BASE,
      stamp,
      name: `ZZ Parity Org ${stamp}`,
      displayName: `Parity ${stamp}`,
      emailId: `parity${stamp}@example.com`,
      entityAlias: `PAR${stamp}`,
      viewAlias: `VW${stamp}`,
    };
  },

  /* ── LEGACY ── */
  async runLegacy({ page, base, signInUrl, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);

    await page.goto(`${base}/admin/addOrganization.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    for (const [id, v] of Object.entries({
      name: data.name, displayName: data.displayName, firstName: data.firstName, lastName: data.lastName,
      address1: data.address1, phoneNo: data.phoneNo, emailId: data.emailId, city: data.city,
      postalCode: data.postalCode, entityAlias: data.entityAlias, viewAlias: data.viewAlias,
    })) await forms.fillById(page, id, v);
    await forms.legacyAutocomplete(page, 'country', data.country);
    await forms.legacyAutocomplete(page, 'state', data.state);
    await page.selectOption('#enterprisePlanId', { label: data.enterprisePlan }).catch(() => {});
    await page.selectOption('#dateFormat', { label: data.dateFormat }).catch(() => {});
    await forms.legacySelectMultiByLabel(page, 'currencyId', data.currency);
    await forms.legacyClickLabelFor(page, 'poPaymentType-2');  // Allow Price Change = Yes
    await forms.legacyClickLabelFor(page, 'productList-1');     // Product = Contract
    shots.filled = shot('filled'); await page.screenshot({ path: shots.filled, fullPage: true }).catch(() => {});

    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.locator('input[type="submit"][value="Create"], input[value="Create"]').first().click(),
    ]);
    await page.waitForTimeout(2500);
    const afterUrl = page.url();

    // Legacy redirects to viewOrganization.action on a successful save → leaving
    // the add form is the reliable success signal.
    const createdOk = !/addOrganization/i.test(afterUrl);

    // Best-effort persistence check (legacy list search doesn't filter on every build).
    await page.goto(`${base}/admin/viewOrganization.action`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
    await page.fill('input[placeholder*="Search" i]', data.name).catch(() => {});
    await page.waitForTimeout(1200);
    const persisted = await page.locator(`text=${data.name}`).first().isVisible().catch(() => false);
    shots.result = shot('list'); await page.screenshot({ path: shots.result, fullPage: true }).catch(() => {});

    // Legacy default status for a NEW org is ACTIVE — an established, repeatedly
    // verified baseline. Legacy's org list has no KPI counters and is paginated,
    // so there's no reliable status readout to scrape; we assert migrated against
    // this documented constant. (CREATE itself is live-verified on both sides.)
    const status = 'Active';
    return { app: 'legacy', createdOk, persisted, status, afterUrl, shots };
  },

  /* ── MIGRATED ── */
  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/organizations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const before = await forms.readCounters(page);

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
    shots.filled = shot('filled'); await page.screenshot({ path: shots.filled, fullPage: true }).catch(() => {});

    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /create organization/i }).click(),
    ]);
    await page.waitForTimeout(2500);
    const afterUrl = page.url();
    const idMatch = afterUrl.match(/organizations\/(\d+)/);

    // Authoritative status: fresh reload of the detail page toggle.
    let status = null;
    if (idMatch) {
      await page.goto(`${MIG}/admin/organizations/${idMatch[1]}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const t = await page.evaluate(() => {
        const el = document.querySelector('#statusToggle'); const n = document.querySelector('#statusName');
        return { checked: el ? el.checked : null, name: n ? n.textContent.trim() : null };
      });
      status = t.name || (t.checked === true ? 'Active' : t.checked === false ? 'Inactive' : null);
      shots.detail = shot('detail'); await page.screenshot({ path: shots.detail, fullPage: true }).catch(() => {});
    }
    await page.goto(`${MIG}/admin/organizations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const after = await forms.readCounters(page);
    if (!status) status = deriveStatusFromCounters(before, after);

    const createdOk = !!idMatch && !/\/new\b/.test(afterUrl);
    return { app: 'migrated', createdOk, orgId: idMatch ? idMatch[1] : null, status, before, after, afterUrl, shots };
  },

  /* ── COMPARE ── */
  compare(legacy, migrated, data) {
    return [
      { aspect: 'Created successfully', legacy: legacy.createdOk, migrated: migrated.createdOk,
        ok: legacy.createdOk === true && migrated.createdOk === true },
      { aspect: 'Default status of new org', legacy: legacy.status, migrated: migrated.status,
        ok: !!legacy.status && legacy.status === migrated.status,
        note: (legacy.status && legacy.status !== migrated.status) ? 'migrated must match legacy' : '' },
    ];
  },
};

// active +1 → created Active; total +1 but active flat → Inactive; else unknown.
function deriveStatusFromCounters(before, after) {
  if (!before || !after || after.active == null || before.active == null) return null;
  const da = after.active - before.active;
  const dt = (after.total != null && before.total != null) ? after.total - before.total : null;
  if (da === 1) return 'Active';
  if (dt === 1 && da === 0) return 'Inactive';
  return null;
}
