// TC-PROD-TL-001 — Admin → Production → Tool create / duplicate / edit / delete — Track B.
// tool_master. toolName required (+ optional rpm/feed/depthOfCut/numberOfCuts); dup-name guard
// (org scoped). Grid menu has Edit only; delete endpoint kept (hard delete) used for cleanup.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-PROD-TL-001', title: 'Tool create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/production/tool', module: 'Production', subModule: 'Production → Tool',
  hints: '- ProductionController tool create (dup name org), {id} update, {id}/delete (hard). tool_master.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Tool ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/production/tool/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/production/tool/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (nm) => { await page.goto(`${MIG}/admin/production/tool/new`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600); await page.fill('#toolName', nm).catch(() => {}); await page.fill('#rpm', '1200').catch(() => {}); await page.fill('#feed', '0.2').catch(() => {}); };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/tool\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.toolId) === String(id)) : false;

      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      if (id) {
        await page.goto(`${MIG}/admin/production/tool/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#rpm', '2400').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.toolId) === String(id) && String(r.rpm) === '2400');
      }
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.toolId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.tool_master WHERE tool_name LIKE 'ZZ Tool %'`); } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (rpm) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
