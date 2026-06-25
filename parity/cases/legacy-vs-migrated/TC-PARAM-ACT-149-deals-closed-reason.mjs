// TC-PARAM-ACT-149 — Deals Closed Reason (149) JS-reveal action test.
// On the Opportunity form, selecting a "Closed Won/Lost" stage reveals #stageReasonField
// ONLY when param 149 is enabled. Toggle 149 → select a closed stage → assert the field
// is hidden (149 off) vs shown (149 on).
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const ORG = 36;
const URL = '/opportunity/opportunity/new';

export default {
  id: 'TC-PARAM-ACT-149',
  title: 'Deals Closed-Reason (149) reveals field on Closed stage',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Deals) → opportunity form',
  hints: '- OpportunityController stageReasonEnable = countEnabledParameter(149); JS reveals #stageReasonField on Closed Won/Lost.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const revealOnClosedStage = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(500);
      const ok = !!(r && r.ok()) && !/signin/i.test(up.url());
      const closedVal = await up.evaluate(() => {
        const o = [...document.querySelectorAll('#dealStageId option')].find(x => /closed won|closed lost/i.test(x.textContent));
        return o ? o.value : null;
      });
      if (!closedVal) return { ok, closedVal: null, display: null };
      await up.selectOption('#dealStageId', closedVal).catch(() => {});
      await up.waitForTimeout(400);
      const display = await up.evaluate(() => { const f = document.querySelector('#stageReasonField'); return f ? getComputedStyle(f).display : null; });
      return { ok, closedVal, display };
    };

    const orig = await readOrgParamState(page, base, ORG, 149);
    await setOrgParam(page, base, ORG, 149, false); const off = await revealOnClosedStage();
    await setOrgParam(page, base, ORG, 149, true); const on = await revealOnClosedStage();
    await setOrgParam(page, base, ORG, 149, orig === null ? false : orig);
    await uctx.close();

    return { accessible: off.ok && on.ok, hasClosedStage: !!off.closedVal, offDisplay: off.display, onDisplay: on.display };
  },

  check(m) {
    if (!m.accessible) return [{ aspect: '149 closed-reason reveal', migrated: 'opportunity form not accessible', expected: 'effect', ok: false, severity: 'warn' }];
    if (!m.hasClosedStage) return [{ aspect: '149 closed-reason reveal', migrated: 'org has no Closed Won/Lost stage', expected: 'effect', ok: false, severity: 'warn' }];
    return [
      { aspect: '149 OFF → Closed-Reason hidden on closed stage', migrated: m.offDisplay, expected: 'none', ok: m.offDisplay === 'none' },
      { aspect: '149 ON → Closed-Reason shown on closed stage', migrated: m.onDisplay, expected: '≠none', ok: !!m.onDisplay && m.onDisplay !== 'none' },
    ];
  },
};
