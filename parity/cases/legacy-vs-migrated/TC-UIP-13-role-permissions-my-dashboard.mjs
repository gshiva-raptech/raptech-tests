// TC-UIP-13 — Manual issue #13: Role Permissions cannot be saved via the UI —
// validation "Please select at least one permission for: Tab - My Dashboard",
// and the My Dashboard tab cannot be selected even when clicked.
//
// EXPECTED (asserted here, so it FAILS now = bug reproduced): a super-admin can
// save a role's permissions through the real UI Save button without being blocked
// by a My Dashboard validation error (the success flash appears; no spurious
// "select at least one permission for: Tab - My Dashboard" error).
//
// Root cause: "Tab - My Dashboard" (module 2) and "Menu - My Dashboard" (212) are
// mandatory (modules.is_mandatory='Y'). permissions.html renders mandatory tab
// checkboxes checked+disabled, so they ARE :checked but cannot be unticked. For a
// new role they carry NO permission row → RolePermissionService.toNode leaves
// add/edit/view/export/delete all false. validatePermissions() (permissions.html
// ~L864-878) iterates EVERY checked .perm-tab-cb — including the mandatory,
// disabled My Dashboard tab — and requires >=1 CRUD flag, with no way for the user
// to satisfy it (the tab can't be deselected; legacy auto-grants mandatory
// dashboard modules). So Save is permanently blocked. Suggested fix: skip
// mandatory/disabled tab checkboxes in validatePermissions (and/or default
// mandatory tabs to view=true in collectPermissions / the service tree).
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

function cleanup() {
  try {
    const ids = psql(`SELECT role_id_pk FROM raptech_scm.roles_ WHERE name_ LIKE 'ZZ UIP13Role%';`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length) {
      const list = ids.join(',');
      psql(`DELETE FROM raptech_scm.role_permissions WHERE role_id_fk IN (${list});`);
      psql(`DELETE FROM raptech_scm.roles_ WHERE role_id_pk IN (${list});`);
    }
  } catch (e) { /* best-effort */ }
}

export default {
  id: 'TC-UIP-13',
  title: 'Issue #13 — Role Permissions UI save blocked by mandatory "Tab - My Dashboard"',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/role-permissions',
  module: 'Admin Settings',
  subModule: 'Role Permissions',
  hints: '- Manual issue #13.\n- Mandatory My Dashboard tab (module 2) is checked+disabled with no CRUD flags; validatePermissions() requires >=1 flag on every checked tab → Save blocked, no way to satisfy.\n- Fix: skip mandatory/disabled tabs in validatePermissions (or default mandatory tabs to view granted).',

  data() { return { name: makeRoleName('ZZ UIP13Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    try {
      await forms.loginMigrated(page, base, creds.user, creds.pass);
      const MIG = base.replace(/\/+$/, '');
      const { roleId } = await createMigratedRole(page, base, data.name, data.group);

      await page.goto(`${MIG}/admin/role-permissions`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.selectOption('#roleSelect', String(roleId));
      await page.waitForSelector('#permMatrix .perm-menu-cb', { state: 'attached', timeout: 15000 });
      await page.waitForTimeout(700);

      // Inspect the mandatory My Dashboard tab (module 2): checked + disabled, no CRUD.
      const dash = await page.evaluate(() => {
        const cb = document.querySelector('#tabCb_2');
        const acts = ['add', 'edit', 'view', 'export', 'delete'].map(f => {
          const el = document.querySelector('#' + f + 'Cb_2');
          return el ? { flag: f, checked: el.checked, disabled: el.disabled } : { flag: f, missing: true };
        });
        return cb ? { tabChecked: cb.checked, tabDisabled: cb.disabled, acts } : { missing: true };
      });

      // Drive the REAL UI Save button (the user's path).
      await page.getByRole('button', { name: /save \/ update/i }).click().catch(() => {});
      await page.waitForTimeout(1200);

      const ui = await page.evaluate(() => {
        const err = document.querySelector('#permMainError');
        const flash = document.querySelector('#permMessage');
        return {
          validationError: err ? { text: (err.textContent || '').trim(), visible: err.style.display !== 'none' } : null,
          flash: flash ? { text: (flash.textContent || '').trim(), visible: flash.style.display !== 'none', cls: flash.className } : null,
        };
      });

      shots.matrix = shot('matrix'); await page.screenshot({ path: shots.matrix, fullPage: true }).catch(() => {});
      return { roleId, dash, ui, shots };
    } finally {
      cleanup();
    }
  },

  check(m) {
    const ui = m.ui || {};
    const ve = ui.validationError || {};
    const fl = ui.flash || {};
    const blockedByDashboard = ve.visible === true && /my dashboard/i.test(ve.text || '');
    const savedOk = fl.visible === true && /saved/i.test(fl.text || '') && /success/.test(fl.cls || '');
    return [
      { aspect: 'UI Save not blocked by "Tab - My Dashboard" validation',
        migrated: ve.visible ? `error: "${ve.text}"` : 'no validation error',
        expected: 'no My Dashboard validation block', ok: !blockedByDashboard },
      { aspect: 'UI Save succeeds (success flash shown)',
        migrated: fl.visible ? `flash: "${fl.text}" [${fl.cls}]` : 'no flash',
        expected: 'permissions saved successfully', ok: savedOk },
    ];
  },
};
