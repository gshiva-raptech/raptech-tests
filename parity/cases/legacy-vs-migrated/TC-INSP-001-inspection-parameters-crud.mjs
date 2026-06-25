// TC-INSP-001 — Admin → Inspections → Inspection Parameters create / duplicate / edit / delete — Track B.
// inspection_attributes table. Create: Entity* + Parameter Name* + Data Type* (redirects to /{id}).
// Dup guard: org+entity scoped name ("already exists"). Edit: name/description/status editable
// (Entity + Data Type locked). Delete via endpoint (grid has Edit only — no UI delete).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-INSP-001', title: 'Inspection Parameter create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/inspections/inspection-parameters', module: 'Inspections', subModule: 'Inspection Parameters',
  hints: '- InspectionsController inspectionParamCreate (dup name), {id} update, {id}/delete (hard).',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Insp ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/inspections/inspection-parameters/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/inspections/inspection-parameters/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    // first non-empty entity option value
    const firstEntity = async () => page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });

    let id = null, ent = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      // ── CREATE ──
      await page.goto(`${MIG}/admin/inspections/inspection-parameters/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      ent = await firstEntity();
      if (ent) await page.selectOption('#entityId', ent).catch(() => {});
      await page.fill('#fieldName', name).catch(() => {});
      await page.selectOption('#fieldType', 'Text Field').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/inspection-parameters\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.attributeId) === String(id)) : false;

      // ── DUPLICATE (same entity + name) ──
      await page.goto(`${MIG}/admin/inspections/inspection-parameters/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      if (ent) await page.selectOption('#entityId', ent).catch(() => {});
      await page.fill('#fieldName', name).catch(() => {});
      await page.selectOption('#fieldType', 'Text Field').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // ── EDIT (description editable) ──
      if (id) {
        await page.goto(`${MIG}/admin/inspections/inspection-parameters/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await page.fill('#description', `edited ${data.stamp}`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.attributeId) === String(id) && String(r.description) === `edited ${data.stamp}`);
      }

      // ── DELETE (endpoint) ──
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.attributeId) === String(id)); if (deletedGone) id = null; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      // hard cleanup: option-value children first, then the attribute rows (ZZ-named)
      try { psql(`DELETE FROM raptech_scm.inspection_attribute_values WHERE attribute_id_fk IN (SELECT attribute_id_pk FROM raptech_scm.inspection_attributes WHERE field_name LIKE $T$ZZ Insp %$T$)`); } catch (e) { /* best-effort */ }
      try { psql(`DELETE FROM raptech_scm.inspection_attributes WHERE field_name LIKE $T$ZZ Insp %$T$`); } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (org+entity scoped)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (description) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
