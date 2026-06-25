// TC-OUI-INV-2 — Warehouses: required / duplicate / row actions / edit-locks, UI-only.
//
// Manual-tester drive of Admin → Inventory → Warehouses. Asserts what the user SEES:
// inline Required on empty submit, the new row in the AG-Grid, the on-screen
// "already exists" duplicate message (org+entity scoped), the kebab row-action menu
// (Edit Warehouse / Warehouse Details / Assign User — legacy parity, NO Delete), and
// that Entity is locked (disabled) on the edit form.
//
// Legacy parity (InventoryController.warehouseCreate/Update; live-verified): dup name
//   per org+entity → "already exists"; row actions exactly Edit/Details/Assign User
//   (+ Assign Resource only when org param 10027 on — absent for this org); entity
//   locked on edit. Cleanup (RULE 7): hard-delete ONLY this run's stamped row.
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-INV-2', title: 'Warehouses required / duplicate / row actions / edit-lock (UI-only)',
  track: 'B', role: 'regular',
  urlPath: '/admin/inventory/warehouses', module: 'Admin Settings',
  subModule: 'Inventory → Warehouses',
  hints: '- InventoryController warehouseCreate (countDuplicateName "already exists"), entity disabled on edit. Row actions Edit/Details/Assign User. Table raptech_scm.warehouse_master (value).',
  data() { return { stamp: 'ZZ WH ' + Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = data.stamp;
    let reqErrs = [], createdInGrid = false, dupMsg = null, rowActions = [],
        entityLockedOnEdit = null, createdId = null;
    try {
      // 1) required (empty submit) → inline errors
      await page.goto(`${MIG}/admin/inventory/warehouses/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /create/i }).click().catch(() => {});
      await page.waitForTimeout(400);
      reqErrs = (await ui.visibleFieldErrors(page)).map(e => `${e.label}: ${e.msg}`);

      // 2) valid create (first real entity + name) → grid
      await page.selectOption('#entityId', { index: 1 });
      await page.fill('#value', name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(900);
      createdId = (page.url().match(/warehouses\/(\d+)/) || [])[1] || null;
      await page.goto(`${MIG}/admin/inventory/warehouses`, { waitUntil: 'domcontentloaded' });
      await ui.gridReady(page);
      createdInGrid = await ui.gridHasText(page, name);

      // 3) duplicate same name+entity → on-screen message
      await page.goto(`${MIG}/admin/inventory/warehouses/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.selectOption('#entityId', { index: 1 });
      await page.fill('#value', name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /create/i }).click()]);
      await page.waitForTimeout(800);
      dupMsg = await page.evaluate(() => document.body.innerText.match(/already exists[^\n]*/i)?.[0] || null);

      // 4) row-action menu on the created row (kebab) — enumerate user-visible items
      await page.goto(`${MIG}/admin/inventory/warehouses`, { waitUntil: 'domcontentloaded' });
      await ui.gridReady(page);
      const idx = await page.evaluate(t => {
        const r = [...document.querySelectorAll('.ag-center-cols-container .ag-row')]
          .find(row => [...row.querySelectorAll('.ag-cell')].some(c => c.textContent.includes(t)));
        return r ? r.getAttribute('row-index') : null;
      }, name);
      if (idx != null) {
        await page.click(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"] button.rap-kebab`).catch(() => {});
        await page.waitForTimeout(300);
        rowActions = await page.$$eval('.menu-item', e => e.map(x => x.textContent.trim()).filter(Boolean));
      }

      // 5) edit: Entity locked (disabled)
      if (createdId) {
        await page.goto(`${MIG}/admin/inventory/warehouses/${createdId}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        entityLockedOnEdit = await page.evaluate(() => {
          const el = document.getElementById('entityId');
          return el ? el.disabled : null;
        });
      }
    } finally {
      try { psql(`DELETE FROM raptech_scm.warehouse_master WHERE value LIKE $T$${data.stamp}%$T$`); } catch (e) { /* report if blocked */ }
    }
    return { reqErrs, createdInGrid, dupMsg, rowActions, entityLockedOnEdit };
  },
  check(m) {
    const hasReq = (m.reqErrs || []).filter(e => /required/i.test(e)).length;
    const acts = (m.rowActions || []).join(' | ');
    const noDelete = !/delete/i.test(acts);
    const expectedActs = /edit/i.test(acts) && /detail/i.test(acts) && /assign user/i.test(acts);
    return [
      { aspect: 'Empty submit shows inline required errors', migrated: m.reqErrs.join(' | ') || '(none)',
        expected: '>=2 Required', ok: hasReq >= 2 },
      { aspect: 'Valid create appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate name (org+entity) blocked with on-screen message', migrated: m.dupMsg || '(none)',
        expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Row actions = Edit / Details / Assign User (no Delete) [legacy parity]',
        migrated: acts || '(none)', expected: 'Edit, Details, Assign User; no Delete', ok: expectedActs && noDelete },
      { aspect: 'Entity locked (disabled) on edit', migrated: m.entityLockedOnEdit, expected: true, ok: m.entityLockedOnEdit === true },
    ];
  },
};
