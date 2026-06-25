// TC-SA-SEQ-2 — Sequence Number behaviour, UI-only (super admin). Track B.
// Verifies the two user-facing behaviours legacy enforces on this screen, through what
// the user sees — WITHOUT persisting any change (read-only assertions + a no-op submit):
//   VALIDATION — clicking "Save/Update" with no Available-Sequence row ticked shows the
//     on-screen "Please Select Atleast One Sequence" message and does NOT submit
//     (legacy logicalSeqKeyBtn handler / server guard).
//   TOGGLE — an Available-Sequence row's "Current No." input is read-only until its row
//     checkbox is ticked, then becomes editable (legacy .opSeqSelect_f change handler).
//     After verifying the unlock we UNTICK it so nothing is saved.
// Nothing is submitted to the server, so there is no test data to clean up.
export default {
  id: 'TC-SA-SEQ-2',
  title: 'Sequence Number — empty-save validation + checkbox unlocks Current No.',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/sequence-number',
  module: 'Admin Settings',
  subModule: 'Sequence Number',
  priority: 'Medium',
  hints: '- Client guard: no row ticked → "Please Select Atleast One Sequence" (clientErrorMsg), submit prevented.\n'
       + '- Server guard (AdminMiscController.sequenceNumberSave) emits the same message for an empty itemJsonString.\n'
       + '- Row checkbox (.seq-select) toggles readonly on .seq-current-no.',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/sequence-number`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const hasAvailRows = (await page.$$('.seq-row')).length > 0;

    // ── VALIDATION: Save/Update with nothing ticked → on-screen message, no navigation ──
    const urlBefore = page.url();
    await page.getByRole('button', { name: /save\/?update/i }).click().catch(() => {});
    await page.waitForTimeout(700);
    const validationMsg = await page.evaluate(() => {
      const el = document.getElementById('clientErrorMsg');
      if (el && !el.hidden && el.textContent.trim()) return el.textContent.trim();
      // server flash fallback
      const flash = [...document.querySelectorAll('div')]
        .find(d => /please select atleast one sequence/i.test(d.textContent || ''));
      return flash ? flash.textContent.trim() : null;
    });
    const stayedOnPage = /\/admin\/sequence-number/.test(page.url()) && page.url() === urlBefore;
    shots.validation = shot('validation'); await page.screenshot({ path: shots.validation, fullPage: true }).catch(() => {});

    // ── TOGGLE: tick the first Available row → its Current No. becomes editable; untick ──
    let lockedBefore = null, editableAfter = null;
    if (hasAvailRows) {
      lockedBefore = await page.evaluate(() => {
        const inp = document.querySelector('.seq-row .seq-current-no'); return inp ? inp.readOnly : null;
      });
      await page.click('.seq-row .seq-select').catch(() => {});
      await page.waitForTimeout(300);
      editableAfter = await page.evaluate(() => {
        const inp = document.querySelector('.seq-row .seq-current-no'); return inp ? !inp.readOnly : null;
      });
      await page.click('.seq-row .seq-select').catch(() => {}); // untick — leave nothing saved
    }

    return { hasAvailRows, validationMsg, stayedOnPage, lockedBefore, editableAfter, shots };
  },

  check(m) {
    return [
      { aspect: 'Empty Save shows "Please Select Atleast One Sequence"',
        migrated: m.validationMsg || '(none)', expected: 'Please Select Atleast One Sequence',
        ok: /please select atleast one sequence/i.test(m.validationMsg || '') },
      { aspect: 'Empty Save does not navigate away', migrated: m.stayedOnPage ? 'stayed' : 'navigated',
        expected: 'stayed', ok: m.stayedOnPage === true, severity: 'warn' },
      { aspect: 'Current No. is read-only until the row is ticked',
        migrated: m.hasAvailRows ? `lockedBefore=${m.lockedBefore}` : 'no available rows',
        expected: 'read-only', ok: m.hasAvailRows ? m.lockedBefore === true : true },
      { aspect: 'Ticking the row unlocks Current No.',
        migrated: m.hasAvailRows ? `editableAfter=${m.editableAfter}` : 'no available rows',
        expected: 'editable', ok: m.hasAvailRows ? m.editableAfter === true : true },
    ];
  },
};
