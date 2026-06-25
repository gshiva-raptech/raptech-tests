// TC-FT-SCF-001 — Form Templates → Stagewise Custom Field create / duplicate / delete — Track B.
// Minimum create = entity + workflow (stage attributes only required for "Production" type).
// Guard: one mapping per org+entity+workflow. Delete is hard (deleteById, no cascade).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-FT-SCF-001', title: 'Stagewise Custom Field create / duplicate / delete', track: 'B', role: 'regular',
  urlPath: '/admin/form-templates/stagewise-custom-fields', module: 'Admin Settings', subModule: 'Form Templates → Stagewise Custom Fields',
  hints: '- FormTemplatesController stagwiseCustomFieldCreate (entity+workflow required; dup per org+entity+workflow), {id}/delete.',
  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/form-templates/stagewise-custom-fields/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/form-templates/stagewise-custom-fields/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    let id = null, inGrid = false, dupMsg = null, deletedGone = false, combo = null;
    // workflowId cascades on entity; find a (entity, real-workflow) pair NOT already mapped
    const pickFreeCombo = async () => {
      const existing = (await rows()).map(r => `${r.entityName}||${r.workflowName}`);
      await page.goto(`${MIG}/admin/form-templates/stagewise-custom-fields/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const eOpts = await page.evaluate(() => [...(document.querySelector('#entityId')?.options || [])].map(o => ({ v: o.value, t: o.textContent.trim() })).filter(x => x.v));
      for (const e of eOpts) {
        await page.selectOption('#entityId', e.v).catch(() => {});
        await page.waitForTimeout(900);   // workflow cascade
        const wOpts = await page.evaluate(() => [...(document.querySelector('#workflowId')?.options || [])].map(o => ({ v: o.value, t: o.textContent.trim() })).filter(x => x.v && !/select workflow/i.test(x.t)));
        const w = wOpts.find(x => !existing.includes(`${e.t}||${x.t}`));
        if (w) { await page.selectOption('#workflowId', w.v).catch(() => {}); return { ev: e.v, wv: w.v }; }
      }
      return null;
    };
    try {
      // create
      combo = await pickFreeCombo();
      if (combo) {
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create stagewise custom field/i }).click()]);
        await page.waitForTimeout(1300);
        id = (page.url().match(/stagewise-custom-fields\/(\d+)/) || [])[1] || null;
        inGrid = id ? (await rows()).some(r => String(r.wfLevelAttrId) === String(id)) : false;
      }
      // duplicate (re-select the SAME entity+workflow → now mapped)
      if (combo) {
        await page.goto(`${MIG}/admin/form-templates/stagewise-custom-fields/new`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.selectOption('#entityId', combo.ev).catch(() => {});
        await page.waitForTimeout(900);
        await page.selectOption('#workflowId', combo.wv).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create stagewise custom field/i }).click()]);
        await page.waitForTimeout(1000);
        dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,50}/i); return m ? m[0].trim() : null; });
      }
      // delete via the UI endpoint (F-0023: deleteById doesn't cascade wf_level_stages → FK fail)
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.wfLevelAttrId) === String(id)); }
    } finally {
      // the UI delete FK-fails (F-0023), so clean the created row FK-ordered here
      if (id) {
        try {
          psql(`DELETE FROM raptech_scm.wf_level_attr_mapp WHERE wf_level_stage_id_fk IN (SELECT wf_level_stage_id_pk FROM raptech_scm.wf_level_stages WHERE wf_level_attr_id_fk=${id})`);
          psql(`DELETE FROM raptech_scm.wf_level_stages WHERE wf_level_attr_id_fk=${id}`);
          psql(`DELETE FROM raptech_scm.workflow_level_attributes WHERE wf_level_attr_id_pk=${id}`);
        } catch (e) { /* best-effort */ }
      }
    }
    return { id, inGrid, dupMsg, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (per entity+workflow)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
