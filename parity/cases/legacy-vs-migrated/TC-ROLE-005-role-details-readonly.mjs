// TC-ROLE-005 — Role Details (read-only view) — Track B. Self-contained.
// Legacy "Role Details" (detailRole) is read-only. Migrated grid action
// "Role Details" → /admin/roles/{id}?mode=view should likewise be read-only.
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ROLE-005',
  title: 'Role Details (read-only view)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/{id}?mode=view',
  module: 'Admin Settings',
  subModule: 'Roles',
  hints: '- Legacy detailRole is read-only.\n- Migrated: RolePermissionController.roleEditForm() ignores the mode param → form is always editable (likely the gap).',

  data() { return { name: makeRoleName('ZZ ViewRole'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { roleId } = await createMigratedRole(page, base, data.name, data.group);

    await page.goto(`${MIG}/admin/roles/${roleId}?mode=view`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const nameReadonly = await page.evaluate(() => { const el = document.querySelector('#name'); return el ? (el.readOnly || el.disabled) : null; });
    const hasSave = await page.getByRole('button', { name: /save changes/i }).count();
    shots.view = shot('view'); await page.screenshot({ path: shots.view, fullPage: true }).catch(() => {});

    return { roleId, nameReadonly, hasSave, shots };
  },

  check(m) {
    return [
      { aspect: 'Role Details is read-only (no Save)', migrated: m.hasSave === 0 ? 'no save' : 'has save', expected: 'no save', ok: m.hasSave === 0 },
      { aspect: 'Name field read-only in Details', migrated: m.nameReadonly, expected: true, ok: m.nameReadonly === true },
    ];
  },
};
