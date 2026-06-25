// TC-IF-000 — Item Formula page loads (super admin tab) — Track B.
// Item Formula is an org-scoped matrix (not a grid). Create a fixture org, switch
// to it, open the Price matrix, and verify the base rows + Price/Qty selector + Save.
import { makeOrgData, createMigratedOrg, switchOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-IF-000',
  title: 'Item Formula page loads',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/item-formula',
  module: 'Admin Settings',
  subModule: 'Item Formula',
  hints: '- Legacy createOrEditItemFormula.jsp (Price/Qty attribute matrix).\n- Migrated: AdminMiscController.itemFormulaMatrix(); admin/item-formula/form.html.',

  data() { return makeOrgData('ZZ IF Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);
    const switchStatus = await switchOrg(page, base, orgId);

    await page.goto(`${MIG}/admin/item-formula?type=Price`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasSelling = /Selling Price/i.test(bodyText);
    const hasNet = /Net Price/i.test(bodyText);
    const hasSave = await page.getByRole('button', { name: /save \/ update/i }).count();
    const hasPriceTab = await page.locator('a.subtab', { hasText: /^Price$/ }).count();
    const hasQtyTab = await page.locator('a.subtab', { hasText: /^Qty$/ }).count();
    shots.page = shot('page'); await page.screenshot({ path: shots.page, fullPage: true }).catch(() => {});

    return { orgId, switchStatus, hasSelling, hasNet, hasSave, hasPriceTab, hasQtyTab, shots };
  },

  check(m) {
    return [
      { aspect: 'Switched to fixture org', migrated: m.switchStatus, expected: '200', ok: m.switchStatus === 200, severity: 'warn' },
      { aspect: 'Price base rows present (Selling + Net Price)', migrated: `selling=${m.hasSelling}, net=${m.hasNet}`, expected: 'both', ok: m.hasSelling && m.hasNet },
      { aspect: 'Price/Qty selector present', migrated: `price=${m.hasPriceTab}, qty=${m.hasQtyTab}`, expected: 'both', ok: m.hasPriceTab >= 1 && m.hasQtyTab >= 1 },
      { aspect: 'Save button present', migrated: m.hasSave, expected: '>=1', ok: m.hasSave >= 1, severity: 'warn' },
    ];
  },
};
