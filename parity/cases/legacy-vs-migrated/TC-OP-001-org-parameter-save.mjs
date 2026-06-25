// TC-OP-001 — Org Parameter save roundtrip (super admin) — Track B.
// Create a fixture org, switch to it, enable a parameter (+ set a text value if it
// has one), save, reload, verify the enable + value persisted.
import { makeOrgData, createMigratedOrg, switchOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-OP-001',
  title: 'Org Parameter — enable + save persists',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter',
  module: 'Admin Settings',
  subModule: 'Org Parameter',
  hints: '- Legacy saveOrUpdateOrgParameter (org_conditional_packages + org_conditional_parameters).\n- Migrated: AdminMiscController.orgParameterSave().',

  data() { return makeOrgData('ZZ OPsave Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);
    await switchOrg(page, base, orgId);

    const open = async () => { await page.goto(`${MIG}/admin/org-parameter`, { waitUntil: 'networkidle' }); await page.waitForTimeout(700); };
    await open();

    const firstCb = page.locator('input.op-param-toggle').first();
    const cbName = await firstCb.getAttribute('name');         // enable_<paramId>
    const paramId = cbName.replace('enable_', '');
    await firstCb.check();

    // if this parameter has a plain text value field (now revealed), set it
    let valSet = null;
    const txt = page.locator(`#opreveal_${paramId} input[type=text][name="value_${paramId}"]`);
    if (await txt.count()) { valSet = '7'; await txt.first().fill(valSet).catch(() => { valSet = null; }); }
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});

    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /save\/update/i }).click(),
    ]);
    await page.waitForTimeout(1500);

    await open();
    const persistedChecked = await page.locator(`input[name="${cbName}"]`).isChecked().catch(() => null);
    const persistedVal = valSet ? await page.locator(`input[name="value_${paramId}"]`).inputValue().catch(() => null) : null;
    shots.reloaded = shot('reloaded'); await page.screenshot({ path: shots.reloaded, fullPage: true }).catch(() => {});

    return { orgId, paramId, persistedChecked, valSet, persistedVal, shots };
  },

  check(m) {
    const rows = [
      { aspect: 'Parameter enable persisted', migrated: m.persistedChecked, expected: true, ok: m.persistedChecked === true },
    ];
    if (m.valSet) {
      rows.push({ aspect: 'Parameter value persisted', migrated: m.persistedVal, expected: m.valSet, ok: m.persistedVal === m.valSet, severity: 'warn' });
    }
    return rows;
  },
};
