// TC-SA-USER-7 — User Details: a READ-ONLY view, distinct from Edit — UI only.
//
// Legacy parity (viewUser.action): "User Details" is a read-only presentation of
// the user — fields are shown for reading, there is no editable input, no "Update"
// submit, no required (*) markers, and no Delete at the bottom. "Edit User" is the
// separate editable screen.
//
// What the USER sees here (migrated): the "User Details" grid action navigates to
// /admin/users/{id} — the SAME route/template as Edit (UserController.viewUser →
// admin/users/form). For a super-admin canEdit is true, so "Details" is fully
// editable: inputs are enabled, there is an "Update" button, required markers show,
// and a "Delete User" button sits at the bottom (F-0043). So Details != a read-only
// view. (Family of F-0004/F-0034: detail pages should be read-only, view!=edit.)
//
// UI-ONLY: read field editability, the action-bar buttons, required markers, and
// the bottom delete button — all from the rendered page.
import { reqMarkerCount } from '../../lib/ui.mjs';

export default {
  id: 'TC-SA-USER-7',
  title: 'User Details is a read-only view (no edit inputs / Update / Delete / req markers)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/{id}',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only. Legacy User Details = read-only. Migrated serves Details from the '
       + 'SAME editable form route as Edit (UserController.viewUser → admin/users/form), '
       + 'so Details is editable with an Update button + Delete + req markers. '
       + 'F-0004/F-0034 family (no mode=view).',

  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // "User Details" grid action target = /admin/users/{id} (same as Edit).
    await page.goto(`${MIG}/admin/users/1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const reqMarkers = await reqMarkerCount(page);
    const probe = await page.evaluate(() => {
      const firstNameEditable = (() => {
        const el = document.querySelector('#firstName');
        if (!el) return null;
        return !el.readOnly && !el.disabled;
      })();
      const actionButtons = [...document.querySelectorAll('.action-bar button, .action-bar a')]
        .map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
      const hasUpdate = actionButtons.some(t => /^update$/i.test(t));
      const hasDelete = [...document.querySelectorAll('button')].some(b => /delete user/i.test(b.textContent || ''));
      return { firstNameEditable, actionButtons, hasUpdate, hasDelete };
    });

    return { reqMarkers, ...probe };
  },

  check(m) {
    return [
      { aspect: 'Detail fields are read-only (First Name not editable)',
        migrated: m.firstNameEditable == null ? '(field absent)' : (m.firstNameEditable ? 'EDITABLE' : 'read-only'),
        expected: 'read-only', ok: m.firstNameEditable === false },
      { aspect: 'No "Update" (save) button on a read-only Details page',
        migrated: m.hasUpdate ? 'Update present' : 'none', expected: 'none', ok: m.hasUpdate === false },
      { aspect: 'No required (*) markers on a read-only Details page',
        migrated: `${m.reqMarkers} markers`, expected: '0', ok: m.reqMarkers === 0 },
      { aspect: 'No "Delete User" button on Details (F-0043)',
        migrated: m.hasDelete ? 'Delete present' : 'none', expected: 'none', ok: m.hasDelete === false },
    ];
  },
};
