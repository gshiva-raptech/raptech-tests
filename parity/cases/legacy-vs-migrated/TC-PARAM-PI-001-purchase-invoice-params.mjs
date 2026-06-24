// TC-PARAM-PI-001 — Purchase Invoice org params drive the invoice form (F-0006).
//   22  Reimbursement → #reimbursementChk shown only when on
//   70  TDS Required   → #tdsWhtAmount (TDS-WHT) shown only when on
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const URL = '/purchase-invoices/invoices/new';

export default {
  id: 'TC-PARAM-PI-001',
  title: 'Purchase Invoice org params 22 / 70 drive the invoice form',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Purchase Invoice) → invoice form',
  hints: '- PurchaseInvoicesController.addPiParamFlags: reimbursementEnabled(22) / tdsRequiredEnabled(70).',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const inspect = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(400);
      const ok = !!(r && r.ok()) && !/signin/i.test(up.url());
      const s = await up.evaluate(() => ({
        reimbursement: !!document.querySelector('#reimbursementChk'),
        tdsWht:        !!document.querySelector('#tdsWhtAmount'),
      }));
      return { ok, ...s };
    };
    const toggle = (id, v) => setOrgParam(page, base, ORG, id, v);

    const o22 = await readOrgParamState(page, base, ORG, 22);
    await toggle(22, false); const r22off = await inspect();
    await toggle(22, true);  const r22on  = await inspect();
    await toggle(22, o22 === null ? false : o22);

    const o70 = await readOrgParamState(page, base, ORG, 70);
    await toggle(70, false); const t70off = await inspect();
    await toggle(70, true);  const t70on  = await inspect();
    await toggle(70, o70 === null ? false : o70);

    await uctx.close();
    return {
      accessible: r22off.ok && r22on.ok,
      r22on: r22on.reimbursement, r22off: r22off.reimbursement,
      t70on: t70on.tdsWht, t70off: t70off.tdsWht,
    };
  },

  check(m) {
    if (!m.accessible) return [{ aspect: 'PI new form accessible', migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn' }];
    return [
      { aspect: '22 ON → Reimbursement shown',   migrated: m.r22on,  expected: true,  ok: m.r22on === true },
      { aspect: '22 OFF → Reimbursement hidden',  migrated: m.r22off, expected: false, ok: m.r22off === false },
      { aspect: '70 ON → TDS-WHT shown',          migrated: m.t70on,  expected: true,  ok: m.t70on === true },
      { aspect: '70 OFF → TDS-WHT hidden',        migrated: m.t70off, expected: false, ok: m.t70off === false },
    ];
  },
};
