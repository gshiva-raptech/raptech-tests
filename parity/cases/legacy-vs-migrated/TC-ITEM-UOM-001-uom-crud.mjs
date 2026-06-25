// TC-ITEM-UOM-001 — Admin → Items → UOM create / duplicate / edit / delete — Track B.
// name + description required; dup-name guard; hard delete; @CacheEvict on writes (cache-aware).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-ITEM-UOM-001', title: 'UOM create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/items/uom', module: 'Admin Settings', subModule: 'Items → UOM',
  hints: '- ItemsController uom create (dup name), {id} update, {id}/delete (hard). uom table.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ UOM ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/items/uom/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/items/uom/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (nm) => { await page.goto(`${MIG}/admin/items/uom/new`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600); await page.fill('#name', nm).catch(() => {}); await page.fill('#description', 'desc').catch(() => {}); };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/items\/uom\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.uomId) === String(id)) : false;

      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      if (id) {
        await page.goto(`${MIG}/admin/items/uom/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#description', `edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.uomId) === String(id) && String(r.description) === `edited ${data.stamp}`);
      }
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.uomId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.uom WHERE name_ LIKE 'ZZ UOM %'`); } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (description) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
