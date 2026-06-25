// TC-OUI-TAX-2 — Tax Rates: Edit form saves End Date + locks Type/Group/Module (UI-only).
//
// Regression guard for F-0027 ("Tax Rate edit fails, endDate binding"). The legacy
// editTaxRate.jsp lets a user change the End Date (and Status/Tax %), while Tax Type,
// Group Tax and Module are read-only (locked). Saving must succeed.
//
// Root cause of F-0027 (now fixed): the form posts endDate as a yyyy-MM-dd String which
// could not bind to TaxMasterRecord.endDate (OffsetDateTime) under @ModelAttribute,
// failing the whole update. Fixed via @InitBinder setDisallowedFields("endDate",...)
// + explicit @RequestParam parse. (TaxesController.initBinder / taxRatesUpdate.)
//
// What the USER must SEE (asserted via rendered DOM / on-screen text):
//   1. The Edit form opens with End Date editable and Tax Type / Group Tax / Module
//      shown as read-only inputs (locked) — legacy parity.
//   2. Changing the End Date and clicking Update shows "updated successfully" and
//      returns to the grid (NOT "Failed to update").
//
// This case creates its own tax-rate row to edit, then deletes ONLY that row in a
// finally, identified by a unique stamp written into the rate Description (RULE 7).
import * as ui from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-TAX-2', title: 'Tax Rates — Edit saves End Date + locks Type/Group/Module (UI-only)',
  track: 'B', role: 'regular',
  urlPath: '/admin/taxes/tax-rates', module: 'Admin Settings', subModule: 'Taxes → Tax Rates',
  hints: '- F-0027: edit endDate must persist; @InitBinder disallow endDate; taxRatesUpdate. Locked: Tax Type/Group/Module.',
  data() { return { stamp: 'ZZTAX2 ' + Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const m = { created: false, endDateEditable: null, lockedFields: [], flashEdit: null, urlAfterEdit: null };
    let createdId = null;
    try {
      // ── Prerequisite: create a tax rate via the UI (same flow a tester would) ──
      await page.goto(`${MIG}/admin/taxes/tax-rates/new`, { waitUntil: 'commit', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1800);
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
        await page.selectOption('#module', 'Purchase').catch(() => {});
        await page.evaluate(s => {
          document.querySelectorAll('#taxRateTbody .tr-pct').forEach(i => { i.value = '66.66'; });
          document.querySelectorAll('#taxRateTbody .tr-desc').forEach(i => { i.value = s; });
        }, data.stamp);
        await page.fill('#endDate', '2026-09-30').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /submit/i }).click()]);
        await page.waitForTimeout(2000);
        m.created = /created successfully/i.test((await ui.flashText(page).catch(() => '')) || '');

        try {
          createdId = psql(
            `SELECT tm.tax_master_id_pk FROM raptech_scm.tax_master tm ` +
            `JOIN raptech_scm.tax_rates tr ON tr.tax_master_id_fk = tm.tax_master_id_pk ` +
            `WHERE tr.description = $T$${data.stamp}$T$ LIMIT 1`)
            .split('\n').map(s => s.trim()).filter(s => /^\d+$/.test(s))[0] || null;
        } catch (e) { /* report if blocked */ }
      }

      // ── Edit the created row (F-0027) ──
      if (createdId) {
        await page.goto(`${MIG}/admin/taxes/tax-rates/${createdId}`, { waitUntil: 'commit', timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(1500);
        m.endDateEditable = await ui.isEditable(page, '#endDate');
        // Locked fields render as read-only text inputs (Tax Type, Group Tax, Module)
        m.lockedFields = await page.evaluate(() =>
          [...document.querySelectorAll('input.input[readonly]')].map(x => x.value).filter(Boolean));

        await page.fill('#endDate', '2026-11-30').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /update/i }).click()]);
        await page.waitForTimeout(2000);
        m.urlAfterEdit = page.url();
        m.flashEdit = await page.evaluate(() =>
          document.body.innerText.match(/updated successfully|Failed to update[^\n]*/i)?.[0] || null);
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
    const lockedOk = m.lockedFields.length >= 3; // Tax Type + Group Tax + Module shown read-only
    const backToGrid = /\/admin\/taxes\/tax-rates(\?|$)/.test(m.urlAfterEdit || '');
    return [
      { aspect: 'Prerequisite tax rate created via UI', migrated: m.created, expected: true, ok: m.created === true },
      { aspect: 'Edit form: End Date is editable', migrated: m.endDateEditable, expected: true, ok: m.endDateEditable === true },
      { aspect: 'Edit form locks Tax Type / Group Tax / Module (read-only)', migrated: JSON.stringify(m.lockedFields),
        expected: '3 read-only fields', ok: lockedOk },
      { aspect: 'Saving an End Date change shows "updated successfully" (F-0027 guard)',
        migrated: m.flashEdit || '(none)', expected: 'updated successfully',
        ok: /updated successfully/i.test(m.flashEdit || '') && !/failed/i.test(m.flashEdit || '') },
      { aspect: 'After save returns to the Tax Rates grid', migrated: m.urlAfterEdit || '(none)',
        expected: '/admin/taxes/tax-rates', ok: backToGrid },
    ];
  },
};
