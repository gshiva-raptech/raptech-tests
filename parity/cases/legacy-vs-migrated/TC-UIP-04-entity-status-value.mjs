// TC-UIP-04 — [Issue #4] Entity Status value must be shown on Edit Entity.
// Legacy editEntity.jsp shows a "Status" label AND a radio with the current value
// (Active/Inactive) selected. EXPECTED: on Edit Entity the status control is present
// AND exposes the entity's current Active/Inactive value (not just the header label).
// Track B, superadmin (OrganizationController /admin/organizations/{orgId}/entities/{entityId}).
export default {
  id: 'TC-UIP-04',
  title: 'Issue #4 — Entity Status label AND value shown on Edit Entity',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{orgId}/entities/{entityId}',
  module: 'Admin Settings',
  subModule: 'Business Unit (super-admin)',
  hints: '- Issue #4: only the Status header shows on Edit Entity → label AND Active/Inactive value should show.\n- Legacy editEntity.jsp: <label>Status</label> + s:radio list 0=Active,1=Inactive (current selected).\n- Migrated admin/org/entity-form.html sec-status: <select #status> Active/Inactive.',

  data() { return { orgId: 1, entityId: 1 }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/organizations/${data.orgId}/entities/${data.entityId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const info = await page.evaluate(() => {
      // Status header (label)
      const sectionHasHeader = !!([...document.querySelectorAll('#sec-status h2, label[for=status], .field-label')]
        .find(e => /status/i.test(e.textContent)));
      // Status control + its current value (select option / radio / switch)
      const sel = document.querySelector('#status');
      let value = null, hasValue = false;
      if (sel && sel.tagName === 'SELECT') {
        value = sel.value;
        const opt = sel.options[sel.selectedIndex];
        value = opt ? opt.textContent.trim() : sel.value;
        hasValue = sel.value !== '' && sel.value != null;
      } else {
        const radio = document.querySelector('input[name=status]:checked');
        if (radio) { hasValue = true; value = radio.value; }
        const sw = document.querySelector('.status-switch .st-name, #statusName');
        if (!hasValue && sw) { value = sw.textContent.trim(); hasValue = /active|inactive/i.test(value); }
      }
      return { sectionHasHeader, statusControlPresent: !!sel || !!document.querySelector('input[name=status],.status-switch'), value, hasValue };
    });
    shots.edit = shot('edit'); await page.screenshot({ path: shots.edit, fullPage: true }).catch(() => {});

    return { ...info, shots };
  },

  check(m) {
    return [
      { aspect: 'Status header/label shown on Edit Entity', migrated: m.sectionHasHeader, expected: true, ok: m.sectionHasHeader === true },
      { aspect: 'Status VALUE shown on Edit Entity (Active/Inactive)', migrated: m.hasValue ? (m.value || '(value)') : '(no value)', expected: 'Active|Inactive value', ok: m.statusControlPresent && m.hasValue === true },
    ];
  },
};
