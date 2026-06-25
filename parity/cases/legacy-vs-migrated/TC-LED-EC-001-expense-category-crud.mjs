// TC-LED-EC-001 — Ledgers → Expense Category create / duplicate / edit — Track B.
// GL Code (#code) + Group Name (#groupName) required on create. Dup guard: org+type+normalised(code)
// → "already exists". Edit: GL Name (#description) editable (code/group locked read-only on edit).
// Legacy exposes NO Delete for chart-of-account categories — so this case asserts create/dup/edit only;
// the created ZZ row is hard-deleted in finally via the (kept-for-completeness) {id}/delete endpoint + psql.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-LED-EC-001', title: 'Expense Category create / duplicate / edit', track: 'B', role: 'regular',
  urlPath: '/admin/ledgers/expense-category', module: 'Admin Settings', subModule: 'Ledgers → Expense Category',
  hints: '- LedgersController expenseCategoryCreate (dup code, org+type), {id} update (description editable). category table type_=2.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const code = `ZZGL${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/ledgers/expense-category/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/ledgers/expense-category/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (cd) => {
      await page.goto(`${MIG}/admin/ledgers/expense-category/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      await page.fill('#code', cd).catch(() => {});
      await page.fill('#description', 'expense desc').catch(() => {});
      await page.selectOption('#groupName', 'Expense').catch(() => {});
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false;
    try {
      // create
      await fillNew(code);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/expense-category\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.categoryId) === String(id)) : false;

      // duplicate (same code)
      await fillNew(code);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit (change GL Name = description)
      if (id) {
        await page.goto(`${MIG}/admin/ledgers/expense-category/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(700);
        await page.fill('#description', `edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.categoryId) === String(id) && String(r.description) === `edited ${data.stamp}`);
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try { psql(`DELETE FROM raptech_scm.category WHERE code LIKE 'ZZGL%' AND type_=2`); } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, dupMsg, editPersisted };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (org+type+code)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (GL Name) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
    ];
  },
};
