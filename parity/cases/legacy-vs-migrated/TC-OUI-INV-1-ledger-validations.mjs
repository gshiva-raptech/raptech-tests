// TC-OUI-INV-1 — Inventory Ledger: required / duplicate / create-in-grid / edit, UI-only.
//
// Drives Admin → Inventory → Inventory Ledger exactly like a manual tester and
// asserts only what the user SEES: inline "Required" field errors on empty submit,
// the new row appearing in the AG-Grid, the on-screen "already exists" duplicate
// message, and the edited account name showing in the grid.
//
// Legacy parity (InventoryController.ledgerCreate / ledgerUpdate; live-verified):
//   empty submit → inline Required on Finance Group + Ledger Account; valid create
//   → row in grid; same name again → "already exists" and stays on form; edit name
//   → new name in grid. Finance Group is locked (disabled) on edit — asserted.
// Cleanup (RULE 7): hard-delete ONLY this run's stamped rows by exact ZZ stamp.
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-INV-1', title: 'Inventory Ledger required / duplicate / edit (UI-only)',
  track: 'B', role: 'regular',
  urlPath: '/admin/inventory/inventory-ledger', module: 'Admin Settings',
  subModule: 'Inventory → Inventory Ledger',
  hints: '- InventoryController ledgerCreate (dup "already exists"), ledgerUpdate. financeGroup disabled on edit. Table raptech_scm.inventory_ledger (ledger_account).',
  data() { return { stamp: 'ZZ LDG ' + Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = data.stamp;
    let reqErrs = [], createdInGrid = false, dupMsg = null, editedInGrid = false,
        fgLockedOnEdit = null, createdId = null;
    try {
      // 1) required validation (empty submit) → inline errors, stays on form
      await page.goto(`${MIG}/admin/inventory/inventory-ledger/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /create/i }).click().catch(() => {});
      await page.waitForTimeout(400);
      reqErrs = (await ui.visibleFieldErrors(page)).map(e => `${e.label}: ${e.msg}`);

      // 2) valid create → appears in grid
      await page.selectOption('#financeGroup', { index: 1 });
      await page.fill('#ledgerAccount', name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(900);
      createdId = (page.url().match(/inventory-ledger\/(\d+)/) || [])[1] || null;
      await page.goto(`${MIG}/admin/inventory/inventory-ledger`, { waitUntil: 'domcontentloaded' });
      await ui.gridReady(page);
      createdInGrid = await ui.gridHasText(page, name);

      // 3) duplicate guard (same account name) → on-screen message
      await page.goto(`${MIG}/admin/inventory/inventory-ledger/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.selectOption('#financeGroup', { index: 1 });
      await page.fill('#ledgerAccount', name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(800);
      dupMsg = await page.evaluate(() => document.body.innerText.match(/already exists[^\n]*/i)?.[0] || null);

      // 4) edit: Finance Group locked + name change persists in grid
      if (createdId) {
        await page.goto(`${MIG}/admin/inventory/inventory-ledger/${createdId}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        fgLockedOnEdit = await page.evaluate(() => {
          const el = document.getElementById('financeGroup');
          return el ? el.disabled : null;
        });
        const name2 = name + ' E';
        await page.fill('#ledgerAccount', name2);
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /update/i }).click()]);
        await page.waitForTimeout(800);
        await page.goto(`${MIG}/admin/inventory/inventory-ledger`, { waitUntil: 'domcontentloaded' });
        await ui.gridReady(page);
        editedInGrid = await ui.gridHasText(page, name2);
      }
    } finally {
      try { psql(`DELETE FROM raptech_scm.inventory_ledger WHERE ledger_account LIKE $T$${data.stamp}%$T$`); } catch (e) { /* report if blocked */ }
    }
    return { reqErrs, createdInGrid, dupMsg, editedInGrid, fgLockedOnEdit };
  },
  check(m) {
    const hasReq = (m.reqErrs || []).filter(e => /required/i.test(e)).length;
    return [
      { aspect: 'Empty submit shows inline required errors (Finance Group + Ledger Account)',
        migrated: m.reqErrs.join(' | ') || '(none)', expected: '>=2 Required', ok: hasReq >= 2 },
      { aspect: 'Valid create appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate account name blocked with on-screen message', migrated: m.dupMsg || '(none)',
        expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Finance Group locked (disabled) on edit', migrated: m.fgLockedOnEdit, expected: true, ok: m.fgLockedOnEdit === true },
      { aspect: 'Edited account name persists in grid', migrated: m.editedInGrid, expected: true, ok: m.editedInGrid === true },
    ];
  },
};
