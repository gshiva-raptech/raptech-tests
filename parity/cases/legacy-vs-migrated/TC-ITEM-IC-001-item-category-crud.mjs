// TC-ITEM-IC-001 — Admin → Items → Item Category create / duplicate / edit / delete — Track B.
// code required (the category name; dup-checked); hard delete; @CacheEvict on writes.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-ITEM-IC-001', title: 'Item Category create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/items/item-categories', module: 'Admin Settings', subModule: 'Items → Item Categories',
  hints: '- ItemsController itemCategory create (dup code), {id} update, {id}/delete (hard). category table.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const code = `ZZCAT${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/items/item-categories/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/items/item-categories/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (cd) => { await page.goto(`${MIG}/admin/items/item-categories/new`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700); await page.fill('#code', cd).catch(() => {}); await page.fill('#description', 'cat desc').catch(() => {}); };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      await fillNew(code);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/item-categories\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.categoryId) === String(id)) : false;

      await fillNew(code);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      if (id) {
        await page.goto(`${MIG}/admin/items/item-categories/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(700);
        await page.fill('#description', `edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.categoryId) === String(id) && String(r.description) === `edited ${data.stamp}`);
      }
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.categoryId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.category WHERE code LIKE 'ZZCAT%'`); } catch (e) { /* best-effort */ }
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
