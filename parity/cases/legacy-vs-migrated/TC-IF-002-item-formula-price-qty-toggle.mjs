// TC-IF-002 — Item Formula Price/Qty selector (super admin) — Track B.
// The "Item Formula By" selector switches the base rows: Price → Selling/Net Price;
// Qty → Calculated Qty. Verify each type shows the right base rows.
import { makeOrgData, createMigratedOrg, switchOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-IF-002',
  title: 'Item Formula — Price/Qty selector',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/item-formula',
  module: 'Admin Settings',
  subModule: 'Item Formula',
  hints: '- Legacy #type_ Price/Qty selector swaps base rows.\n- Migrated: AdminMiscController.itemFormulaMatrix(type).',

  data() { return makeOrgData('ZZ IFtoggle Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);
    await switchOrg(page, base, orgId);

    await page.goto(`${MIG}/admin/item-formula?type=Price`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const priceText = await page.evaluate(() => document.body.innerText);
    shots.price = shot('price'); await page.screenshot({ path: shots.price, fullPage: true }).catch(() => {});

    await page.goto(`${MIG}/admin/item-formula?type=Qty`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const qtyText = await page.evaluate(() => document.body.innerText);
    shots.qty = shot('qty'); await page.screenshot({ path: shots.qty, fullPage: true }).catch(() => {});

    return {
      orgId,
      priceHasSelling: /Selling Price/i.test(priceText),
      priceHasCalcQty: /Calculated Qty/i.test(priceText),
      qtyHasCalcQty: /Calculated Qty/i.test(qtyText),
      qtyHasSelling: /Selling Price/i.test(qtyText),
      shots,
    };
  },

  check(m) {
    return [
      { aspect: 'Price type shows Selling Price (not Calculated Qty)', migrated: `selling=${m.priceHasSelling}, calcQty=${m.priceHasCalcQty}`,
        expected: 'selling only', ok: m.priceHasSelling === true && m.priceHasCalcQty === false },
      { aspect: 'Qty type shows Calculated Qty (not Selling Price)', migrated: `calcQty=${m.qtyHasCalcQty}, selling=${m.qtyHasSelling}`,
        expected: 'calcQty only', ok: m.qtyHasCalcQty === true && m.qtyHasSelling === false },
    ];
  },
};
