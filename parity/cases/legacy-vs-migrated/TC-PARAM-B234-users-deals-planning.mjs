// TC-PARAM-B234 — Batches 2-4 observable params (org user).
// Form-diff (paramFormEffect) for params that gate named form controls/sections:
//   167 Skill Level (capacity-planning: skill-level field hidden when on)
//   176 Jazz (estimated-hours read-only)   177 Est-Hours Non-Mandatory (req flips)
//   10002 Paybook (user form Emp-ID field; admin form — may be access-gated)
// Specific check for 150 Deals URL column (th:if dealUrlEnable on the attachments table).
// Pure-behavioral params (102/128 limits, 77 deal workflow, 149 stage-reason JS,
// 184/10027 scheduler, 10021 numbering) are code-confirmed; not form-observable.
import { switchOrg, paramFormEffect } from '../../lib/fixtures.mjs';
import { setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const CAP = '/admin/production/capacity-planning/new';
const SPECS = [
  { id: 167, name: 'Skill Level Not Required', url: CAP },
  { id: 176, name: 'Jazz (est-hours read-only)', url: CAP },
  { id: 177, name: 'Est-Hours Non-Mandatory', url: CAP },
  { id: 10002, name: 'Paybook (user Emp-ID)', url: '/admin/users/new' },
];

export default {
  id: 'TC-PARAM-B234',
  title: 'Users/Deals/Planning observable params (org user)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter → planning / users / opportunity',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Planning, Users, Deals)',
  hints: '- 167/176/177 ProductionController capacity-planning form; 10002 UserController user form; 150 OpportunityController dealUrlEnable.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const results = [];
    for (const sp of SPECS) {
      const r = await paramFormEffect(page, base, ORG, sp.id, up, sp.url);
      results.push({ ...sp, accessible: r.accessible, differs: r.differs });
    }

    // 150 Deals URL column (specific: th/td gated by dealUrlEnable in attachments)
    const urlColCount = async () => {
      const r = await up.goto(`${MIG}/opportunity/opportunity/new`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(500);
      const ok = !!(r && r.ok()) && !/signin/i.test(up.url());
      const cols = await up.evaluate(() => [...document.querySelectorAll('th')].filter(t => /^url$/i.test(t.textContent.trim())).length);
      return { ok, cols };
    };
    const orig150 = await readOrgParamState(page, base, ORG, 150);
    await setOrgParam(page, base, ORG, 150, false); const u150off = await urlColCount();
    await setOrgParam(page, base, ORG, 150, true); const u150on = await urlColCount();
    await setOrgParam(page, base, ORG, 150, orig150 === null ? false : orig150);

    await uctx.close();
    return { results, deals150: { accessible: u150off.ok && u150on.ok, off: u150off.cols, on: u150on.cols } };
  },

  check(m) {
    const rows = m.results.map(r => ({
      aspect: `Param ${r.id} (${r.name}) effect`,
      migrated: !r.accessible ? 'form not accessible' : (r.differs ? 'effect seen' : 'no visible change'),
      expected: 'effect seen',
      ok: r.accessible && r.differs,
      severity: (r.accessible && r.differs) ? undefined : 'warn',
    }));
    const d = m.deals150;
    rows.push({
      aspect: 'Param 150 (Deals URL column) effect',
      migrated: !d.accessible ? 'form not accessible' : `urlCols off=${d.off}, on=${d.on}`,
      expected: 'URL column appears when on',
      ok: d.accessible && d.on > d.off,
      severity: (d.accessible && d.on > d.off) ? undefined : 'warn',
    });
    return rows;
  },
};
