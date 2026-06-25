// TC-UIP-21 — Edit User page must NOT show a Delete action — Track B.
// Manual issue #21: a Delete option is shown on the Edit User page; it should be
// removed (Delete is a grid ROW action, not a form action).
//
// EXPECTED: the Edit User form has no "Delete User" button / delete form.
// CURRENT (bug): admin/users/form.html lines 631-641 render a "Delete User"
//   submit button (separate form posting /admin/users/{id}/delete) in the action
//   bar via th:if="${!isNew and isSuperAdmin}".
//
// FAILS now (delete present), GREEN once the delete form is removed from the page.
export default {
  id: 'TC-UIP-21',
  title: '#21 Edit User page has no Delete action',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/{id}',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'Manual UI-parity issue #21. Edit User form shows a Delete button. '
       + 'Root cause: raptech-web/.../templates/admin/users/form.html:631-641 — '
       + 'th:if="${!isNew and isSuperAdmin}" form posting /admin/users/{id}/delete '
       + 'with a "Delete User" submit button in the action bar. Remove it.',

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

    await page.goto(`${MIG}/admin/users/${userId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const probe = await page.evaluate(() => {
      const deleteForms = [...document.querySelectorAll('form')]
        .filter(f => /\/delete\b/.test(f.getAttribute('action') || ''));
      const deleteButtons = [...document.querySelectorAll('button')]
        .filter(b => /delete user/i.test(b.textContent || ''));
      return {
        deleteFormCount: deleteForms.length,
        deleteButtonCount: deleteButtons.length,
        deleteActions: deleteForms.map(f => f.getAttribute('action')),
      };
    });

    return { userId, ...probe };
  },

  check(m) {
    return [
      { aspect: 'Edit User page has NO delete form (action .../delete)',
        migrated: `${m.deleteFormCount} (${JSON.stringify(m.deleteActions)})`,
        expected: 0, ok: m.deleteFormCount === 0 },
      { aspect: 'Edit User page has NO "Delete User" button',
        migrated: m.deleteButtonCount, expected: 0, ok: m.deleteButtonCount === 0 },
    ];
  },
};
