// TC-SA-IF-1 — Item Formula page renders for a REAL existing org (UI-only) — Track B.
// Manual-tester view: switch into a real org (36 = Zoom Inc, which has item-template
// attributes + the base rows) like picking it in the top switcher, open the Price
// matrix, and confirm what the USER sees: the org context, the Price/Qty selector,
// the matrix columns, the base rows, and the Save button. No fixture org created.
// Legacy ref: createOrEditItemFormula.jsp + itemFormulaPriceTable.jsp.
import { switchOrg } from '../../lib/fixtures.mjs';

const ORG_ID = 36;

export default {
  id: 'TC-SA-IF-1',
  title: 'Item Formula — page renders (real org, UI-only)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/item-formula',
  module: 'Admin Settings',
  subModule: 'Item Formula',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const switchStatus = await switchOrg(page, base, ORG_ID);

    await page.goto(`${MIG}/admin/item-formula?type=Price`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const orgName = await page.evaluate(() => {
      const sp = [...document.querySelectorAll('span')].find(s => /Organization:/i.test(s.textContent));
      return sp ? (sp.nextElementSibling?.textContent || '').trim() : null;
    });
    const cols = await page.$$eval('form table thead th', th => th.map(e => e.textContent.trim()));
    const hasSelling = await page.locator('tr', { hasText: 'Selling Price' }).count();
    const hasNet = await page.locator('tr', { hasText: 'Net Price' }).count();
    const hasPriceTab = await page.getByRole('link', { name: 'Price', exact: true }).count();
    const hasQtyTab = await page.getByRole('link', { name: 'Qty', exact: true }).count();
    const hasSave = await page.getByRole('button', { name: /save \/ update/i }).count();
    shots.page = shot('page'); await page.screenshot({ path: shots.page, fullPage: true }).catch(() => {});

    return { switchStatus, orgName, cols, hasSelling, hasNet, hasPriceTab, hasQtyTab, hasSave, shots };
  },

  check(m) {
    const wantCols = ['Costing', 'Quotation', 'Sales Order', 'Purchase Order'];
    const colsOk = wantCols.every(w => m.cols.some(c => c.includes(w)));
    return [
      { aspect: 'Switched to real org 36', migrated: m.switchStatus, expected: 200, ok: m.switchStatus === 200, severity: 'warn' },
      { aspect: 'Org context shown to user', migrated: m.orgName, expected: 'non-empty', ok: !!m.orgName },
      { aspect: 'Matrix columns (Costing/Quotation/SO/PO) present', migrated: m.cols.join(' | '), expected: wantCols.join(', '), ok: colsOk },
      { aspect: 'Price base rows present (Selling + Net Price)', migrated: `selling=${m.hasSelling}, net=${m.hasNet}`, expected: 'both', ok: m.hasSelling >= 1 && m.hasNet >= 1 },
      { aspect: 'Price/Qty selector present', migrated: `price=${m.hasPriceTab}, qty=${m.hasQtyTab}`, expected: 'both', ok: m.hasPriceTab >= 1 && m.hasQtyTab >= 1 },
      { aspect: 'Save button present', migrated: m.hasSave, expected: '>=1', ok: m.hasSave >= 1 },
    ];
  },
};
