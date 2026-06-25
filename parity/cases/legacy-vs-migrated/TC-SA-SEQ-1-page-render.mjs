// TC-SA-SEQ-1 — Sequence Number config page renders, UI-only (super admin). Track B.
// Legacy viewLogicalKeyGenDetails.action. Verifies what the user sees on the migrated
// page (admin/misc/sequence-number.html):
//   - the "Sequence Number" admin tab is active and the page is reachable;
//   - the org context line shows the session org;
//   - BOTH tables render with the legacy headers (Sequence Key Name / Starts With /
//     Current No.): "Current Sequence" (existing rows) and "Available Sequence" (pending);
//   - "Current Sequence" rows are READ-ONLY (legacy parity — the select checkbox is
//     commented out in legacy, so existing sequences cannot be re-edited here);
//   - the "Save/Update" action button is present.
export default {
  id: 'TC-SA-SEQ-1',
  title: 'Sequence Number page — tab active, both tables, read-only current, Save/Update',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/sequence-number',
  module: 'Admin Settings',
  subModule: 'Sequence Number',
  priority: 'Low',
  hints: '- AdminMiscController.sequenceNumber. Current Sequence rows read-only; Available Sequence rows have a checkbox.\n'
       + '- Entity selector only when org param 10021 (SEQUENCY_NO_BY_ENTITY) enabled. Save button id=logicalSeqKeyBtn.',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/sequence-number`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const info = await page.evaluate(() => {
      const tableHeads = [...document.querySelectorAll('#logicalKeyGenForm table thead')]
        .map(th => [...th.querySelectorAll('th')].map(c => c.textContent.trim()).filter(Boolean));
      const h3 = [...document.querySelectorAll('h3')].map(e => e.textContent.trim());
      const activeTab = (document.querySelector('.subtab.active')?.textContent || '').trim();
      const saveBtn = (document.getElementById('logicalSeqKeyBtn')?.textContent || '').trim();
      const orgName = ([...document.querySelectorAll('span')]
        .find(s => /Organization:/.test(s.textContent))?.nextElementSibling?.textContent || '').trim();
      // current rows read-only: every Current-No input in the FIRST table is readonly
      const firstTable = document.querySelectorAll('#logicalKeyGenForm table')[0];
      const curInputs = firstTable ? [...firstTable.querySelectorAll('tbody input[type=text]')] : [];
      const allCurReadonly = curInputs.length === 0 || curInputs.every(i => i.readOnly);
      // available rows have a checkbox + a (readonly until ticked) current-no input
      const availHasCheckbox = !!document.querySelector('.seq-row .seq-select');
      return {
        h3, activeTab, saveBtn, orgName, tableHeads,
        currentCount: firstTable ? firstTable.querySelectorAll('tbody tr').length : 0,
        availCount: document.querySelectorAll('.seq-row').length,
        allCurReadonly, availHasCheckbox,
      };
    });
    shots.page = shot('page'); await page.screenshot({ path: shots.page, fullPage: true }).catch(() => {});
    return info;
  },

  check(m) {
    const heads = (m.tableHeads || []).flat().map(h => h.toLowerCase());
    const headHas = re => heads.some(h => re.test(h));
    return [
      { aspect: '"Sequence Number" admin tab is active', migrated: m.activeTab, expected: 'Sequence Number',
        ok: /sequence number/i.test(m.activeTab) },
      { aspect: 'Org context shows the session org', migrated: m.orgName || '(none)', expected: 'an org name',
        ok: !!m.orgName },
      { aspect: 'Both tables present (Current + Available Sequence)', migrated: m.h3.join(', '),
        expected: 'Current Sequence, Available Sequence',
        ok: m.h3.some(x => /current sequence/i.test(x)) && m.h3.some(x => /available sequence/i.test(x)) },
      { aspect: 'Legacy table headers render (Key Name / Starts With / Current No.)',
        migrated: heads.join(', '), expected: 'Sequence Key Name, Starts With, Current No.',
        ok: headHas(/sequence key name/) && headHas(/starts with/) && headHas(/current no/) },
      { aspect: 'Current Sequence rows are read-only',
        migrated: `${m.currentCount} rows, allReadonly=${m.allCurReadonly}`, expected: 'all read-only',
        ok: m.allCurReadonly === true },
      { aspect: 'Available Sequence rows are selectable (checkbox)',
        migrated: m.availHasCheckbox, expected: true, ok: m.availHasCheckbox === true, severity: 'warn' },
      { aspect: '"Save/Update" action present', migrated: m.saveBtn || '(none)', expected: 'Save/Update',
        ok: /save\/?update/i.test(m.saveBtn || '') },
    ];
  },
};
