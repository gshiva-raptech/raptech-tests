// TC-PARAM-ACT-PLAN — Planning routing-master org params (org user) via form-diff.
// On /admin/production/routing-master/new:
//   176 Jazz → Estimated Hours read-only · 177 Est-Hours Non-Mandatory → est-hours optional/readonly
//   184 Cycle Time → Set Up / Operation / Wrap Up Time columns shown
// (B234 missed these — they were tested on capacity-planning; the right form is routing-master.)
import { switchOrg, paramFormEffect } from '../../lib/fixtures.mjs';

const ORG = 36;
const URL = '/admin/production/routing-master/new';
const SPECS = [
  { id: 176, name: 'Jazz (est-hours read-only)' },
  { id: 177, name: 'Est-Hours Non-Mandatory' },
  { id: 184, name: 'Cycle Time columns' },
];

export default {
  id: 'TC-PARAM-ACT-PLAN',
  title: 'Planning routing-master params (176/177/184)',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Planning) → routing-master form',
  hints: '- ProductionController.addRoutingParamFlags: jazzEnable(176)/estimatedHoursNonMandatory(177)/cycleTimeEnable(184).',

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
      const r = await paramFormEffect(page, base, ORG, sp.id, up, URL);
      results.push({ ...sp, ...r });
    }
    await uctx.close();
    return { results };
  },

  check(m) {
    return m.results.map(r => ({
      aspect: `Param ${r.id} (${r.name}) changes routing-master form`,
      migrated: !r.accessible ? 'form not accessible' : (r.differs ? 'effect seen' : 'no visible change'),
      expected: 'effect seen',
      ok: r.accessible && r.differs,
      severity: (r.accessible && r.differs) ? undefined : 'warn',
    }));
  },
};
