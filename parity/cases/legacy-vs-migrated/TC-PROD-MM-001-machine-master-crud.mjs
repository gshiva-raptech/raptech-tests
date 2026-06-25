// TC-PROD-MM-001 — Admin → Production → Machine Master create / duplicate / edit / details / delete — Track B.
// task_management_machine. Entity (required, locked on edit) + machineName required; dup-name guard
// (org+entity scoped); Details read-only view. Grid menu: Edit + Details (no Delete) — delete
// endpoint kept (hard delete) used for cleanup.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-PROD-MM-001', title: 'Machine Master create / duplicate / edit / details / delete', track: 'B', role: 'regular',
  urlPath: '/admin/production/machine-master', module: 'Production', subModule: 'Production → Machine Master',
  hints: '- ProductionController machine-master create (entity required, dup org+entity), {id} update, {id}/details (read-only), {id}/delete (hard). task_management_machine.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Machine ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/production/machine-master/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/production/machine-master/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const firstEntity = async () => page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
    const fillNew = async (nm, ent) => {
      await page.goto(`${MIG}/admin/production/machine-master/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const e = ent || await firstEntity();
      if (e) await page.selectOption('#entityId', e).catch(() => {});
      await page.fill('#machineName', nm).catch(() => {});
      await page.fill('#machineDescription', 'desc').catch(() => {});
      return e;
    };

    let id = null, ent = null, inGrid = false, dupMsg = null, editPersisted = false, detailReadOnly = null, deletedGone = false;
    try {
      ent = await fillNew(name, null);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/machine-master\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.machineId) === String(id)) : false;

      // duplicate — same entity
      await fillNew(name, ent);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      if (id) {
        await page.goto(`${MIG}/admin/production/machine-master/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#machineDescription', `edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.machineId) === String(id) && String(r.machineDescription) === `edited ${data.stamp}`);
      }

      if (id) {
        await page.goto(`${MIG}/admin/production/machine-master/${id}/details`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        detailReadOnly = await page.evaluate(() => {
          const body = document.body.innerText || '';
          const hasEditBtn = !![...document.querySelectorAll('button')].find(b => /^(submit|update|create)$/i.test((b.textContent || '').trim()));
          return { renders: body.length > 50, hasEditBtn };
        });
      }

      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.machineId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.task_management_machine WHERE machine_name LIKE 'ZZ Machine %'`); } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, dupMsg, editPersisted, detailReadOnly, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (org+entity)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (description) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Details view read-only (renders, no edit btn)', migrated: JSON.stringify(m.detailReadOnly || {}), expected: 'renders + no edit btn', ok: !!m.detailReadOnly && m.detailReadOnly.renders && !m.detailReadOnly.hasEditBtn },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
