// TC-OUI-TAX-1 — Tax Rates: Add form renders + create succeeds + grid parity (UI-only).
//
// Regression guard for F-0026 ("Tax Rate Add form 500s — create impossible").
// The legacy createTaxRate.jsp lets a user pick Tax Type → Group Tax (dependent),
// Module (Purchase/Sales), optional End Date, then auto-populated Tax Rate lines
// (Tax Name read-only, Tax % entered per line), and Submit creates the tax rate.
//
// What the USER must SEE (asserted here, all via rendered DOM / on-screen text):
//   1. The Add form actually RENDERS its inputs — Module has Purchase & Sales
//      options, Tax Type has options, and 3 required (*) markers are shown
//      (Tax Type, Group Tax, Module). [If the form errors mid-render like F-0026,
//       Module/Group options are missing → this fails.]
//   2. Picking Tax Type + Group Tax auto-populates >=1 Tax Rate line.
//   3. A valid Submit shows "created successfully" and the row appears in the grid.
//   4. Grid columns + row actions match legacy: actions = "Edit Tax Rates" +
//      "Tax Rate Details" only (NO Delete), columns include the legacy set.
//
// Cleanup (RULE 7): delete ONLY the tax_master row created THIS run, identified by
// the unique stamp written into the rate Description, FK-ordered (rates → master).
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-TAX-1', title: 'Tax Rates — Add form renders + create succeeds + grid parity (UI-only)',
  track: 'B', role: 'regular',
  urlPath: '/admin/taxes/tax-rates', module: 'Admin Settings', subModule: 'Taxes → Tax Rates',
  hints: '- F-0026: Add form must render Module/Group/TaxType + create. TaxesController.taxRatesNewForm / form.html th:each.',
  data() { return { stamp: 'ZZTAX1 ' + Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const m = {
      moduleOpts: [], taxTypeCount: 0, reqMarkers: 0, rateRows: 0,
      flashCreate: null, createdInGrid: false, gridCols: [], rowActions: [],
    };
    let createdId = null;
    try {
      // ── 1) Add form renders its inputs (F-0026 guard) ──
      await page.goto(`${MIG}/admin/taxes/tax-rates/new`, { waitUntil: 'commit', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1800);
      m.moduleOpts = await page.evaluate(() =>
        [...(document.querySelector('#module')?.options || [])].map(o => o.value).filter(Boolean));
      m.taxTypeCount = await page.evaluate(() =>
        [...(document.querySelector('#taxType')?.options || [])].filter(o => o.value).length);
      m.reqMarkers = await ui.reqMarkerCount(page);

      // ── 2) Tax Type → Group Tax → rate lines auto-populate ──
      const tts = await page.evaluate(() =>
        [...(document.querySelector('#taxType')?.options || [])].map(o => o.value).filter(Boolean));
      let chosenTT = null, chosenGrp = null;
      for (const tt of tts) {
        await page.selectOption('#taxType', tt); await page.waitForTimeout(250);
        const g = await page.evaluate(() =>
          [...(document.querySelector('#groupId')?.options || [])].map(o => o.value).filter(Boolean));
        if (g.length) { chosenTT = tt; chosenGrp = g[0]; break; }
      }
      if (chosenTT) {
        await page.selectOption('#taxType', chosenTT); await page.waitForTimeout(300);
        await page.selectOption('#groupId', chosenGrp); await page.waitForTimeout(400);
        m.rateRows = await page.evaluate(() => document.querySelectorAll('#taxRateTbody tr').length);

        // ── 3) valid Submit → success flash + row in grid ──
        await page.selectOption('#module', m.moduleOpts[0] || 'Purchase');
        await page.evaluate(s => {
          document.querySelectorAll('#taxRateTbody .tr-pct').forEach(i => { i.value = '77.77'; });
          document.querySelectorAll('#taxRateTbody .tr-desc').forEach(i => { i.value = s; });
        }, data.stamp);
        await page.fill('#endDate', '2026-10-31').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /submit/i }).click()]);
        await page.waitForTimeout(2000);
        m.flashCreate = await ui.flashText(page).catch(() => null);

        await page.goto(`${MIG}/admin/taxes/tax-rates`, { waitUntil: 'commit', timeout: 20000 }).catch(() => {});
        await ui.gridReady(page);
        m.createdInGrid = (await ui.gridHasText(page, '77.77')) || (await ui.gridHasText(page, data.stamp));

        // capture the created id for cleanup ONLY (not a pass/fail signal)
        try {
          createdId = psql(
            `SELECT tm.tax_master_id_pk FROM raptech_scm.tax_master tm ` +
            `JOIN raptech_scm.tax_rates tr ON tr.tax_master_id_fk = tm.tax_master_id_pk ` +
            `WHERE tr.description = $T$${data.stamp}$T$ LIMIT 1`)
            .split('\n').map(s => s.trim()).filter(s => /^\d+$/.test(s))[0] || null;
        } catch (e) { /* report if blocked */ }
      }

      // ── 4) grid columns + row actions parity (legacy: Edit + Details, no Delete) ──
      m.gridCols = await ui.gridColumns(page);
      const rows = await ui.gridRows(page);
      if (rows.length) {
        const idx = rows[0].idx;
        await page.click(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"] button.rap-kebab`).catch(() => {});
        await page.waitForTimeout(300);
        m.rowActions = await page.evaluate(() =>
          [...document.querySelectorAll('.menu-item,[role=menuitem]')].filter(e => e.offsetParent)
            .map(e => e.textContent.trim()).filter(Boolean));
      }
    } finally {
      if (createdId) {
        try {
          psql(`DELETE FROM raptech_scm.tax_rates  WHERE tax_master_id_fk = ${Number(createdId)}`);
          psql(`DELETE FROM raptech_scm.tax_master WHERE tax_master_id_pk = ${Number(createdId)}`);
        } catch (e) { /* report if blocked */ }
      }
    }
    return m;
  },

  check(m) {
    const moduleOk = ['Purchase', 'Sales'].every(x => m.moduleOpts.includes(x));
    const noDelete = m.rowActions.length > 0 && !m.rowActions.some(a => /delete/i.test(a));
    const editDetailsOnly = noDelete &&
      m.rowActions.some(a => /edit/i.test(a)) && m.rowActions.some(a => /detail/i.test(a));
    const wantCols = ['Tax Type', 'Module', 'Group Name', 'Tax Name', 'Tax %'];
    const colsOk = wantCols.every(c => m.gridCols.some(g => g.toLowerCase() === c.toLowerCase()));
    return [
      { aspect: 'Add form renders Module dropdown with Purchase + Sales (F-0026 guard)',
        migrated: JSON.stringify(m.moduleOpts), expected: 'Purchase, Sales', ok: moduleOk },
      { aspect: 'Add form renders Tax Type options', migrated: m.taxTypeCount,
        expected: '> 0', ok: m.taxTypeCount > 0 },
      { aspect: 'Add form shows 3 required (*) markers (Tax Type, Group Tax, Module)',
        migrated: m.reqMarkers, expected: 3, ok: m.reqMarkers === 3 },
      { aspect: 'Tax Type + Group Tax auto-populate >=1 Tax Rate line', migrated: m.rateRows,
        expected: '>= 1', ok: m.rateRows >= 1 },
      { aspect: 'Valid Submit shows "created successfully"', migrated: m.flashCreate || '(none)',
        expected: 'created successfully', ok: /created successfully/i.test(m.flashCreate || '') },
      { aspect: 'Created tax rate appears in the grid', migrated: m.createdInGrid,
        expected: true, ok: m.createdInGrid === true },
      { aspect: 'Grid columns include legacy set (Tax Type, Module, Group Name, Tax Name, Tax %)',
        migrated: JSON.stringify(m.gridCols), expected: wantCols.join(', '), ok: colsOk },
      { aspect: 'Row actions = Edit Tax Rates + Tax Rate Details only (no Delete)',
        migrated: JSON.stringify(m.rowActions), expected: 'Edit + Details only', ok: editDetailsOnly },
    ];
  },
};
