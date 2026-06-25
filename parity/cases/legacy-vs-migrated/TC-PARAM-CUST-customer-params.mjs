// TC-PARAM-CUST — Customer-module org params change the customer form (org user).
// 87 Customer-ID auto-gen → Customer-Id field becomes readonly + not-required.
// (147 Customer Approval is behavioral — created-customer status — covered separately.)
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const SPECS = [
  { id: 87, name: 'Customer ID auto-gen', url: '/customers/customers/new' },
];

export default {
  id: 'TC-PARAM-CUST',
  title: 'Customer org params change the customer form (org user)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter → /customers/customers/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Customers)',
  hints: '- CustomerController reads param 87 → model customerIdAutoGen → Customer-Id field readonly/not-required.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);

    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const sig = async (url) => {
      const r = await up.goto(`${MIG}${url}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(600);
      const ok = !!(r && r.ok()) && !/signin/i.test(up.url());
      const s = await up.evaluate(() => {
        const c = [...document.querySelectorAll('form [name]')].map(e =>
          `${e.tagName}|${e.getAttribute('name')}|${e.type || ''}|${(e.readOnly || e.disabled) ? 'ro' : ''}|${(e.required || e.closest('[data-req="1"]')) ? 'req' : ''}`);
        return JSON.stringify([...new Set(c)].sort());
      });
      return { ok, s };
    };

    const results = [];
    for (const sp of SPECS) {
      const orig = await readOrgParamState(page, base, ORG, sp.id);
      await setOrgParam(page, base, ORG, sp.id, false); const off = await sig(sp.url);
      await setOrgParam(page, base, ORG, sp.id, true); const on = await sig(sp.url);
      await setOrgParam(page, base, ORG, sp.id, orig === null ? false : orig);
      results.push({ id: sp.id, name: sp.name, accessible: off.ok && on.ok, differs: off.s !== on.s });
    }
    const sc = shot('customer-form'); await up.screenshot({ path: sc, fullPage: true }).catch(() => {});
    await uctx.close();
    return { results, shots: { form: sc } };
  },

  check(m) {
    return m.results.map(r => ({
      aspect: `Param ${r.id} (${r.name}) changes the customer form`,
      migrated: !r.accessible ? 'form not accessible to org user' : (r.differs ? 'effect seen' : 'no visible change'),
      expected: 'effect seen',
      ok: r.accessible && r.differs,
      severity: (r.accessible && r.differs) ? undefined : 'warn',
    }));
  },
};
