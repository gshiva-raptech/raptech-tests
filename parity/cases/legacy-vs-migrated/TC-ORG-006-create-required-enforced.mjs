// TC-ORG-006 — Create Organization: required Product + Allow-Price-Change ENFORCED
// Track B (negative case). Guards fix #2. Self-contained.
// Fill all 14 required fields but OMIT Product and Allow-Price-Change, submit, and
// assert the create is BLOCKED (stays on the New form, org not persisted) — matching
// legacy saveOrUpdateOrganization, which rejects with "Required.".
import { makeOrgData, fetchActiveOrgRows } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ORG-006',
  title: 'Create Organization — Product/Allow-Price-Change required',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/new',
  module: 'Admin Settings',
  subModule: 'Organization',
  hints: '- Legacy saveOrUpdateOrganization requires ≥1 Product + an Allow-Price-Change choice.\n'
       + '- Migrated: OrganizationController.createOrg() → validateProductAndPrice().',

  data() { return makeOrgData('ZZ ReqNeg Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
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
    // >>> intentionally OMIT Product + Allow-Price-Change <<<
    shots.filled = shot('filled'); await page.screenshot({ path: shots.filled, fullPage: true }).catch(() => {});

    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /create organization/i }).click(),
    ]);
    await page.waitForTimeout(2000);
    const afterUrl = page.url();
    const blockedOnForm = /\/admin\/organizations\/new/.test(afterUrl);
    const gotDetailId = /\/admin\/organizations\/\d+/.test(afterUrl);
    const errText = await page.evaluate(() => {
      const m = document.body.innerText.match(/Select at least one Product|Allow Price Change[^.]*|Required\.?/i);
      return m ? m[0].trim() : null;
    });
    const rows = await fetchActiveOrgRows(page, base);
    const persisted = rows ? rows.some(r => r.name === data.name) : null;
    shots.after = shot('after'); await page.screenshot({ path: shots.after, fullPage: true }).catch(() => {});

    return { afterUrl, blockedOnForm, gotDetailId, errText, persisted, shots };
  },

  check(m) {
    return [
      { aspect: 'Create blocked (no detail page)', migrated: m.gotDetailId ? 'created' : 'blocked', expected: 'blocked',
        ok: m.blockedOnForm === true && m.gotDetailId === false },
      { aspect: 'Org NOT persisted', migrated: m.persisted === false ? 'absent' : 'present', expected: 'absent', ok: m.persisted === false },
      { aspect: 'Required-field message shown', migrated: m.errText || '(none)', expected: 'Required / Product message', ok: !!m.errText, severity: 'warn' },
    ];
  },
};
