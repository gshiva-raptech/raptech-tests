// TC-UIP-23 — User Details page must NOT show a Delete action at the bottom — Track B.
// Manual issue #23: a Delete option is shown at the bottom of the User Details page;
// it should be removed.
//
// EXPECTED: the User Details page has no "Delete User" button / delete form.
// CURRENT (bug): the migrated app serves BOTH the "Edit User" and "User Details"
//   grid row actions from the SAME route (/admin/users/{userId} → viewUser →
//   admin/users/form.html). That template renders a "Delete User" submit button
//   in the action bar (form.html:631-641, th:if="${!isNew and isSuperAdmin}").
//   So Details (== the form page) shows Delete at the bottom action bar.
//
// FAILS now (delete present on /admin/users/{id}, the Details target), GREEN once
//   the delete form is removed from the page. (Same underlying template as #21;
//   tracked separately because the manual issue is reported against the Details
//   action's URL.)
export default {
  id: 'TC-UIP-23',
  title: '#23 User Details page has no Delete action at the bottom',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/{id}',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'Manual UI-parity issue #23. User Details page (= /admin/users/{id}, the '
       + 'same template as Edit) shows a Delete button at the bottom action bar. '
       + 'Root cause: raptech-web/.../templates/admin/users/form.html:631-641. '
       + 'NOTE: migrated app renders Edit and Details from one route/template '
       + '(UserController.viewUser → admin/users/form), so this shares a root cause '
       + 'with #21. Remove the bottom Delete form.',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const userId = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      const rows = r.ok ? await r.json() : [];
      return Array.isArray(rows) && rows.length ? rows[0].userId : null;
    }, `${MIG}/admin/users/rows`);

    // The "User Details" grid action navigates here (same URL as Edit).
    await page.goto(`${MIG}/admin/users/${userId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const probe = await page.evaluate(() => {
      const actionBarDelete = [...document.querySelectorAll('.action-bar form')]
        .filter(f => /\/delete\b/.test(f.getAttribute('action') || ''));
      const anyDeleteForm = [...document.querySelectorAll('form')]
        .filter(f => /\/delete\b/.test(f.getAttribute('action') || ''));
      const deleteButtons = [...document.querySelectorAll('button')]
        .filter(b => /delete user/i.test(b.textContent || ''));
      return {
        actionBarDeleteCount: actionBarDelete.length,
        anyDeleteFormCount: anyDeleteForm.length,
        deleteButtonCount: deleteButtons.length,
      };
    });

    return { userId, ...probe };
  },

  check(m) {
    return [
      { aspect: 'User Details bottom action bar has NO delete form',
        migrated: m.actionBarDeleteCount, expected: 0, ok: m.actionBarDeleteCount === 0 },
      { aspect: 'User Details page has NO "Delete User" button anywhere',
        migrated: m.deleteButtonCount, expected: 0, ok: m.deleteButtonCount === 0 },
    ];
  },
};
