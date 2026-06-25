// TC-TAX-001 — Admin → Taxes → Tax Rates create / edit / delete — Track B.
//
// CREATE is exercised through the real "Add Tax Rate" UI (/admin/taxes/tax-rates/new).
// That page currently fails to render — Thymeleaf throws while parsing the form
// (form.html line 139: <option th:each="mod : ${modules}">) and the chunked response
// is truncated mid-stream, so the form is unusable and no record can be created via UI.
// See spring.log: TemplateInputException → "Iteration variable cannot be null".
// This case asserts the create form is reachable/usable (currently RED = the real bug).
//
// EDIT + DELETE are still wired (the edit form renders fine), so we DB-seed a TaxMaster +
// TaxRate for the regular user's org (36), then drive the edit form and the delete endpoint.
// Cleanup (FK-ordered): tax_rates by tax_master_id_fk → tax_master by ZZ group_id.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-TAX-001', title: 'Tax Rate create / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/taxes/tax-rates', module: 'Admin Settings', subModule: 'Taxes → Tax Rates',
  hints: '- TaxesController new (dependent Tax Type→Group Tax→rate lines), {id} update, {id}/delete.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const grp = `ZZGRP${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/taxes/tax-rates/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/taxes/tax-rates/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    let createFormUsable = false, id = null, editPersisted = false, deletedGone = false;
    try {
      // ── CREATE via the real UI form (currently broken — bug under test) ──
      await page.goto(`${MIG}/admin/taxes/tax-rates/new`, { waitUntil: 'commit' });
      await page.waitForTimeout(3000);
      // The create form is usable only if Tax Type, Group-Tax, Module and the rate
      // table all render. The render truncates at the Module <option th:each>, so the
      // Module select has no real options and the rates table never appears.
      createFormUsable = await page.evaluate(() => {
        const ready = document.readyState === 'complete';
        const modOpts = [...(document.querySelector('#module')?.options || [])].filter(o => o.value).length;
        const ratesTable = !!document.querySelector('#taxRateTable');
        return ready && modOpts >= 1 && ratesTable;
      });

      // ── DB-seed a TaxMaster + TaxRate so edit/delete can still be verified ──
      const mid = psql(`INSERT INTO raptech_scm.tax_master
          (org_id_fk, tax_type_master_id_fk, group_id, module, status, is_default_tax, created_by, updated_by, created_date, updated_date)
          VALUES (36, 1, '${grp}', 'Purchase', 0, 'N', 1, 1, now(), now())
          RETURNING tax_master_id_pk`);
      id = (mid.match(/\d+/) || [])[0] || null;
      if (id) {
        psql(`INSERT INTO raptech_scm.tax_rates (tax_master_id_fk, group_tax_name_id_fk, tax_percent, description)
              VALUES (${id}, 1, 5.00, 'ZZ seed rate')`);
      }

      // ── EDIT via the (working) edit form: change the rate % + description ──
      if (id) {
        await page.goto(`${MIG}/admin/taxes/tax-rates/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#taxRateTbody tr', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(600);
        await page.fill('#taxRateTbody tr:first-child .tr-pct', '12.50').catch(() => {});
        await page.fill('#taxRateTbody tr:first-child .tr-desc', `ZZ edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1200);
        const pct = psql(`SELECT tax_percent FROM raptech_scm.tax_rates WHERE tax_master_id_fk=${id} ORDER BY tax_rates_id_pk LIMIT 1`);
        const desc = psql(`SELECT description FROM raptech_scm.tax_rates WHERE tax_master_id_fk=${id} ORDER BY tax_rates_id_pk LIMIT 1`);
        editPersisted = /12\.5/.test(pct) && /ZZ edited/.test(desc);
      }

      // ── DELETE via endpoint (grid action menu has Edit + Details only) ──
      // Run from the grid page so the CSRF meta tags are present for the fetch.
      if (id) {
        await page.goto(`${MIG}/admin/taxes/tax-rates`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.taxMasterId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      // FK-ordered hard cleanup of anything ZZ
      try {
        psql(`DELETE FROM raptech_scm.tax_rates WHERE tax_master_id_fk IN (SELECT tax_master_id_pk FROM raptech_scm.tax_master WHERE group_id LIKE 'ZZGRP%')`);
        psql(`DELETE FROM raptech_scm.tax_master WHERE group_id LIKE 'ZZGRP%'`);
      } catch (e) { /* best-effort */ }
    }
    return { createFormUsable, id: '(deleted)', editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create form renders + is usable', migrated: m.createFormUsable, expected: true, ok: m.createFormUsable === true,
        note: 'Add Tax Rate form (/tax-rates/new) truncates: Thymeleaf "Iteration variable cannot be null" at form.html:139 (th:each="mod : ${modules}").' },
      { aspect: 'Edit (rate % + description) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true,
        note: 'Update POST fails MethodArgumentNotValidException: endDate (yyyy-MM-dd String) binds to TaxMasterRecord.endDate (OffsetDateTime) on the @ModelAttribute and cannot convert → error page, edit lost. Affects ALL edits (the date input renders today even when end_date is null).' },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
