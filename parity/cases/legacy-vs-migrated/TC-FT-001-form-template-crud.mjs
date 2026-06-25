// TC-FT-001 — Form Templates → Form Template attribute create / duplicate / edit / delete — Track B.
// FormAttribute = a custom field on a template type (templateTypeId + fieldName + fieldType). A
// simple "Text Field" type avoids needing option-value rows. Dup guard: fieldName per template type.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-FT-001', title: 'Form Template attribute create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/form-templates/form-templates', module: 'Admin Settings', subModule: 'Form Templates → Form Templates',
  hints: '- FormTemplatesController formTemplateCreate (dup fieldName+templateType), {id} update, {id}/delete. table: attributes.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Attr ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/form-templates/form-templates/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/form-templates/form-templates/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (nm) => {
      await page.goto(`${MIG}/admin/form-templates/form-templates/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const tt = await page.evaluate(() => { const e = document.querySelector('#templateTypeId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (tt) await page.selectOption('#templateTypeId', tt).catch(() => {});
      await page.fill('#fieldName', nm).catch(() => {});
      await page.selectOption('#fieldType', 'Text Field').catch(() => {});
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create field/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/form-templates\/form-templates\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.attributeId) === String(id)) : false;

      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create field/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      if (id) {
        const nn = `ZZ Attr Edit ${data.stamp}`;
        await page.goto(`${MIG}/admin/form-templates/form-templates/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.fill('#fieldName', nn).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save changes/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.attributeId) === String(id) && String(r.fieldName) === nn);
      }
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.attributeId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      // RULE 7: delete ONLY this run's stamped rows (create name + edit name), never a broad ZZ% sweep.
      try { psql(`DELETE FROM raptech_scm.attributes WHERE field_name IN ('ZZ Attr ${data.stamp}', 'ZZ Attr Edit ${data.stamp}')`); } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (fieldName) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
