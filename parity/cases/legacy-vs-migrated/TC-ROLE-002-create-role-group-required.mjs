// TC-ROLE-002 — Create Role: Group required (negative) — Track B.
// Fill Name but omit Group; bypass client validation so the request reaches the
// server, which must reject ("Group is required.") and not create the role.
import { makeRoleName, fetchRoleRows } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ROLE-002',
  title: 'Create Role — Group required',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/new',
  module: 'Admin Settings',
  subModule: 'Roles',
  hints: '- Legacy saveOrUpdateRole rejects blank Group.\n- Migrated: RolePermissionController.roleCreate() checks roleGroup.',

  data() { return { name: makeRoleName('ZZ RoleNoGrp') }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/roles/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.fill('#name', data.name);
    // leave Group empty; bypass client RaptechForm.trySubmit by submitting the form directly
    await page.evaluate(() => { document.querySelector('form[data-raptech-form]').submit(); });
    await page.waitForTimeout(1500);
    const afterUrl = page.url();
    const errText = await page.evaluate(() => {
      const m = document.body.innerText.match(/Group is required[^.]*\.?|Failed to create/i); return m ? m[0].trim() : null;
    });
    shots.after = shot('after'); await page.screenshot({ path: shots.after, fullPage: true }).catch(() => {});
    const rows = await fetchRoleRows(page, base);
    const created = rows ? rows.some(r => r.name === data.name) : null;
    return { afterUrl, errText, created, blockedOnNew: /\/admin\/roles\/new/.test(afterUrl), shots };
  },

  check(m) {
    return [
      { aspect: 'Create blocked (stayed on New)', migrated: m.blockedOnNew ? 'blocked' : 'created', expected: 'blocked',
        ok: m.blockedOnNew === true && m.created === false },
      { aspect: 'Role NOT created', migrated: m.created === false ? 'absent' : 'present', expected: 'absent', ok: m.created === false },
      { aspect: '"Group is required" message', migrated: m.errText || '(none)', expected: 'Group is required', ok: /group is required/i.test(m.errText || ''), severity: 'warn' },
    ];
  },
};
