// TC-INV-WH-001 — Admin → Inventory → Warehouses create / duplicate / edit / delete — Track B.
// Create: entity (select) + value/name (text) [+ ledger select when org GL param enabled].
// Guard: dup name (org+entity scoped). Edit: name editable (entity locked). Delete via endpoint
// (grid surfaces Edit + Details + Assign User, no Delete).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-INV-WH-001', title: 'Warehouse create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/inventory/warehouses', module: 'Admin Settings', subModule: 'Inventory → Warehouses',
  hints: '- InventoryController warehouseCreate (dup name org+entity guard), {id} update, {id}/delete (hard). warehouse_master table.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ WH ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/inventory/warehouses/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/inventory/warehouses/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    // First entity option, and (if GL param enabled) first ledger option.
    const fillNew = async (nm, entVal) => {
      await page.goto(`${MIG}/admin/inventory/warehouses/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      if (entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await page.fill('#value', nm).catch(() => {});
      // ledger account only present when org GL parameter enabled; fill if it has a real option
      await page.evaluate(() => {
        const e = document.querySelector('#inventoryLedgerAccountId');
        if (e) { const o = [...e.options].find(x => x.value); if (o) e.value = o.value; }
      });
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false, entVal = null, ledgerRequired = false;
    try {
      await page.goto(`${MIG}/admin/inventory/warehouses/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      entVal = await page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      ledgerRequired = await page.evaluate(() => { const e = document.querySelector('#inventoryLedgerAccountId'); return !!e && [...e.options].filter(x => x.value).length === 0; });

      await fillNew(name, entVal);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/warehouses\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.warehouseId) === String(id)) : false;

      await fillNew(name, entVal);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,60}/i); return m ? m[0].trim() : null; });

      if (id) {
        await page.goto(`${MIG}/admin/inventory/warehouses/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#value', `${name} EDIT`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.warehouseId) === String(id) && String(r.value) === `${name} EDIT`);
      }
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.warehouseId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.warehouse_master WHERE value LIKE 'ZZ WH %'`); } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', inGrid, dupMsg, editPersisted, deletedGone, ledgerRequired };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (org+entity)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (name) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
