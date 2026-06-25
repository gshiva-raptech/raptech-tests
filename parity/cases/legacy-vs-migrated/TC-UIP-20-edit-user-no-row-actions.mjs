// TC-UIP-20 — Edit User page must NOT show grid-row actions — Track B.
// Manual issue #20: "Reset Password", "Assign Views", "Assign Reports" appear on
// the Edit User page; these are grid ROW actions and should not be on the form.
//
// EXPECTED: the Edit User form has no Reset Password / Assign Report(s) /
//   Assign Views sub-action links.
// CURRENT (bug): admin/users/form.html lines 78-85 render those three links via
//   th:if="${!isNew}" inside the form-screen.
//
// FAILS now (links present), GREEN once they are removed from the edit form.
export default {
  id: 'TC-UIP-20',
  title: '#20 Edit User page has no Reset Password / Assign Report / Assign Views actions',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/{id}',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'Manual UI-parity issue #20. Edit User form shows grid-row actions. '
       + 'Root cause: raptech-web/.../templates/admin/users/form.html:78-85 — '
       + 'th:if="${!isNew}" block with Reset Password / Assign Report / Assign Views '
       + '<a class="btn"> links. Remove from the form (keep them as grid row actions).',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // Resolve a real user id from the grid rows.
    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const userId = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      const rows = r.ok ? await r.json() : [];
      return Array.isArray(rows) && rows.length ? rows[0].userId : null;
    }, `${MIG}/admin/users/rows`);

    await page.goto(`${MIG}/admin/users/${userId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Scope to the form (the org switcher in the top bar uses similar labels;
    // assert against in-form anchors only).
    const found = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.form-screen a')].map(a => ({
        t: a.textContent.trim(), href: a.getAttribute('href') || '',
      }));
      return {
        resetPassword: links.some(l => /reset-password/.test(l.href) || /reset password/i.test(l.t)),
        assignReport:  links.some(l => /assign-report/.test(l.href)  || /assign report/i.test(l.t)),
        assignViews:   links.some(l => /assign-views/.test(l.href)   || /assign views/i.test(l.t)),
        hrefs: links.map(l => l.href).filter(h => /reset-password|assign-report|assign-views/.test(h)),
      };
    });

    return { userId, ...found };
  },

  check(m) {
    return [
      { aspect: 'Edit User page has NO "Reset Password" action',
        migrated: m.resetPassword, expected: false, ok: m.resetPassword === false },
      { aspect: 'Edit User page has NO "Assign Report" action',
        migrated: m.assignReport, expected: false, ok: m.assignReport === false },
      { aspect: 'Edit User page has NO "Assign Views" action',
        migrated: m.assignViews, expected: false, ok: m.assignViews === false },
    ];
  },
};
