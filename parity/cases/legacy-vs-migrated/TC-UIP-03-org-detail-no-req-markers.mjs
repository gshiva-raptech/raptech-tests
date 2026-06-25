// TC-UIP-03 — [Issue #3] Mandatory (*) markers must NOT appear on the read-only
// Organization Details page. Legacy detailOrganization.jsp renders fields as
// title/value spans with no "*" markers. Migrated reuses the editable form
// template (admin/org/form.html) for mode=view, so the 16 ".req" stars leak onto
// the read-only Detail page. EXPECTED: zero ".req" markers on Org Detail.
// Track B, superadmin (OrganizationController /admin/organizations/{id}?mode=view).
export default {
  id: 'TC-UIP-03',
  title: 'Issue #3 — No mandatory (*) markers on read-only Organization Details',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}?mode=view',
  module: 'Admin Settings',
  subModule: 'Organization (super-admin)',
  hints: '- Issue #3: (*) shown on Org Details → should NOT appear on the read-only detail.\n- Root: admin/org/form.html reused for mode=view; .req spans not suppressed when !canEdit.',

  data() { return { orgId: 1 }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/organizations/${data.orgId}?mode=view`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const info = await page.evaluate(() => {
      // Only count the org form's OWN required markers (exclude chrome/widgets).
      const form = document.querySelector('form[data-raptech-form]');
      const reqMarkers = form ? form.querySelectorAll('.req').length
                              : document.querySelectorAll('.req').length;
      // Confirm this really is the read-only detail: ignore search widgets
      // (org-switcher + multiselect .ms-search-input) which are page chrome.
      const editable = [...document.querySelectorAll('input,select,textarea')].filter(e => {
        if (e.type === 'hidden') return false;
        if (e.classList.contains('ms-search-input') || e.classList.contains('company-menu-search')) return false;
        return !(e.disabled || e.readOnly);
      }).length;
      return { reqMarkers, editable };
    });
    shots.view = shot('view'); await page.screenshot({ path: shots.view, fullPage: true }).catch(() => {});

    return { ...info, shots };
  },

  check(m) {
    return [
      { aspect: 'Page is read-only (no editable inputs)', migrated: m.editable, expected: 0, ok: m.editable === 0 },
      { aspect: 'No mandatory (*) markers on Org Details', migrated: m.reqMarkers, expected: 0, ok: m.reqMarkers === 0 },
    ];
  },
};
