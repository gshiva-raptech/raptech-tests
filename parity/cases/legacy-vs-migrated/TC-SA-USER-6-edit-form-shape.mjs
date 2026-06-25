// TC-SA-USER-6 — Edit User form: correct shape + NO leaked row actions — UI only.
//
// Legacy parity (editUser.jsp): the Edit User FORM is for editing user fields.
//   - User ID is READ-ONLY (you can't rename a login).
//   - There are NO password fields on edit (password change is a separate Reset
//     Password screen).
//   - A Status (Active/Inactive) control IS present (edit-only).
//   - Reset Password / Assign Report / Assign Views / Delete are GRID ROW actions
//     reached from the list — they are NOT embedded on the edit form itself.
//
// What the USER sees here (migrated): /admin/users/{id} renders the edit form WITH
//   "Reset Password", "Assign Report", "Assign Views" links AND a "Delete User"
//   button in the action bar (form.html lines 78-85 and 631-641). Those belong on
//   the grid row, not the form. Bugs F-0042 (sub-actions) + F-0043 (delete).
//
// UI-ONLY: read field read-only state, presence of password fields, the Status
// section, and scan the FORM screen for the leaked action links / delete button.
export default {
  id: 'TC-SA-USER-6',
  title: 'Edit User form: User ID read-only, no password, Status shown, no leaked row actions',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/{id}',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only. Legacy edit form: User ID read-only, no password fields, Status '
       + 'radio present, NO inline Reset/Assign/Delete. Migrated form.html leaks '
       + 'Reset Password/Assign Report/Assign Views links (F-0042) + a Delete User '
       + 'button (F-0043).',

  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.dismiss().catch(() => {}));   // never actually delete
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // The known super-admin user (id 1) always exists; Edit == this route.
    await page.goto(`${MIG}/admin/users/1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const probe = await page.evaluate(() => {
      const subActions = [...document.querySelectorAll('.form-screen a')]
        .map(a => a.getAttribute('href') || '')
        .filter(h => /reset-password|assign-report|assign-views/.test(h));
      const deleteForms = [...document.querySelectorAll('form')]
        .map(f => f.getAttribute('action') || '').filter(a => /\/delete\b/.test(a));
      const deleteBtns = [...document.querySelectorAll('button')]
        .filter(b => /delete user/i.test(b.textContent || '')).length;
      return {
        userNameReadonly: !!document.querySelector('#userName')?.readOnly,
        hasPasswordField: !!document.querySelector('#newPassword'),
        hasStatusSection: !!document.querySelector('#sec-status'),
        resetLeak:  subActions.some(h => /reset-password/.test(h)),
        reportLeak: subActions.some(h => /assign-report/.test(h)),
        viewsLeak:  subActions.some(h => /assign-views/.test(h)),
        deleteFormCount: deleteForms.length,
        deleteBtnCount: deleteBtns,
      };
    });

    return probe;
  },

  check(m) {
    return [
      { aspect: 'User ID is read-only on Edit', migrated: m.userNameReadonly, expected: true, ok: m.userNameReadonly === true },
      { aspect: 'No password fields on Edit (use Reset Password instead)', migrated: m.hasPasswordField ? 'password field present' : 'none', expected: 'none', ok: m.hasPasswordField === false },
      { aspect: 'Status (Active/Inactive) control present on Edit', migrated: m.hasStatusSection, expected: true, ok: m.hasStatusSection === true },
      { aspect: 'No "Reset Password" link leaked onto the Edit form (F-0042)', migrated: m.resetLeak ? 'leaked' : 'absent', expected: 'absent', ok: m.resetLeak === false },
      { aspect: 'No "Assign Report" link leaked onto the Edit form (F-0042)', migrated: m.reportLeak ? 'leaked' : 'absent', expected: 'absent', ok: m.reportLeak === false },
      { aspect: 'No "Assign Views" link leaked onto the Edit form (F-0042)', migrated: m.viewsLeak ? 'leaked' : 'absent', expected: 'absent', ok: m.viewsLeak === false },
      { aspect: 'No "Delete User" button/form on the Edit form (F-0043)', migrated: `${m.deleteFormCount} form(s), ${m.deleteBtnCount} button(s)`, expected: '0 / 0', ok: m.deleteFormCount === 0 && m.deleteBtnCount === 0 },
    ];
  },
};
