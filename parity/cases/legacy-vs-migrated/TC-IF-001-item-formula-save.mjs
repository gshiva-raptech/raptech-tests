// TC-IF-001 — Item Formula save roundtrip (super admin) — Track B.
// Create a fixture org, switch to it, tick Costing + set a costing formula on the
// Selling Price base row, save, reload, verify it persisted.
import { makeOrgData, createMigratedOrg, switchOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-IF-001',
  title: 'Item Formula — save persists',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/item-formula',
  module: 'Admin Settings',
  subModule: 'Item Formula',
  hints: '- Legacy saveItemFormula.\n- Migrated: AdminMiscController.itemFormulaSave().',

  data() { return makeOrgData('ZZ IFsave Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);
    await switchOrg(page, base, orgId);

    const formula = '100';
    const open = async () => {
      await page.goto(`${MIG}/admin/item-formula?type=Price`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
    };
    await open();
    const row = page.locator('tr', { hasText: 'Selling Price' }).first();
    await row.locator('input[type=checkbox][name^="isCosting_"]').first().check();
    await row.locator('input[name^="costingFormula_"]').first().fill(formula);
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /save \/ update/i }).click(),
    ]);
    await page.waitForTimeout(1500);

    // reload + read back from the Selling Price row
    await open();
    const row2 = page.locator('tr', { hasText: 'Selling Price' }).first();
    const costingChecked = await row2.locator('input[type=checkbox][name^="isCosting_"]').first().isChecked().catch(() => null);
    const costingFormula = await row2.locator('input[name^="costingFormula_"]').first().inputValue().catch(() => null);
    shots.reloaded = shot('reloaded'); await page.screenshot({ path: shots.reloaded, fullPage: true }).catch(() => {});

    return { orgId, expectedFormula: formula, costingChecked, costingFormula, shots };
  },

  check(m) {
    return [
      { aspect: 'Costing enabled persisted', migrated: m.costingChecked, expected: true, ok: m.costingChecked === true },
      { aspect: 'Costing formula persisted', migrated: m.costingFormula, expected: m.expectedFormula, ok: m.costingFormula === m.expectedFormula },
    ];
  },
};
