// TC-INV-LEDGER-001 — Admin → Inventory → Inventory Ledger create / duplicate / edit / delete — Track B.
// Create: financeGroup (select) + ledgerAccount (text). Guard: dup ledgerAccount (org-scoped).
// Edit: ledgerAccount editable (financeGroup locked). Delete via endpoint (grid surfaces Edit+Details only).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-INV-LEDGER-001', title: 'Inventory Ledger create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/inventory/inventory-ledger', module: 'Admin Settings', subModule: 'Inventory → Inventory Ledger',
  hints: '- InventoryController ledgerCreate (dup name guard), {id} update, {id}/delete (hard). inventory_ledger table.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Ledger ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/inventory/inventory-ledger/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/inventory/inventory-ledger/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (nm) => {
      await page.goto(`${MIG}/admin/inventory/inventory-ledger/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const fg = await page.evaluate(() => { const e = document.querySelector('#financeGroup'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (fg) await page.selectOption('#financeGroup', fg).catch(() => {});
      await page.fill('#ledgerAccount', nm).catch(() => {});
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/inventory-ledger\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.inventoryLedgerId) === String(id)) : false;

      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      if (id) {
        await page.goto(`${MIG}/admin/inventory/inventory-ledger/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#ledgerAccount', `${name} EDIT`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.inventoryLedgerId) === String(id) && String(r.ledgerAccount) === `${name} EDIT`);
      }
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.inventoryLedgerId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.inventory_ledger WHERE ledger_account LIKE 'ZZ Ledger %'`); } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (ledgerAccount) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
