// TC-ROLE-004 — Delete Role (super admin, via edit-form Delete button) — Track B.
// Create a role, delete it, verify it's gone from the roles grid.
import { makeRoleName, createMigratedRole, fetchRoleRows } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ROLE-004',
  title: 'Delete Role',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/{id}/delete',
  module: 'Admin Settings',
  subModule: 'Roles',
  hints: '- Legacy deleteRole (soft delete).\n- Migrated: RolePermissionController.roleDelete() (delFlag=Y).',

  data() { return { name: makeRoleName('ZZ DelRole'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { roleId } = await createMigratedRole(page, base, data.name, data.group);

    const before = await fetchRoleRows(page, base);
    const presentBefore = before ? before.some(r => String(r.roleId) === String(roleId)) : null;

    await page.goto(`${MIG}/admin/roles/${roleId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /^delete$/i }).click(),
    ]);
    await page.waitForTimeout(1500);
    const afterUrl = page.url();
    shots.after = shot('after'); await page.screenshot({ path: shots.after, fullPage: true }).catch(() => {});

    const after = await fetchRoleRows(page, base);
    const presentAfter = after ? after.some(r => String(r.roleId) === String(roleId)) : null;

    return { roleId, presentBefore, presentAfter, redirectedToList: /\/admin\/roles(\?|$)/.test(afterUrl), shots };
  },

  check(m) {
    return [
      { aspect: 'Role existed before delete', migrated: m.presentBefore, expected: true, ok: m.presentBefore === true, severity: 'warn' },
      { aspect: 'Delete redirected to roles list', migrated: m.redirectedToList, expected: true, ok: m.redirectedToList === true, severity: 'warn' },
      { aspect: 'Role removed from grid', migrated: m.presentAfter === false ? 'absent' : 'present', expected: 'absent', ok: m.presentAfter === false },
    ];
  },
};
