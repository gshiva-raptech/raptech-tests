// TC-SA-ROLE-2 — Create Role: duplicate role name must be blocked with a CLEAN
// user-facing message (not a leaked SQL/constraint stack trace).
//
// EXPECTED (legacy addOrEditRole.jsp + validateRoleName): legacy validates the
// role name (case-insensitive, per org, excluding self) via validRoleNameUrl and
// blocks the save with a friendly "role name already exists" message. The user
// never sees a database error.
//
// RESULT: FAILS (confirmed bug). The migrated RolePermissionController.roleCreate()
// has NO duplicate-name check. The DB unique constraint (idx_..._name_ on
// name_,org_id_fk) does block the insert, but the user is shown the RAW exception:
//   "Failed to create role: could not execute statement
//    [ERROR: duplicate key value violates unique constraint "idx_1238548_name_" ...
//     insert into raptech_scm.roles_ ...]"
// i.e. a leaked SQL statement + constraint name. This is a weaker/broken validation
// vs legacy from the user's view.
//
// UI-only: we read the on-screen error banner text after the blocked submit.
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

function cleanup() {
  try {
    const ids = psql(`SELECT role_id_pk FROM raptech_scm.roles_ WHERE name_ LIKE 'ZZ SAR2Role%';`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length) {
      const list = ids.join(',');
      psql(`DELETE FROM raptech_scm.role_permissions WHERE role_id_fk IN (${list});`);
      psql(`DELETE FROM raptech_scm.roles_ WHERE role_id_pk IN (${list});`);
    }
  } catch (e) { /* best-effort */ }
}

export default {
  id: 'TC-SA-ROLE-2',
  title: 'Create Role — duplicate name blocked with a clean message (no SQL leak)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/new',
  module: 'Super Admin',
  subModule: 'Roles',
  hints: '- Legacy validateRoleName(name,id,orgId) = case-insensitive per-org dup guard with friendly message.\n- Migrated roleCreate()/roleUpdate() have NO dup check; relies on DB unique constraint → raw SQL error leaked to user.\n- Fix: add a countDuplicate-style check + return a clean "Role name already exists." message.',

  data() { return { name: makeRoleName('ZZ SAR2Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    try {
      await forms.loginMigrated(page, base, creds.user, creds.pass);
      const MIG = base.replace(/\/+$/, '');

      // First create the role legitimately.
      await createMigratedRole(page, base, data.name, data.group);

      // Now attempt to create a SECOND role with the exact same name.
      await page.goto(`${MIG}/admin/roles/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.selectOption('#roleGroup', data.group).catch(() => {});
      await page.fill('#name', data.name).catch(() => {});
      await Promise.all([
        page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create role/i }).click(),
      ]);
      await page.waitForTimeout(1200);

      const banner = await page.evaluate(() => {
        // error banner rendered by form.html when errorMsg flash is present
        const els = [...document.querySelectorAll('div')]
          .filter(d => d.offsetParent && /fail|error|already|duplicate|exist|could not/i.test(d.textContent || ''));
        els.sort((a, b) => a.textContent.trim().length - b.textContent.trim().length);
        return els.length ? els[0].textContent.trim() : null;
      });
      const blocked = !/roles\/\d+$/.test(page.url()); // stayed on /new (no new id)

      shots.dup = shot('dup');
      await page.screenshot({ path: shots.dup, fullPage: true }).catch(() => {});
      return { banner, blocked, url: page.url(), shots };
    } finally {
      cleanup();
    }
  },

  check(m) {
    const banner = m.banner || '';
    const leakedSql = /could not execute statement|unique constraint|insert into|\[ERROR:/i.test(banner);
    const friendly = /already exists|already exist|duplicate( name)?|name.*exists/i.test(banner) && !leakedSql;
    return [
      { aspect: 'Duplicate name save blocked', migrated: m.blocked ? 'blocked' : 'CREATED DUPLICATE', expected: 'blocked', ok: m.blocked === true },
      { aspect: 'Shows a clean "already exists" message (no SQL leak)', migrated: leakedSql ? 'RAW SQL ERROR LEAKED' : (banner || '(no message)'), expected: 'friendly duplicate-name message', ok: friendly === true, severity: 'medium',
        note: 'Migrated has no app-level dup guard; the DB constraint error is surfaced verbatim to the user. Legacy shows a clean message via validateRoleName.' },
    ];
  },
};
