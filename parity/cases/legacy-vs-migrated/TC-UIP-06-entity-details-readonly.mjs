// TC-UIP-06 — [Issue #6] Entity Details page must be fully read-only.
// Legacy detailEntity.jsp renders every field as static <s:property> text (no inputs).
// Migrated has NO separate detail view: the grid "Entity Details" action and the
// "Edit Entity" action both point at /entities/{entityId}, which always renders the
// editable entity-form.html (viewEntity() ignores any read-only/mode flag).
// EXPECTED: the Entity Details page has ZERO editable fields.
// Track B, superadmin (OrganizationController .../entities/{entityId}).
export default {
  id: 'TC-UIP-06',
  title: 'Issue #6 — Entity Details page is read-only',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{orgId}/entities/{entityId}',
  module: 'Admin Settings',
  subModule: 'Business Unit (super-admin)',
  hints: '- Issue #6: Entity Details fields all editable → should be read-only.\n- Legacy detailEntity.jsp: all fields static <s:property>.\n- Migrated: OrganizationController.viewEntity() returns editable entity-form.html with no mode; grid "Entity Details" action URL == "Edit Entity" URL (no ?mode=view).',

  // The migrated grid maps "Entity Details" to the same URL as Edit (no mode param).
  // Probe the detail action URL exactly as the grid would (with ?mode=view to be
  // generous — a correct fix would honor it). Either way assert read-only.
  data() { return { orgId: 1, entityId: 1 }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // Use the documented detail action URL (with mode=view, which a proper fix honors).
    await page.goto(`${MIG}/admin/organizations/${data.orgId}/entities/${data.entityId}?mode=view`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const info = await page.evaluate(() => {
      const editable = [...document.querySelectorAll('input,select,textarea')].filter(e => {
        if (e.type === 'hidden') return false;
        if (e.offsetParent === null && e.type !== 'checkbox') return false;
        // :disabled reflects EFFECTIVE disabled state, incl. inheritance from a disabled
        // <fieldset> (e.disabled alone misses that — F-0034 wraps the form in one).
        return !(e.matches(':disabled') || e.readOnly);
      });
      return { editableCount: editable.length, sample: editable.slice(0, 10).map(e => e.id || e.name || e.type) };
    });
    shots.detail = shot('detail'); await page.screenshot({ path: shots.detail, fullPage: true }).catch(() => {});

    return { ...info, shots };
  },

  check(m) {
    return [
      { aspect: 'Entity Details has no editable fields (read-only)', migrated: m.editableCount + (m.editableCount ? ' editable: ' + m.sample.join(',') : ''), expected: 0, ok: m.editableCount === 0 },
    ];
  },
};
