// TC-ROLE-003 — Edit Role (super admin) — Track B. Self-contained.
// Create a role, edit its Name + Status, save, reload, verify persisted.
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ROLE-003',
  title: 'Edit Role',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/{id}',
  module: 'Admin Settings',
  subModule: 'Roles',
  hints: '- Legacy editRole / saveOrUpdateRole.\n- Migrated: RolePermissionController.roleUpdate().',

  data() { return { name: makeRoleName('ZZ EditRole'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { roleId } = await createMigratedRole(page, base, data.name, data.group);

    const newName = data.name + ' EDITED';
    await page.goto(`${MIG}/admin/roles/${roleId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.fill('#name', newName);
    // Status is relocated to a header toggle by raptech-form.js (the original
    // #status select is hidden; the toggle's checkbox is visually hidden, so click
    // the .status-switch LABEL). .on class = Active. Fall back to the select.
    const sw = page.locator('.status-switch');
    if (await sw.count()) {
      const isOn = await sw.evaluate(el => el.classList.contains('on'));
      if (isOn) await sw.click();   // Active → Inactive
    } else {
      await page.selectOption('#status', '1').catch(() => {});
    }
    shots.editForm = shot('edit-form'); await page.screenshot({ path: shots.editForm, fullPage: true }).catch(() => {});
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /save changes/i }).click(),
    ]);
    await page.waitForTimeout(1500);

    await page.goto(`${MIG}/admin/roles/${roleId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const gotName = await page.inputValue('#name').catch(() => null);
    // #status is hidden (relocated to toggle) → read its value via the DOM
    const gotStatus = await page.evaluate(() => { const s = document.querySelector('#status'); return s ? s.value : null; });
    shots.reloaded = shot('reloaded'); await page.screenshot({ path: shots.reloaded, fullPage: true }).catch(() => {});

    return { roleId, gotName, expectedName: newName, gotStatus, shots };
  },

  check(m) {
    return [
      { aspect: 'Name edit persisted', migrated: m.gotName, expected: m.expectedName, ok: m.gotName === m.expectedName },
      { aspect: 'Status edit persisted (Inactive=1)', migrated: m.gotStatus, expected: '1', ok: m.gotStatus === '1' },
    ];
  },
};
