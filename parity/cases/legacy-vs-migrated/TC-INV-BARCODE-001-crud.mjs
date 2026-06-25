// TC-INV-BARCODE-001 — Admin → Inventory → Barcode Print Format create / guard / edit / delete — Track B.
// This tab enforces ONE ACTIVE format per org (legacy validateBarcodeExist). The grid offers
// Edit + Details (no Delete in menu; a delete endpoint exists). The create form's only "name"
// option is Qty→Quantity, and attributes are checkboxes (UOM / Desc 1 / Desc 2).
//
// Coverage:
//   - GUARD: while an active format already exists, GET /barcode/new redirects with "already exists".
//   - CREATE: temporarily deactivate the org's existing active row (DB), then create a fresh format
//     via the UI (guard now passes) and confirm it lands in the grid.
//   - EDIT: toggle the UOM attribute and confirm it persists (barcode_json).
//   - DELETE: remove via the delete endpoint and confirm it leaves the grid.
//   - RESTORE (finally): hard-delete the created row, restore the org's original active row.
import { psql } from '../../lib/db.mjs';

const ORG_ID = 36; // regular test user (Shekar_N) org

export default {
  id: 'TC-INV-BARCODE-001', title: 'Barcode Print Format create / guard / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/inventory/barcode', module: 'Admin Settings', subModule: 'Inventory → Barcode Print Format',
  hints: '- InventoryController barcodeCreate (one-active-per-org guard), {id} update (attrs), {id}/delete (hard). barcode_detail table.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/inventory/barcode/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/inventory/barcode/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    // remember the org's pre-existing active row so we can restore it
    let preActiveId = null;
    try { preActiveId = psql(`SELECT barcode_id_pk FROM raptech_scm.barcode_detail WHERE org_id_fk=${ORG_ID} AND status=0 ORDER BY barcode_id_pk LIMIT 1`).split('\n')[0].trim() || null; } catch (e) { /* ignore */ }

    let id = null, guardMsg = null, inGrid = false, editPersisted = false, deletedGone = false;
    try {
      // 1) GUARD — with an active format present, the new form must refuse.
      if (preActiveId) {
        await page.goto(`${MIG}/admin/inventory/barcode/new`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);
        guardMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });
      }

      // 2) Deactivate the existing active row so we can exercise a real create.
      if (preActiveId) psql(`UPDATE raptech_scm.barcode_detail SET status=1 WHERE barcode_id_pk=${preActiveId}`);

      // CREATE — name select offers only Qty; tick UOM attribute.
      await page.goto(`${MIG}/admin/inventory/barcode/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      await page.selectOption('#name', { index: 1 }).catch(() => {}); // first real option (Qty)
      await page.check('input[name="barcodeAttrSel"][value="UOM"]').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/barcode\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.barcodeId) === String(id)) : false;

      // EDIT — add Desc 1 attribute, confirm it persists in barcode_json.
      if (id) {
        await page.goto(`${MIG}/admin/inventory/barcode/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(700);
        await page.check('input[name="barcodeAttrSel"][value="Desc 1"]').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        const json = psql(`SELECT barcode_json FROM raptech_scm.barcode_detail WHERE barcode_id_pk=${id}`);
        editPersisted = /Desc 1/.test(json) && /UOM/.test(json);
      }

      // DELETE — via endpoint; confirm it leaves the grid.
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.barcodeId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      // hard-delete any row we created
      if (id) { try { psql(`DELETE FROM raptech_scm.barcode_detail WHERE barcode_id_pk=${id}`); } catch (e) { /* best-effort */ } }
      // belt-and-braces: remove any leftover Qty rows created in this run window for the org that are NOT the original
      // restore the org's original active row
      if (preActiveId) { try { psql(`UPDATE raptech_scm.barcode_detail SET status=0 WHERE barcode_id_pk=${preActiveId}`); } catch (e) { /* best-effort */ } }
    }
    return { id: '(deleted)', guardMsg, inGrid, editPersisted, deletedGone, preActiveId };
  },
  check(m) {
    return [
      { aspect: 'One-active-per-org guard blocks new form', migrated: m.guardMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.guardMsg || '') },
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Edit (attributes) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
