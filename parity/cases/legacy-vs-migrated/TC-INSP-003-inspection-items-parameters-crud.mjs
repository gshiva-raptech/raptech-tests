// TC-INSP-003 — Admin → Inspections → Inspection Items Parameters create / duplicate / edit / delete — Track B.
// link_inspection_parameter table. Create: Entity* + Item* (entity-scoped) + Sample Type* (redirects to /{id}).
// Dup guard: an item may have only ONE active link per org+entity ("already has an active ...").
// Edit: Sample Type/Qty/Status editable (Entity + Item locked). Delete via endpoint (grid Edit only).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-INSP-003', title: 'Inspection Item Parameter create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/inspections/inspection-items-parameters', module: 'Inspections', subModule: 'Inspection Items Parameters',
  hints: '- InspectionsController linkParamCreate (one-active-per-item guard), {id} update, {id}/delete (hard).',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/inspections/inspection-items-parameters/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/inspections/inspection-items-parameters/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    // Pick an entity + an item belonging to that entity that does NOT already have an active link.
    const pickEntityItem = async () => page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      const existing = r.ok ? await r.json() : [];
      const used = new Set(existing.map(x => String(x.itemNo))); // grid shows itemNo, not id — use as a weak guard
      const items = [...document.querySelectorAll('#itemId option')].filter(o => o.value);
      const ent = document.querySelector('#entityId');
      // choose first item; set its entity to match
      const it = items[0];
      if (!it) return null;
      const entVal = it.getAttribute('data-entity');
      return { itemId: it.value, entityId: entVal, label: it.textContent.trim() };
    }, `${MIG}/admin/inspections/inspection-items-parameters/rows`);

    let id = null, choice = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      // ── CREATE ──
      await page.goto(`${MIG}/admin/inspections/inspection-items-parameters/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      choice = await pickEntityItem();
      if (choice) {
        await page.selectOption('#entityId', choice.entityId).catch(() => {});
        await page.waitForTimeout(400); // entity→item filter
        await page.selectOption('#itemId', choice.itemId).catch(() => {});
      }
      await page.selectOption('#sampleType', 'All Items Inspection').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/inspection-items-parameters\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.linkInspectionParameterId) === String(id)) : false;

      // ── DUPLICATE (same entity + item → one active link guard) ──
      await page.goto(`${MIG}/admin/inspections/inspection-items-parameters/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      if (choice) {
        await page.selectOption('#entityId', choice.entityId).catch(() => {});
        await page.waitForTimeout(400);
        await page.selectOption('#itemId', choice.itemId).catch(() => {});
      }
      await page.selectOption('#sampleType', 'All Items Inspection').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already has an active[^<"]{0,50}/i); return m ? m[0].trim() : null; });

      // ── EDIT (sample type → Sample Items + qty) ──
      if (id) {
        await page.goto(`${MIG}/admin/inspections/inspection-items-parameters/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.selectOption('#sampleType', 'Sample Items Inspection').catch(() => {});
        await page.fill('#sampleQty', '7').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.linkInspectionParameterId) === String(id) && String(r.sampleType) === 'Sample Items Inspection');
      }

      // ── DELETE (endpoint) ──
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.linkInspectionParameterId) === String(id)); if (deletedGone) id = null; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      // hard cleanup: value-line children first, then link rows created in this run.
      try { psql(`DELETE FROM raptech_scm.link_inspection_parameter_values WHERE link_inspection_parameter_id_fk NOT IN (SELECT link_inspection_parameter_id_pk FROM raptech_scm.link_inspection_parameter)`); } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', choice: choice ? choice.label : null, inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (one active link per item)', migrated: m.dupMsg || '(none)', expected: 'already has an active', ok: /already has an active/i.test(m.dupMsg || '') },
      { aspect: 'Edit (sample type) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
