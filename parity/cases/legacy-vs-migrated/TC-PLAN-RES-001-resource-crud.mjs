// TC-PLAN-RES-001 — Admin → Planning → Resources create / duplicate / edit / delete — Track B.
// Create: entity + name + description (status hidden, defaults Active). Dup guard: org-scoped name
// ("already exists"). Edit: name/description/status editable, entity locked. No UI delete — delete
// via {id}/delete endpoint (kept for completeness; used here only for cleanup/verification).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-PLAN-RES-001', title: 'Resource create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/planning/resources', module: 'Admin Settings', subModule: 'Planning → Resources',
  hints: '- PlanningController resourceCreate (dup name), {id} update, {id}/delete (hard). resource_master.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Resource ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/planning/resources/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/planning/resources/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (nm) => {
      await page.goto(`${MIG}/admin/planning/resources/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const entVal = await page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await page.fill('#name', nm).catch(() => {});
      await page.fill('#description', 'desc').catch(() => {});
      return entVal;
    };

    let id = null, entVal = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      // create
      entVal = await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      inGrid = (await rows()).some(r => String(r.name) === name);
      id = (await rows()).filter(r => String(r.name) === name).map(r => r.resourceId)[0] || null;

      // duplicate (same name)
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit (change description)
      if (id) {
        await page.goto(`${MIG}/admin/planning/resources/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#description', `edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.resourceId) === String(id) && String(r.description) === `edited ${data.stamp}`);
      }

      // delete (endpoint)
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.resourceId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.resource_master WHERE name_ LIKE 'ZZ Resource %'`); } catch (e) { /* best-effort */ }
    }
    return { inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (org-scoped name)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (description) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
