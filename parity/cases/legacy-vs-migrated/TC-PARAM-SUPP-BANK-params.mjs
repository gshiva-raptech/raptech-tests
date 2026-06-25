// TC-PARAM-SUPP-BANK — Supplier + Bank org params change their org-user forms.
// 88 Supplier-ID auto-gen → supplier-id field readonly/not-required.
// 86 Multi-entity Accounting → bank/account form entity selection changes.
import { switchOrg, paramFormEffect } from '../../lib/fixtures.mjs';

const ORG = 36;
const SPECS = [
  { id: 88, name: 'Supplier ID auto-gen',      url: '/suppliers/suppliers/new' },
  { id: 86, name: 'Multi-entity Accounting',   url: '/admin/banks/banks/new' },
];

export default {
  id: 'TC-PARAM-SUPP-BANK',
  title: 'Supplier + Bank org params change their forms (org user)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter → supplier/bank forms',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Suppliers, Banks)',
  hints: '- SuppliersController param 88 → vendorIdAutoGen; BanksController param 86 → multipleEntityWithAccount.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const results = [];
    for (const sp of SPECS) {
      const r = await paramFormEffect(page, base, ORG, sp.id, up, sp.url);
      results.push({ ...sp, ...r });
    }
    await uctx.close();
    return { results };
  },

  check(m) {
    return m.results.map(r => ({
      aspect: `Param ${r.id} (${r.name}) changes its form`,
      migrated: !r.accessible ? 'form not accessible to org user' : (r.differs ? 'effect seen' : 'no visible change'),
      expected: 'effect seen',
      ok: r.accessible && r.differs,
      severity: (r.accessible && r.differs) ? undefined : 'warn',
    }));
  },
};
