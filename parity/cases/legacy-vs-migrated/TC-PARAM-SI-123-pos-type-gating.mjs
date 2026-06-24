// TC-PARAM-SI-123 — POS invoice type options gated by org params 123 / 124 (F-0006).
//   123  POS - Inventory      → "POS - Inventory" option
//   124  POS - Non-Inventory  → "POS - Non-Inventory" option
//   neither configured → fallback shows ALL (creation never breaks).
// Parallel to the editor's 29/31, on the separate point-of-sale form path.
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const URL = '/sales-invoice/point-of-sale/new';

export default {
  id: 'TC-PARAM-SI-123',
  title: 'POS invoice-type options gated by 123 / 124',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Invoice) → POS form',
  hints: '- SalesInvoiceController.addInvoiceFormLookups(isPos=true): POS_INVOICE_TYPES filtered by 123/124, fallback all.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const opts = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(400);
      const ok = !!(r && r.ok()) && !/signin/i.test(up.url());
      const labels = await up.evaluate(() =>
        Array.from(document.querySelectorAll('#invoiceType option'))
          .filter(o => o.value)
          .map(o => o.textContent.trim()));
      return { ok, labels };
    };
    const toggle = (id, v) => setOrgParam(page, base, ORG, id, v);

    const o123 = await readOrgParamState(page, base, ORG, 123);
    const o124 = await readOrgParamState(page, base, ORG, 124);

    await toggle(123, true);  await toggle(124, false); const invOnly = await opts();
    await toggle(123, true);  await toggle(124, true);  const both    = await opts();
    await toggle(123, false); await toggle(124, false); const none    = await opts();

    await toggle(123, o123 === null ? false : o123);
    await toggle(124, o124 === null ? false : o124);
    await uctx.close();

    return {
      accessible: invOnly.ok && both.ok && none.ok,
      invOnly: invOnly.labels, both: both.labels, none: none.labels,
    };
  },

  check(m) {
    if (!m.accessible) return [{ aspect: 'POS form accessible', migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn' }];
    const has = (a, s) => a.some(x => x.includes(s));
    return [
      { aspect: '123 only → POS-Inventory shown',        migrated: has(m.invOnly, 'POS - Inventory'),     expected: true,  ok: has(m.invOnly, 'POS - Inventory') },
      { aspect: '123 only → POS-Non-Inventory hidden',    migrated: has(m.invOnly, 'Non-Inventory'),       expected: false, ok: !has(m.invOnly, 'Non-Inventory') },
      { aspect: '123+124 → both shown',                   migrated: m.both.length,                         expected: 2,     ok: m.both.length === 2 },
      { aspect: 'neither → fallback shows all',            migrated: m.none.length,                         expected: 2,     ok: m.none.length === 2 },
    ];
  },
};
