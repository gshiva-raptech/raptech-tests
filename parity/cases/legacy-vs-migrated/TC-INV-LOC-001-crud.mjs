// TC-INV-LOC-001 — Admin → Inventory → Storage Locations create / duplicate / edit / delete — Track B.
// Create: entity (select) → warehouse (select, client-filtered by entity) + name (text).
// Guard: dup name (org+parent scoped). Edit: name editable (entity/warehouse locked). Delete via
// endpoint (grid surfaces Edit + Detail, no Delete).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-INV-LOC-001', title: 'Storage Location create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/inventory/locations', module: 'Admin Settings', subModule: 'Inventory → Storage Locations',
  hints: '- InventoryController locationCreate (dup name org+parent guard), {id} update, {id}/delete (hard). storage_location table.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Loc ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/inventory/locations/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/inventory/locations/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    // Pick an entity that actually has at least one warehouse (data-entity on the wh options).
    const pickEntityWithWarehouse = async () => page.evaluate(() => {
      const wh = document.querySelector('#warehouse');
      if (!wh) return null;
      const ents = [...wh.options].map(o => o.getAttribute('data-entity')).filter(Boolean);
      return ents.length ? ents[0] : null;
    });

    const fillNew = async (nm, entVal) => {
      await page.goto(`${MIG}/admin/inventory/locations/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      if (!entVal) entVal = await pickEntityWithWarehouse();
      if (entVal) { await page.selectOption('#entityId', entVal); await page.waitForTimeout(400); } // triggers client filter
      // first remaining warehouse option after the entity filter
      const whVal = await page.evaluate(() => { const e = document.querySelector('#warehouse'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (whVal) await page.selectOption('#warehouse', whVal).catch(() => {});
      await page.fill('#name', nm).catch(() => {});
      return entVal;
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false, entVal = null;
    try {
      // discover an entity with a warehouse from a fresh form
      await page.goto(`${MIG}/admin/inventory/locations/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      entVal = await pickEntityWithWarehouse();

      await fillNew(name, entVal);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/locations\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.storageId) === String(id)) : false;

      await fillNew(name, entVal);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,60}/i); return m ? m[0].trim() : null; });

      if (id) {
        await page.goto(`${MIG}/admin/inventory/locations/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#name', `${name} EDIT`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.storageId) === String(id) && String(r.name) === `${name} EDIT`);
      }
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.storageId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.storage_location WHERE name LIKE 'ZZ Loc %'`); } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', inGrid, dupMsg, editPersisted, deletedGone, entVal };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (org+parent)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (name) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
