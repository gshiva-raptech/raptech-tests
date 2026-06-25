// TC-FT-GFT-001 — Form Templates → Grid Form Template create / duplicate / delete — Track B.
// Minimum create = pick a template type with no existing template (blanks skipped). Guard: one per
// template type. Delete is soft → hard-clean in finally.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-FT-GFT-001', title: 'Grid Form Template create / duplicate / delete', track: 'B', role: 'regular',
  urlPath: '/admin/form-templates/grid-form-templates', module: 'Admin Settings', subModule: 'Form Templates → Grid Form Templates',
  hints: '- FormTemplatesController gridFormTemplateCreate (one per template type), {id}/delete (soft). grid_form_templates.',
  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/form-templates/grid-form-templates/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/form-templates/grid-form-templates/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    let id = null, createdId = null, inGrid = false, dupMsg = null, deletedGone = false, picked = null;
    const pickFreeType = async () => {
      const existing = (await rows()).map(r => String(r.templateType));
      await page.goto(`${MIG}/admin/form-templates/grid-form-templates/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const v = await page.evaluate((ex) => { const e = document.querySelector('#templateTypeId'); const o = [...(e?.options || [])].find(x => x.value && !ex.includes(x.textContent.trim())); return o ? o.value : null; }, existing);
      if (v) await page.selectOption('#templateTypeId', v).catch(() => {});
      return v;
    };
    try {
      picked = await pickFreeType();
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create template/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/grid-form-templates\/(\d+)/) || [])[1] || null;
      createdId = id;
      inGrid = id ? (await rows()).some(r => String(r.gridFormTemplateId) === String(id)) : false;
      // duplicate (re-select same type → now used)
      await page.goto(`${MIG}/admin/form-templates/grid-form-templates/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      if (picked) await page.selectOption('#templateTypeId', picked).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create template/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,50}/i); return m ? m[0].trim() : null; });
      // delete (soft)
      if (id) { await page.goto(`${MIG}/admin/form-templates/grid-form-templates`, { waitUntil: 'networkidle' }); await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.gridFormTemplateId) === String(id)); }
    } finally {
      if (createdId) { try { psql(`DELETE FROM raptech_scm.grid_form_templates WHERE grid_form_template_id_pk=${createdId}`); } catch (e) { /* best-effort */ } }
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
