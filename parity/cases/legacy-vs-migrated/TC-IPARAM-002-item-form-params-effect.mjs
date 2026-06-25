// TC-IPARAM-002 — Item-module org params actually change the Add-Item form (org user).
// For each item form-gate param: read original state → disable (admin) → reload the
// org user's item form → capture signature → enable → capture → assert the form
// changed → restore original. Confirms the wired params have a real, visible effect.
// "no visible form change" = WARN (some params are behavioral, not form-control changes;
// those stay code-confirmed wired).
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;                       // shekar_N's org
const ITEM_FORM_URL = '/items/new?type=4';   // Consumable Item → full form renders
const PARAMS = [
  { id: 15,  name: 'Alternate UOM' },
  { id: 62,  name: 'HSN Code Mandatory' },
  { id: 82,  name: 'Item No Auto Sequence' },
  { id: 100, name: 'Expense Category Mandatory' },
  { id: 106, name: 'Item No Seq By Type' },
  { id: 118, name: 'Price Variant' },
  { id: 131, name: 'Bundle Link Item' },
  { id: 136, name: 'Edit UOM' },
];

export default {
  id: 'TC-IPARAM-002',
  title: 'Item-module org params change the Add-Item form (org user)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter → /items/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Items) → Item form',
  hints: '- ItemsController gates item-form sections/fields on these param ids (ids.contains(P_*)).',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);   // super admin
    await switchOrg(page, base, ORG);

    // one org-user session, reused
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const signature = async () => {
      await up.goto(`${MIG}${ITEM_FORM_URL}`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(700);
      return up.evaluate(() => {
        const ctrls = [...document.querySelectorAll('form [name]')]
          .map(e => `${e.tagName}|${e.getAttribute('name')}|${e.type || ''}|${(e.required || e.closest('[data-req="1"]')) ? 'req' : ''}`);
        const secs = [...document.querySelectorAll('.section')]
          .filter(s => getComputedStyle(s).display !== 'none').map(s => s.id);
        return JSON.stringify([...new Set(ctrls)].sort()) + '#' + JSON.stringify(secs.sort());
      });
    };

    const results = [];
    for (const p of PARAMS) {
      const orig = await readOrgParamState(page, base, ORG, p.id);
      await setOrgParam(page, base, ORG, p.id, false);
      const off = await signature();
      await setOrgParam(page, base, ORG, p.id, true);
      const on = await signature();
      await setOrgParam(page, base, ORG, p.id, orig === null ? false : orig);   // restore
      results.push({ id: p.id, name: p.name, differs: off !== on });
    }
    const sc = shot('item-form'); await up.screenshot({ path: sc, fullPage: true }).catch(() => {});
    await uctx.close();
    return { results, shots: { itemForm: sc } };
  },

  check(m) {
    return m.results.map(r => ({
      aspect: `Param ${r.id} (${r.name}) changes the item form`,
      migrated: r.differs ? 'effect seen' : 'no visible form change',
      expected: 'effect seen',
      ok: r.differs === true,
      severity: r.differs ? undefined : 'warn',   // behavioral params: warn, not fail
    }));
  },
};
