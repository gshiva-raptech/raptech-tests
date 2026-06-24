// TC-PARAM-SI-029 — Sales Invoice editor type options gated by org params 29 / 31 (F-0006).
//   29  Non PO - Inventory      → "Non PO - Inventory" option
//   31  Non PO - Non-Inventory  → "Non PO - Non-Inventory" option
//   neither configured → fallback shows ALL (creation never breaks).
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const URL = '/sales-invoice/sales-invoices/new';

export default {
  id: 'TC-PARAM-SI-029',
  title: 'Sales Invoice editor invoice-type options gated by 29 / 31',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Invoice) → invoice editor',
  hints: '- SalesInvoiceController.addInvoiceFormLookups: INVOICE_TYPES filtered by enabled 29/31, fallback all.',

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

    const o29 = await readOrgParamState(page, base, ORG, 29);
    const o31 = await readOrgParamState(page, base, ORG, 31);

    await toggle(29, true);  await toggle(31, false); const invOnly = await opts();
    await toggle(29, true);  await toggle(31, true);  const both    = await opts();
    await toggle(29, false); await toggle(31, false); const none    = await opts();

    await toggle(29, o29 === null ? false : o29);
    await toggle(31, o31 === null ? false : o31);
    await uctx.close();

    return {
      accessible: invOnly.ok && both.ok && none.ok,
      invOnly: invOnly.labels, both: both.labels, none: none.labels,
    };
  },

  check(m) {
    if (!m.accessible) return [{ aspect: 'SI editor accessible', migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn' }];
    const has = (a, s) => a.some(x => x.includes(s));
    return [
      { aspect: '29 only → Inventory shown',         migrated: has(m.invOnly, 'Inventory'),      expected: true,  ok: has(m.invOnly, 'Inventory') },
      { aspect: '29 only → Non-Inventory hidden',     migrated: has(m.invOnly, 'Non-Inventory'),  expected: false, ok: !has(m.invOnly, 'Non-Inventory') },
      { aspect: '29+31 → both shown',                 migrated: m.both.length,                    expected: 2,     ok: m.both.length === 2 },
      { aspect: 'neither → fallback shows all',        migrated: m.none.length,                    expected: 2,     ok: m.none.length === 2 },
    ];
  },
};
