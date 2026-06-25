// TC-FT-LIT-001 — Form Templates → Line Item Template create / duplicate / delete — Track B.
// Minimum create = pick a template type (field rows optional — blanks are skipped). Guard: one per
// template type. Delete is soft → hard-clean in finally.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-FT-LIT-001', title: 'Line Item Template create / duplicate / delete', track: 'B', role: 'regular',
  urlPath: '/admin/form-templates/line-item-templates', module: 'Admin Settings', subModule: 'Form Templates → Line Item Templates',
  hints: '- FormTemplatesController lineItemTemplateCreate (one per template type), {id}/delete (soft). line_item_templates.',
  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/form-templates/line-item-templates/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/form-templates/line-item-templates/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    let id = null, createdId = null, inGrid = false, dupMsg = null, deletedGone = false;
    const pickType = async () => { await page.goto(`${MIG}/admin/form-templates/line-item-templates/new`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600); const v = await page.evaluate(() => { const e = document.querySelector('#templateTypeId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; }); if (v) await page.selectOption('#templateTypeId', v).catch(() => {}); return v; };
    try {
      await pickType();
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create template/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/line-item-templates\/(\d+)/) || [])[1] || null;
      createdId = id;
      inGrid = id ? (await rows()).some(r => String(r.lineItemTemplateId) === String(id)) : false;
      // duplicate (same type)
      await pickType();
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create template/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,50}/i); return m ? m[0].trim() : null; });
      // delete (soft)
      if (id) { await page.goto(`${MIG}/admin/form-templates/line-item-templates`, { waitUntil: 'networkidle' }); await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.lineItemTemplateId) === String(id)); }
    } finally {
      if (createdId) { try { psql(`DELETE FROM raptech_scm.line_item_templates WHERE line_item_template_id_pk=${createdId}`); } catch (e) { /* best-effort */ } }
    }
    return { id: createdId, inGrid, dupMsg, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (one per template type)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
