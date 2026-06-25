// TC-CC-001 — Admin → Cost Centers create / duplicate / edit / delete — Track B.
// CostCentersController: code required; dup-code guard (org+type3+group 'Cost Centre');
// {id} update (code/description/budget/status); {id}/delete (hard, category row).
// Cleanup: category type_=3 group 'Cost Centre' rows with ZZ code, FK-safe (no children seeded).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-CC-001', title: 'Cost Center create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/cost-centers/cost-centers', module: 'Admin Settings', subModule: 'Cost Centers',
  hints: '- CostCentersController create (dup code), {id} update, {id}/delete (hard). category table type_=3.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const code = `ZZCC${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/cost-centers/cost-centers/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/cost-centers/cost-centers/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (cd, desc) => {
      await page.goto(`${MIG}/admin/cost-centers/cost-centers/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      await page.fill('#code', cd).catch(() => {});
      await page.fill('#description', desc).catch(() => {});
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      // create
      await fillNew(code, 'ZZ cost centre');
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/cost-centers\/cost-centers\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.categoryId) === String(id)) : false;

      // duplicate (same code)
      await fillNew(code, 'dup attempt');
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit (change description)
      if (id) {
        await page.goto(`${MIG}/admin/cost-centers/cost-centers/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#description', `edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.categoryId) === String(id) && String(r.description) === `edited ${data.stamp}`);
      }

      // delete (endpoint — grid surfaces Edit + Details only)
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.categoryId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.category WHERE type_=3 AND group_name='Cost Centre' AND code LIKE 'ZZCC%'`); } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (dup code)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (description) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
