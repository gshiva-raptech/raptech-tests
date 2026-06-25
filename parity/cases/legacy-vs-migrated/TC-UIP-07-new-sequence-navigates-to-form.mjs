// TC-UIP-07 — [Issue #7] "New Sequence" must navigate to the Create Sequence form
// (not a blank page). Drives the actual grid "+ New Sequence" toolbar button
// (#btnNew → config.newUrl) on the entity Sequence Details grid and asserts the
// resulting page is the real Add-Sequence form: URL ends /sequences/new, the
// #seqName field is present, and the body is not blank.
// Track B, superadmin (SequenceSettingsController base
//   /admin/organizations/{orgId}/entities/{entityId}/sequences).
export default {
  id: 'TC-UIP-07',
  title: 'Issue #7 — New Sequence navigates to the Create Sequence form',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{orgId}/entities/{entityId}/sequences (+ New)',
  module: 'Admin Settings',
  subModule: 'Business Unit → Sequence Details (super-admin)',
  hints: '- Issue #7: New Sequence shows a blank page → should open the Create Sequence form.\n- Grid #btnNew → RaptechGrid._fireNew → window.location = config.newUrl (.../sequences/new).\n- SequenceSettingsController.newForm() returns admin/org-settings/sequences/form.html.',

  data() { return { orgId: 1, entityId: 1 }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/organizations/${data.orgId}/entities/${data.entityId}/sequences`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const before = page.url();
    // Click the real grid toolbar "+ New Sequence" button.
    await page.click('#btnNew').catch(() => {});
    await page.waitForTimeout(1500);

    const after = await page.evaluate(() => ({
      url: location.href,
      bodyTextLen: document.body.innerText.trim().length,
      hasSeqName: !!document.querySelector('#seqName'),
      hasTypeId: !!document.querySelector('#typeId'),
    }));
    shots.newForm = shot('new-form'); await page.screenshot({ path: shots.newForm, fullPage: true }).catch(() => {});

    return { before, ...after, shots };
  },

  check(m) {
    return [
      { aspect: 'New Sequence navigates to the create form URL', migrated: /\/sequences\/new$/.test(m.url) ? '.../sequences/new' : m.url, expected: '.../sequences/new', ok: /\/sequences\/new$/.test(m.url) },
      { aspect: 'Create Sequence form rendered (not blank)', migrated: m.bodyTextLen > 400 && m.hasSeqName ? 'form rendered' : 'blank/missing form', expected: 'form rendered', ok: m.bodyTextLen > 400 && m.hasSeqName === true },
    ];
  },
};
