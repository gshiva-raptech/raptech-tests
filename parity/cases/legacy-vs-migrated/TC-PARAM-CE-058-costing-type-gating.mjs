// TC-PARAM-CE-058 — Cost-Estimate type tabs gated by org params 58 / 59 (F-0006).
// Mirrors legacy MANUFACTURING_TYPE_PARAMETER_ID_MAP:
//   58  Manufacturing      → "Manufacturer Cost Estimates" tab
//   59  Non-Manufacturing  → "Cost Estimates" tab
//   neither configured → fallback shows BOTH (creation never breaks).
// BOQ's tab is never gated. Inspected on the costing grid tab strip (#subtabsNav).
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const URL = '/cost-estimates/boqs';   // always-available costing landing; read its tab strip

export default {
  id: 'TC-PARAM-CE-058',
  title: 'Cost-Estimate tabs gated by 58 (Manufacturing) / 59 (Non-Manufacturing)',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Costing) → cost-estimate type tabs',
  hints: '- CostEstimatesController.buildTabs/costingKindAllowed (params 58/59, package 10); BOQ never gated; all-fallback.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const tabs = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(400);
      const ok = !!(r && r.ok()) && !/signin/i.test(up.url());
      const ids = await up.evaluate(() =>
        Array.from(document.querySelectorAll('#subtabsNav [data-tab]'))
          .map(e => e.getAttribute('data-tab')));
      return { ok, ids };
    };
    const toggle = (id, v) => setOrgParam(page, base, ORG, id, v);
    const has = (a, id) => a.includes(id);

    const o58 = await readOrgParamState(page, base, ORG, 58);
    const o59 = await readOrgParamState(page, base, ORG, 59);

    await toggle(58, false); await toggle(59, true);  const nonMfg = await tabs();
    await toggle(58, true);  await toggle(59, false); const mfg    = await tabs();
    await toggle(58, true);  await toggle(59, true);  const both   = await tabs();
    await toggle(58, false); await toggle(59, false); const none   = await tabs();

    await toggle(58, o58 === null ? false : o58);
    await toggle(59, o59 === null ? false : o59);
    await uctx.close();

    return {
      accessible: nonMfg.ok && mfg.ok && both.ok && none.ok,
      nonMfg_hasCE:  has(nonMfg.ids, 'cost-estimates'),
      nonMfg_hasMfg: has(nonMfg.ids, 'manufacturer-cost-estimates'),
      mfg_hasCE:     has(mfg.ids, 'cost-estimates'),
      mfg_hasMfg:    has(mfg.ids, 'manufacturer-cost-estimates'),
      both_hasCE:    has(both.ids, 'cost-estimates'),
      both_hasMfg:   has(both.ids, 'manufacturer-cost-estimates'),
      none_hasCE:    has(none.ids, 'cost-estimates'),
      none_hasMfg:   has(none.ids, 'manufacturer-cost-estimates'),
      none_hasBoq:   has(none.ids, 'boqs'),
    };
  },

  check(m) {
    if (!m.accessible) return [{ aspect: 'Costing grid accessible', migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn' }];
    return [
      { aspect: '59 only → Cost Estimates shown',        migrated: m.nonMfg_hasCE,  expected: true,  ok: m.nonMfg_hasCE === true },
      { aspect: '59 only → Manufacturer hidden',          migrated: m.nonMfg_hasMfg, expected: false, ok: m.nonMfg_hasMfg === false },
      { aspect: '58 only → Manufacturer shown',           migrated: m.mfg_hasMfg,    expected: true,  ok: m.mfg_hasMfg === true },
      { aspect: '58 only → Cost Estimates hidden',        migrated: m.mfg_hasCE,     expected: false, ok: m.mfg_hasCE === false },
      { aspect: '58+59 → both shown',                     migrated: m.both_hasCE && m.both_hasMfg, expected: true, ok: m.both_hasCE === true && m.both_hasMfg === true },
      { aspect: 'neither → fallback shows both',           migrated: m.none_hasCE && m.none_hasMfg, expected: true, ok: m.none_hasCE === true && m.none_hasMfg === true },
      { aspect: 'BOQ never gated',                        migrated: m.none_hasBoq,   expected: true,  ok: m.none_hasBoq === true },
    ];
  },
};
