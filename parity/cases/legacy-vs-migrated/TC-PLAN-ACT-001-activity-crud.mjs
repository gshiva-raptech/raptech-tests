// TC-PLAN-ACT-001 — Admin → Planning → Activities create / duplicate / edit / delete — Track B.
// Create: entity + name + description (status hidden). Dup guard: org + ENTITY scoped name
// ("already exists for this entity"). Edit: name/description/status editable, entity locked.
// No UI delete — delete via {id}/delete endpoint (used here for verification + cleanup).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-PLAN-ACT-001', title: 'Activity create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/planning/activities', module: 'Admin Settings', subModule: 'Planning → Activities',
  hints: '- PlanningController activityCreate (dup org+entity name), {id} update, {id}/delete. resource_task.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Activity ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/planning/activities/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/planning/activities/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    // Always pick the FIRST entity so the dup check (org+entity scoped) actually triggers.
    const fillNew = async (nm) => {
      await page.goto(`${MIG}/admin/planning/activities/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const entVal = await page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await page.fill('#name', nm).catch(() => {});
      await page.fill('#description', 'desc').catch(() => {});
      return entVal;
    };

    let id = null, entVal = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      entVal = await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      inGrid = (await rows()).some(r => String(r.name) === name);
      id = (await rows()).filter(r => String(r.name) === name).map(r => r.resourceTaskId)[0] || null;

      // duplicate (same name + same entity)
      const dupEnt = await fillNew(name);
      if (dupEnt !== entVal && entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,60}/i); return m ? m[0].trim() : null; });

      // edit (change description)
      if (id) {
        await page.goto(`${MIG}/admin/planning/activities/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#description', `edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.resourceTaskId) === String(id) && String(r.description) === `edited ${data.stamp}`);
      }

      // delete (endpoint)
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.resourceTaskId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.resource_task WHERE name_ LIKE 'ZZ Activity %'`); } catch (e) { /* best-effort */ }
    }
    return { inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (org+entity name)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (description) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
