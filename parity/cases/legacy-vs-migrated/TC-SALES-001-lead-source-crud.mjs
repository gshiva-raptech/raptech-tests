// TC-SALES-001 — Admin → Sales → Lead Source create / duplicate / edit / delete — Track B.
// custom_status-backed (TYPE='Lead Source'). Create: statusName only (redirects to list).
// Dup guard: org+type scoped "already exists". Edit: name editable. Delete via endpoint (no UI action).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-SALES-001', title: 'Lead Source create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/sales/lead-source', module: 'Sales', subModule: 'Lead Source (custom-status)',
  hints: '- SalesController tabCreate (dup name), tabUpdate, tab/{id}/delete. custom_status table.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Lead Src ${data.stamp}`;
    const editName = `ZZ Lead Src Edit ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/sales/lead-source/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/sales/lead-source/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (nm) => { await page.goto(`${MIG}/admin/sales/lead-source/new`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600); await page.fill('#statusName', nm).catch(() => {}); };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      let r = await rows();
      const created = r.find(x => String(x.statusName) === name);
      id = created ? String(created.customStatusId) : null;
      inGrid = !!created;

      // duplicate
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit name
      if (id) {
        await page.goto(`${MIG}/admin/sales/lead-source/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#statusName', editName).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(x => String(x.customStatusId) === id && String(x.statusName) === editName);
      }

      // delete (endpoint — grid has no delete action)
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(x => String(x.customStatusId) === id); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.custom_status WHERE type=$T$Lead Source$T$ AND status_name LIKE $T$ZZ Lead Src%$T$`); } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (name) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
