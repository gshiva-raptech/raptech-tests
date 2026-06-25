// TC-ROLE-001 — Create Role (super admin) — Track B. Self-contained.
// Create a role (name + Group), verify it persists, appears in the grid, and a new
// role defaults to Active (legacy convention: status 0 = Active).
import { makeRoleName, createMigratedRole, fetchRoleRows } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ROLE-001',
  title: 'Create Role',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/new',
  module: 'Admin Settings',
  subModule: 'Roles',
  hints: '- Legacy saveOrUpdateRole: name + Group required; new role Active.\n- Migrated: RolePermissionController.roleCreate().',

  data() { return { name: makeRoleName('ZZ Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { roleId } = await createMigratedRole(page, base, data.name, data.group);

    const rows = await fetchRoleRows(page, base);
    const inGrid = rows ? rows.some(r => r.name === data.name) : null;

    // default status on the edit form (#status: 0=Active, 1=Inactive)
    await page.goto(`${MIG}/admin/roles/${roleId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const statusLabel = await page.evaluate(() => {
      const s = document.querySelector('#status'); if (!s) return null;
      const o = s.options[s.selectedIndex]; return o ? o.textContent.trim() : null;
    });
    const gotGroup = await page.inputValue('#roleGroup').catch(() => null);
    shots.detail = shot('detail'); await page.screenshot({ path: shots.detail, fullPage: true }).catch(() => {});

    return { roleId, name: data.name, inGrid, statusLabel, gotGroup, expectedGroup: data.group, shots };
  },

  check(m) {
    return [
      { aspect: 'Role created', migrated: m.roleId ? `id ${m.roleId}` : 'none', expected: 'created', ok: !!m.roleId },
      { aspect: 'Role appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Group persisted', migrated: m.gotGroup, expected: m.expectedGroup, ok: m.gotGroup === m.expectedGroup, severity: 'warn' },
      { aspect: 'New role default status Active', migrated: m.statusLabel, expected: 'Active', ok: m.statusLabel === 'Active' },
    ];
  },
};
