// TC-SA-IF-2 — Item Formula "Item Formula By" Price/Qty selector swaps base rows
// (UI-only, real org) — Track B. Manual-tester view: click the on-screen Qty link
// and confirm the base rows the USER sees change (Price → Selling/Net Price;
// Qty → Calculated Qty), the active tab moves, and the URL reflects the type.
// Legacy ref: #type_ Price/Qty selector reloads the matrix.
import { switchOrg } from '../../lib/fixtures.mjs';

const ORG_ID = 36;

export default {
  id: 'TC-SA-IF-2',
  title: 'Item Formula — Price/Qty selector swaps base rows (UI-only)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/item-formula',
  module: 'Admin Settings',
  subModule: 'Item Formula',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await switchOrg(page, base, ORG_ID);

    // Start on Price.
    await page.goto(`${MIG}/admin/item-formula?type=Price`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const priceActive = await page.locator('a.subtab.active', { hasText: 'Price' }).count();
    const priceSelling = await page.locator('tr', { hasText: 'Selling Price' }).count();
    const priceCalcQty = await page.locator('tr', { hasText: 'Calculated Qty' }).count();
    shots.price = shot('price'); await page.screenshot({ path: shots.price, fullPage: true }).catch(() => {});

    // Click the on-screen Qty selector (what the user does).
    await page.getByRole('link', { name: 'Qty', exact: true }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(500);
    const qtyUrl = /type=Qty/i.test(page.url());
    const qtyActive = await page.locator('a.subtab.active', { hasText: 'Qty' }).count();
    const qtyCalcQty = await page.locator('tr', { hasText: 'Calculated Qty' }).count();
    const qtySelling = await page.locator('tr', { hasText: 'Selling Price' }).count();
    shots.qty = shot('qty'); await page.screenshot({ path: shots.qty, fullPage: true }).catch(() => {});

    return { priceActive, priceSelling, priceCalcQty, qtyUrl, qtyActive, qtyCalcQty, qtySelling, shots };
  },

  check(m) {
    return [
      { aspect: 'Price view: active=Price, shows Selling Price (no Calculated Qty)', migrated: `active=${m.priceActive}, selling=${m.priceSelling}, calcQty=${m.priceCalcQty}`, expected: 'active, selling only', ok: m.priceActive >= 1 && m.priceSelling >= 1 && m.priceCalcQty === 0 },
      { aspect: 'Clicking Qty navigates (URL type=Qty)', migrated: m.qtyUrl, expected: true, ok: m.qtyUrl === true },
      { aspect: 'Qty view: active=Qty, shows Calculated Qty (no Selling Price)', migrated: `active=${m.qtyActive}, calcQty=${m.qtyCalcQty}, selling=${m.qtySelling}`, expected: 'active, calcQty only', ok: m.qtyActive >= 1 && m.qtyCalcQty >= 1 && m.qtySelling === 0 },
    ];
  },
};
