// TC-OUI-GEN-DL-1 — Transaction Date Lock required fields + one-per-entity guard, UI-only.
//
// Legacy parity (live-verified, addDateLocker.action): the New form has Entity,
// Lock Date, End Lock Date; submitting with only the entity → inline "Required."
// (Lock Date is mandatory). Legacy enforces one lock per entity. Grid row actions
// are Edit + Details (NO Delete) — matches viewDateLocker.jsp.
//
// Asserts what the user SEES: inline required errors, grid row actions, and the
// on-screen "already exists" duplicate message. Cleanup (RULE 7): delete only this
// run's date-lock rows (identified by the createdId captured this run).
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-GEN-DL-1', title: 'Transaction Date Lock — required fields + one-per-entity guard (UI-only)',
  track: 'B', role: 'regular',
  urlPath: '/admin/general/transaction-date-lock', module: 'Admin Settings',
  subModule: 'General → Transaction Date Lock',
  hints: '- GeneralController dateLockCreate one-per-entity guard "already exists". Grid: Edit+Details, no Delete.',
  data() { return {}; },
  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    let reqErrs = [], gridActions = [], dupMsg = null, createdId = null;
    try {
      // 1) empty submit → inline required (Entity, Lock Date, End Lock Date)
      await page.goto(`${MIG}/admin/general/transaction-date-lock/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      await page.getByRole('button', { name: /create/i }).click().catch(() => {});
      await page.waitForTimeout(600);
      reqErrs = (await ui.visibleFieldErrors(page)).map(e => e.label.replace('*', '').trim());

      // 2) create a valid lock for a free entity, then try a duplicate for the same entity
      const entVal = await page.evaluate(() => {
        const e = document.querySelector('#entityId');
        const o = [...(e?.options || [])].find(x => x.value);
        return o ? o.value : null;
      });
      if (entVal) {
        await page.selectOption('#entityId', entVal).catch(() => {});
        await page.fill('#lockDate', '2026-01-10').catch(() => {});
        await page.fill('#endLockDate', '2026-06-10').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /create/i }).click()]);
        await page.waitForTimeout(1000);
        createdId = (page.url().match(/transaction-date-lock\/(\d+)/) || [])[1] || null;

        // duplicate for same entity → on-screen "already exists"
        await page.goto(`${MIG}/admin/general/transaction-date-lock/new`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.selectOption('#entityId', entVal).catch(() => {});
        await page.fill('#lockDate', '2026-02-10').catch(() => {});
        await page.fill('#endLockDate', '2026-05-10').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /create/i }).click()]);
        await page.waitForTimeout(800);
        dupMsg = await page.evaluate(() => document.body.innerText.match(/already exists[^\n]*/i)?.[0] || null);
      }

      // 3) grid row actions = Edit + Details, no Delete
      await page.goto(`${MIG}/admin/general/transaction-date-lock`, { waitUntil: 'domcontentloaded' });
      await ui.gridReady(page);
      const rows = await ui.gridRows(page);
      if (rows.length) {
        const idx = rows[0].idx;
        await page.click(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"] button.rap-kebab`).catch(() => {});
        await page.waitForTimeout(400);
        // Migrated row-action menu renders items as .menu-item (not [role=menuitem]).
        gridActions = await page.evaluate(() => [...document.querySelectorAll('.menu-item')]
          .filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean));
      }
    } finally {
      if (createdId) { try { psql(`DELETE FROM raptech_scm.date_locker WHERE date_locker_id_pk = ${Number(createdId)}`); } catch (e) { /* report if blocked */ } }
    }
    const reqOk = ['Entity', 'Lock Date', 'End Lock Date'].every(l => reqErrs.some(r => r.toLowerCase() === l.toLowerCase()));
    const noDelete = gridActions.length > 0 && !gridActions.some(a => /delete/i.test(a));
    return { reqErrs, reqOk, dupMsg, gridActions, noDelete };
  },
  check(m) {
    return [
      { aspect: 'Empty submit flags Entity + Lock Date + End Lock Date', migrated: JSON.stringify(m.reqErrs),
        expected: 'Entity, Lock Date, End Lock Date', ok: m.reqOk === true },
      { aspect: 'Duplicate lock for same entity blocked with on-screen message', migrated: m.dupMsg || '(none)',
        expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Grid row actions = Edit + Details, no Delete (legacy)', migrated: JSON.stringify(m.gridActions),
        expected: 'Edit + Details only', ok: m.noDelete === true },
    ];
  },
};
