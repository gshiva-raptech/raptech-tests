// TC-UIP-05 — [Issue #5] Entity Name must be NON-editable on Edit Entity.
// Legacy editEntity.jsp renders Entity Name as static <div>${entityName}</div> + a
// hidden input (the name cannot be changed once created). Migrated entity-form.html
// renders #entityName as an editable <input> on the edit screen.
// EXPECTED: #entityName is read-only/disabled (or rendered as static text) on Edit Entity.
// Track B, superadmin (OrganizationController .../entities/{entityId}).
export default {
  id: 'TC-UIP-05',
  title: 'Issue #5 — Entity Name non-editable on Edit Entity',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{orgId}/entities/{entityId}',
  module: 'Admin Settings',
  subModule: 'Business Unit (super-admin)',
  hints: '- Issue #5: Entity Name editable on Edit Entity → should be non-editable.\n- Legacy editEntity.jsp: <div>${entityName}</div> + <s:hidden name="entityName"> (read-only).\n- Migrated admin/org/entity-form.html: <input id="entityName" th:field="*{entityName}"> always editable.',

  data() { return { orgId: 1, entityId: 1 }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/organizations/${data.orgId}/entities/${data.entityId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const info = await page.evaluate(() => {
      const en = document.querySelector('#entityName');
      // Editable text input present?
      const editableInput = en && (en.tagName === 'INPUT' || en.tagName === 'TEXTAREA') && en.type !== 'hidden'
        && !(en.disabled || en.readOnly);
      // Is the name shown somewhere (static or hidden) so the screen still has it?
      const hasName = !!en;
      return { hasNameField: hasName, entityNameEditable: !!editableInput };
    });
    shots.edit = shot('edit'); await page.screenshot({ path: shots.edit, fullPage: true }).catch(() => {});

    return { ...info, shots };
  },

  check(m) {
    return [
      { aspect: 'Entity Name is non-editable on Edit Entity', migrated: m.entityNameEditable ? 'editable' : 'read-only', expected: 'read-only', ok: m.entityNameEditable === false },
    ];
  },
};
