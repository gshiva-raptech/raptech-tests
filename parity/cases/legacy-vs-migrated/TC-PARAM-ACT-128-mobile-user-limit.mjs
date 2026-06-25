// TC-PARAM-ACT-128 — Mobile User Limit (128) enforcement action test.
// Set 128 enabled with limit value 0 (so any mobile-access create is blocked), then
// POST a Mobile user as shekar_N → expect "Mobile user limit" error. With 128 OFF →
// that error must be absent. (Sibling 102 total-user-limit is NOT enforced — F-0009.)
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const ORG = 36;

export default {
  id: 'TC-PARAM-ACT-128',
  title: 'Mobile User Limit (128) blocks mobile-access user create',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Users) → user create',
  hints: '- UserServiceImpl.enforceMobileUserLimit reads value(128); blocks when mobile count >= limit.',

  data() { const stamp = Date.now().toString().slice(-7); return { stamp }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const postMobileUser = async (uname) => {
      await up.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(500);
      const csrf = await up.evaluate(() => document.querySelector('input[name="_csrf"]')?.value || '');
      return up.evaluate(async ({ MIG, uname, csrf }) => {
        const p = new URLSearchParams();
        p.set('userName', uname); p.set('newPassword', 'Welcome@123'); p.set('confirmPassword', 'Welcome@123');
        p.set('userAccess', 'Mobile'); p.set('userType', 'Office'); p.set('entityIds', '34'); p.set('_csrf', csrf);
        const r = await fetch(`${MIG}/admin/users/new`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString(), redirect: 'follow' });
        const t = await r.text();
        const m = t.match(/Mobile user limit[^<"]{0,60}/i);
        return { limitMsg: m ? m[0].trim() : null };
      }, { MIG, uname, csrf });
    };

    const orig = await readOrgParamState(page, base, ORG, 128);
    // 128 ON with limit 0 (deterministic block)
    await setOrgParam(page, base, ORG, 128, true);
    psql(`UPDATE raptech_scm.org_conditional_parameters SET value_='0' WHERE parameter_id_fk=128 AND org_package_id_fk IN (SELECT org_package_id_pk FROM raptech_scm.org_conditional_packages WHERE org_id_fk=${ORG});`);
    const onName = `zzlim_on_${data.stamp}`; const on = await postMobileUser(onName);

    // 128 OFF
    await setOrgParam(page, base, ORG, 128, false);
    const offName = `zzlim_off_${data.stamp}`; const off = await postMobileUser(offName);

    await setOrgParam(page, base, ORG, 128, orig === null ? false : orig);
    // cleanup any users that did get created (off case may proceed to create)
    try {
      psql(`DELETE FROM raptech_scm.org_user_mapping WHERE user_id_fk IN (SELECT user_id_pk FROM raptech_scm.users WHERE username IN ('${onName}','${offName}'));`);
      psql(`DELETE FROM raptech_scm.users WHERE username IN ('${onName}','${offName}');`);
    } catch (e) { /* leave */ }
    await uctx.close();

    return { onLimitMsg: on.limitMsg, offLimitMsg: off.limitMsg };
  },

  check(m) {
    return [
      { aspect: '128 ON → mobile user blocked (limit error)', migrated: m.onLimitMsg || '(no limit error)', expected: 'Mobile user limit…', ok: !!m.onLimitMsg },
      { aspect: '128 OFF → no limit error', migrated: m.offLimitMsg || '(none)', expected: '(none)', ok: !m.offLimitMsg },
    ];
  },
};
