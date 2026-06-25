// TC-SA-USER-2 — Super-Admin Users grid: row actions (kebab menu) — UI only.
//
// Legacy parity (/admin/viewUser.action): each grid row exposes SIX actions —
// Edit User, User Details, Reset Password, Delete User, Assign Report, Assign
// Views. These belong on the ROW (per-user), reachable from the row's action menu.
//
// What the USER sees here (migrated): the AG-Grid pins a kebab (⋮) per row; the
// menu should list all six. This case opens the first row's kebab and asserts the
// menu items the user reads. (Whether those actions ALSO wrongly leak onto the
// edit/detail FORM is covered by TC-SA-USER-6.)
//
// UI-ONLY: drive the kebab + read the visible menu item labels.
import { gridReady } from '../../lib/ui.mjs';

export default {
  id: 'TC-SA-USER-2',
  title: 'Users grid row menu exposes all six legacy actions (Super Admin)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only. Legacy row actions: Edit User, User Details, Reset Password, '
       + 'Delete User, Assign Report, Assign Views. Migrated GridAction list in '
       + 'UserController.userList(). Confirms the actions exist as ROW actions '
       + '(they should NOT also be on the form — see TC-SA-USER-6).',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    await gridReady(page);

    // Open the first row's kebab in the pinned-right container.
    const idx = await page.evaluate(() => {
      const r = document.querySelector('.ag-center-cols-container .ag-row');
      return r ? r.getAttribute('row-index') : null;
    });
    let menuItems = [];
    if (idx != null) {
      await page.click(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"] button.rap-kebab`).catch(() => {});
      await page.waitForTimeout(400);
      menuItems = await page.evaluate(() =>
        [...document.querySelectorAll('[role=menuitem], .rap-menu a, .rap-menu button, .menu-item')]
          .map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));
    }

    return { idx, menuItems };
  },

  check(m) {
    const want = ['Edit User', 'User Details', 'Reset Password', 'Delete User', 'Assign Report', 'Assign Views'];
    const has = label => m.menuItems.some(t => new RegExp(label, 'i').test(t));
    return [
      { aspect: 'Row kebab menu opens', migrated: m.idx != null ? `row ${m.idx}, ${m.menuItems.length} items` : 'no row',
        expected: 'menu opens with items', ok: m.menuItems.length > 0, severity: 'warn' },
      ...want.map(w => ({
        aspect: `Row menu has "${w}"`,
        migrated: has(w) ? 'present' : `absent (menu: ${JSON.stringify(m.menuItems)})`,
        expected: 'present', ok: has(w),
      })),
    ];
  },
};
