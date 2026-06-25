// TC-OUI-ADDR-1 — Address required-field validation + duplicate guard, UI-only.
//
// Legacy parity (live-verified, addAddress.action): required fields are Address
// Name, Address 1, Country, State, City (all show inline "Required." when empty);
// duplicate address name (org-scoped, case/space-insensitive) → "Already Exists"
// and stays on the add form. Form field set + maxlengths match legacy
// (name 200, addr1/2 100, country/state/city 50, postal 20, GSTIN 15, PAN 10,
//  VAT 20, first/last 30, phone 20, email 50).
//
// Asserts only what the user SEES (inline field errors, on-screen dup message,
// grid row text). Cleanup (RULE 7): delete only this run's stamped address rows.
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-ADDR-1', title: 'Address — required fields + duplicate guard (UI-only)',
  track: 'B', role: 'regular',
  urlPath: '/admin/organization/addresses', module: 'Admin Settings',
  subModule: 'Organization → Addresses',
  hints: '- OrgSettingsController addressCreate (dup name guard). 5 required: name,addr1,country,state,city.',
  data() { return { stamp: 'ZZ ADDR ' + Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = data.stamp;
    let reqLabels = [], createdInGrid = false, dupMsg = null;
    try {
      // 1) empty submit → inline errors on the 5 legacy-required fields
      await page.goto(`${MIG}/admin/organization/addresses/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: /create/i }).click().catch(() => {});
      await page.waitForTimeout(600);
      reqLabels = (await ui.visibleFieldErrors(page)).map(e => e.label.replace('*', '').trim());

      // 2) valid create → appears in grid
      await page.fill('#name', name);
      await page.fill('#address1', '1 Test St');
      await page.fill('#country', 'India');
      await page.fill('#state', 'KA');
      await page.fill('#city', 'Bengaluru');
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(900);
      await page.goto(`${MIG}/admin/organization/addresses`, { waitUntil: 'domcontentloaded' });
      await ui.gridReady(page);
      createdInGrid = await ui.gridHasText(page, name);

      // 3) duplicate name → on-screen message, stays on form
      await page.goto(`${MIG}/admin/organization/addresses/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.fill('#name', name);
      await page.fill('#address1', '2 Test St');
      await page.fill('#country', 'India');
      await page.fill('#state', 'KA');
      await page.fill('#city', 'Bengaluru');
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(800);
      dupMsg = await page.evaluate(() => document.body.innerText.match(/already exists[^\n]*/i)?.[0] || null);
    } finally {
      // Admin addresses: org-scoped. Delete ONLY this run's stamped rows. FK order:
      // address row first (address.contact_id_fk → contact_details), then the orphan
      // contact_details rows it referenced.
      try {
        const cids = psql(
          `SELECT contact_id_fk FROM raptech_scm.address ` +
          `WHERE name LIKE $T$${data.stamp}%$T$ AND contact_id_fk IS NOT NULL`)
          .split('\n').map(s => s.trim()).filter(s => /^\d+$/.test(s));
        psql(`DELETE FROM raptech_scm.address WHERE name LIKE $T$${data.stamp}%$T$`);
        if (cids.length) psql(`DELETE FROM raptech_scm.contact_details WHERE contact_id_pk IN (${cids.join(',')})`);
      } catch (e) { /* report if blocked */ }
    }
    const need = ['Address Name', 'Address 1', 'Country', 'State', 'City'];
    const allReqShown = need.every(l => reqLabels.some(r => r.toLowerCase() === l.toLowerCase()));
    return { reqLabels, allReqShown, createdInGrid, dupMsg };
  },
  check(m) {
    return [
      { aspect: 'Empty submit flags all 5 legacy-required fields', migrated: JSON.stringify(m.reqLabels),
        expected: 'Address Name, Address 1, Country, State, City', ok: m.allReqShown === true },
      { aspect: 'Valid create appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate name blocked with on-screen message', migrated: m.dupMsg || '(none)',
        expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
    ];
  },
};
