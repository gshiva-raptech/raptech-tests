// TC-PARAM-SI-138 — Sales Invoice Qty Editable (org param 138) (F-0006).
// The line-grid JS is an IIFE (addRow/QTY_EDITABLE are not on window), so we verify the
// server→template binding: the injected `QTY_EDITABLE` flag must flip with param 138.
//   138 OFF → var QTY_EDITABLE = false  (cellInput then locks dcItemId/poItemId rows)
//   138 ON  → var QTY_EDITABLE = true   (all rows editable)
// The readonly application itself is a static template expression
// (!QTY_EDITABLE && (it.dcItemId || it.poItemId)) covered by review.
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const URL = '/sales-invoice/sales-invoices/new';

export default {
  id: 'TC-PARAM-SI-138',
  title: 'Sales Invoice Qty Editable (138) locks sourced-row qty when off',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Invoice) → invoice line qty editability',
  hints: '- SalesInvoiceController model attr qtyEditable (param 138); invoice-form.html QTY_EDITABLE + cellInput readonly on dcItemId/poItemId rows.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const probe = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(300);
      const ok = !!(r && r.ok()) && !/signin/i.test(up.url());
      const html = ok ? await up.content() : '';
      const mTrue  = /QTY_EDITABLE\s*=\s*true/.test(html);
      const mFalse = /QTY_EDITABLE\s*=\s*false/.test(html);
      return { ok, flag: mTrue ? true : (mFalse ? false : null) };
    };
    const toggle = (id, v) => setOrgParam(page, base, ORG, id, v);

    const o138 = await readOrgParamState(page, base, ORG, 138);
    await toggle(138, false); const off = await probe();
    await toggle(138, true);  const on  = await probe();
    await toggle(138, o138 === null ? false : o138);
    await uctx.close();

    return { accessible: off.ok && on.ok, offFlag: off.flag, onFlag: on.flag };
  },

  check(m) {
    if (!m.accessible) return [{ aspect: 'SI editor accessible', migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn' }];
    return [
      { aspect: '138 OFF → QTY_EDITABLE injected false', migrated: m.offFlag, expected: false, ok: m.offFlag === false },
      { aspect: '138 ON → QTY_EDITABLE injected true',    migrated: m.onFlag,  expected: true,  ok: m.onFlag === true },
    ];
  },
};
