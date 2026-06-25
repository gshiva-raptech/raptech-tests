// TC-UIP-02 — [Issue #2] Status field on Edit Organization & Organization Detail.
// EXPECTED (legacy parity / requested behavior): both the Edit and Detail org pages
// must DISPLAY the Active/Inactive status value (not just a label / not absent).
// Asserts the status switch is present AND shows a non-empty Active|Inactive value.
// Track B, superadmin (OrganizationController /admin/organizations/{id}).
export default {
  id: 'TC-UIP-02',
  title: 'Issue #2 — Status value shown on Edit Organization + Organization Detail',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}?mode=edit|view',
  module: 'Admin Settings',
  subModule: 'Organization (super-admin)',
  hints: '- Issue #2: Status not displayed on Edit Org + Org Detail → should show Active/Inactive.\n- Template admin/org/form.html status switch (#statusSwitch / #statusName), th:unless="${isNew}".',

  data() { return { orgId: 1 }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const readStatus = async (mode) => {
      await page.goto(`${MIG}/admin/organizations/${data.orgId}?mode=${mode}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      return page.evaluate(() => {
        const sw = document.querySelector('#statusSwitch, .status-switch');
        const sn = document.querySelector('#statusName, .st-name');
        const txt = sn ? sn.textContent.trim() : '';
        return { present: !!sw, value: txt, isStatusValue: /^(active|inactive)$/i.test(txt) };
      });
    };

    const edit = await readStatus('edit');
    shots.edit = shot('edit'); await page.screenshot({ path: shots.edit, fullPage: true }).catch(() => {});
    const view = await readStatus('view');
    shots.view = shot('view'); await page.screenshot({ path: shots.view, fullPage: true }).catch(() => {});

    return { edit, view, shots };
  },

  check(m) {
    return [
      { aspect: 'Edit Org shows Active/Inactive status value', migrated: m.edit.present ? m.edit.value || '(empty)' : '(absent)', expected: 'Active|Inactive', ok: m.edit.present && m.edit.isStatusValue },
      { aspect: 'Org Detail shows Active/Inactive status value', migrated: m.view.present ? m.view.value || '(empty)' : '(absent)', expected: 'Active|Inactive', ok: m.view.present && m.view.isStatusValue },
    ];
  },
};
