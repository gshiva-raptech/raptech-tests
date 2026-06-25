// TC-RPERM-000 — Role Permissions page loads (super admin tab) — Track B.
// Verify the role selector is populated and the matrix stays hidden until a role
// is chosen (info box shown).
export default {
  id: 'TC-RPERM-000',
  title: 'Role Permissions page loads',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/role-permissions',
  module: 'Admin Settings',
  subModule: 'Role Permissions',
  hints: '- Legacy: roleResource / role permission screen.\n- Migrated: RolePermissionController.rolePermissionsForm() + admin/roles/permissions.html.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/role-permissions`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const roleOptionCount = await page.$$eval('#roleSelect option', os => os.filter(o => o.value && o.value !== '0').length);
    const infoVisible = await page.evaluate(() => { const el = document.querySelector('#permInfoBox'); return el ? getComputedStyle(el).display !== 'none' : null; });
    const matrixHidden = await page.evaluate(() => { const el = document.querySelector('#permMatrix'); return el ? getComputedStyle(el).display === 'none' : null; });
    shots.page = shot('page'); await page.screenshot({ path: shots.page, fullPage: true }).catch(() => {});
    return { roleOptionCount, infoVisible, matrixHidden, shots };
  },

  check(m) {
    return [
      { aspect: 'Role selector populated', migrated: m.roleOptionCount, expected: '>=1', ok: (m.roleOptionCount || 0) >= 1 },
      { aspect: 'Info box shown before role selected', migrated: m.infoVisible, expected: true, ok: m.infoVisible === true, severity: 'warn' },
      { aspect: 'Matrix hidden until role selected', migrated: m.matrixHidden, expected: true, ok: m.matrixHidden === true, severity: 'warn' },
    ];
  },
};
