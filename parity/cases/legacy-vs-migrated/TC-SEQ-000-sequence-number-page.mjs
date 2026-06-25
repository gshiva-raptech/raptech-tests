// TC-SEQ-000 — Sequence Number config page (super admin tab) — Track B (structure).
// Legacy: /admin/viewLogicalKeyGenDetails.action (logicalKeyGenForm + currentKeys/pendingKeys).
// The page renders the org's logical-key sequences (keyName + start/current no) and a
// Save form posting itemJsonString. Org-scoped to the session-active org (no on-screen
// selector); entity selector appears only when 10021 (entity-based seq) is enabled.
//
// NOTE: deliberately page-load only. The Save mutates real document-numbering start
// values for the live org — a behavioral mutation we do NOT run against real data.
export default {
  id: 'TC-SEQ-000',
  title: 'Sequence Number page renders sequences + Save form (scoped)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/sequence-number',
  module: 'Admin Settings',
  subModule: 'Sequence Number',
  hints: '- AdminMiscController.sequenceNumber(); template admin/misc/sequence-number.html (#logicalKeyGenForm, itemJsonString).',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/sequence-number`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const probe = await page.evaluate(() => {
      const form = document.querySelector('#logicalKeyGenForm');
      const orgIdEl = document.querySelector('#logicalKeyGenForm input[name=orgId]');
      const itemJson = document.querySelector('#itemJsonString');
      // each sequence-key row (current or pending) carries a text input for the key name
      const keyInputs = form ? form.querySelectorAll('input[type=text]:not([name=orgId])').length : 0;
      // Save button: a submit-style button inside / bound to the form
      const saveBtn = !![...document.querySelectorAll('button')].find(b => /save|update/i.test(b.textContent || ''));
      const entitySel = !!document.querySelector('#entityId'); // present only when entity-based seq on
      return {
        hasForm: !!form,
        orgId: orgIdEl ? orgIdEl.value : null,
        hasItemJson: !!itemJson,
        keyRows: keyInputs,
        hasSave: saveBtn,
        entityBasedSeq: entitySel,
      };
    });
    shots.page = shot('page'); await page.screenshot({ path: shots.page, fullPage: true }).catch(() => {});
    return { ...probe, shots };
  },

  check(m) {
    return [
      { aspect: 'Page renders Save form (#logicalKeyGenForm)', migrated: m.hasForm, expected: true, ok: m.hasForm === true },
      { aspect: 'Scoped to an org (orgId hidden set)', migrated: m.orgId || '(none)', expected: 'non-empty', ok: !!m.orgId },
      { aspect: 'itemJsonString save field present', migrated: m.hasItemJson, expected: true, ok: m.hasItemJson === true },
      { aspect: 'Sequence-key rows render', migrated: m.keyRows, expected: '>= 1', ok: m.keyRows >= 1 },
      { aspect: 'Save / Update control present', migrated: m.hasSave, expected: true, ok: m.hasSave === true },
      { aspect: 'Entity selector (10021 entity-based seq)', migrated: m.entityBasedSeq ? 'shown' : 'hidden (param off)', expected: 'reflects 10021', ok: true, severity: 'warn' },
    ];
  },
};
