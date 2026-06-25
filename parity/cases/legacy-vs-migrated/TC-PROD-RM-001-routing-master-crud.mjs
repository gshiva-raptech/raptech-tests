// TC-PROD-RM-001 — Admin → Production → Routing Master create / duplicate / edit / details / delete — Track B.
// production_task_template (+ details). Entity (required, locked on edit) + templateName (required,
// locked on edit); dup-name guard (org+entity scoped). Detail rows (task steps) saved via detailsJson
// (delete-then-reinsert). Edit allows item/status. Details read-only. Grid menu: Edit + Details
// (no Delete) — delete endpoint kept (cascades details) used for cleanup.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-PROD-RM-001', title: 'Routing Master create / duplicate / edit / details / delete', track: 'B', role: 'regular',
  urlPath: '/admin/production/routing-master', module: 'Production', subModule: 'Production → Routing Master',
  hints: '- ProductionController routing-master create (entity required, dup org+entity, detail rows via detailsJson), {id} update (status/item), {id}/details (read-only), {id}/delete (cascades details). production_task_template(+_details).',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Routing ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/production/routing-master/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/production/routing-master/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    // pick an entity that actually has at least one active task (so a detail step can be added).
    // Derive from the entity options the form actually rendered ∩ an active task in that entity (DB).
    const pickEntityWithTask = async () => {
      const ents = await page.evaluate(() => [...(document.querySelector('#entityId')?.options || [])].map(o => o.value).filter(Boolean));
      for (const e of ents) {
        let tid = '';
        try { tid = psql(`SELECT task_management_tasks_id_pk FROM raptech_scm.task_management_tasks WHERE entity_id_fk=${Number(e)} AND (status IS NULL OR status=0) ORDER BY task_management_tasks_id_pk LIMIT 1`).trim().split(/\r?\n/)[0] || ''; } catch (x) { tid = ''; }
        if (tid) return { entityId: e, taskId: String(tid) };
      }
      return { entityId: ents[0] || null, taskId: null };
    };
    const submit = async () => Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^(create|update)$/i }).click()]);

    let id = null, ent = null, inGrid = false, dupMsg = null, detailSaved = null, statusPersisted = false, detailReadOnly = null, deletedGone = false;
    try {
      // create with one detail step
      await page.goto(`${MIG}/admin/production/routing-master/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const pick = await pickEntityWithTask();
      ent = pick.entityId;
      if (ent) { await page.selectOption('#entityId', ent).catch(() => {}); await page.waitForTimeout(400); }
      await page.fill('#templateName', name).catch(() => {});
      if (pick.taskId) {
        await page.evaluate(() => window.addDetailRow && window.addDetailRow());
        await page.waitForTimeout(300);
        await page.selectOption('#detailTbody tr:last-child .d-task-select', pick.taskId).catch(() => {});
        await page.fill('#detailTbody tr:last-child .d-est-hrs', '1.30').catch(() => {});
      }
      await submit();
      await page.waitForTimeout(1400);
      id = (page.url().match(/routing-master\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.productionTaskTemplateId) === String(id)) : false;
      if (id && pick.taskId) {
        const cnt = psql(`SELECT count(*) FROM raptech_scm.production_task_template_details WHERE production_task_template_id_fk=${id}`).trim();
        detailSaved = Number(cnt) >= 1;
      } else detailSaved = 'n/a';

      // duplicate — same entity + same name
      await page.goto(`${MIG}/admin/production/routing-master/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      if (ent) { await page.selectOption('#entityId', ent).catch(() => {}); await page.waitForTimeout(300); }
      await page.fill('#templateName', name).catch(() => {});
      await submit();
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit (change status → Inactive)
      if (id) {
        await page.goto(`${MIG}/admin/production/routing-master/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        // #status lives in a collapsible section that is hidden by default — set via DOM + change event
        await page.evaluate(() => { const s = document.querySelector('#status'); if (s) { s.value = '1'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
        await submit();
        await page.waitForTimeout(1000);
        const st = psql(`SELECT COALESCE(status,0) FROM raptech_scm.production_task_template WHERE production_task_template_id_pk=${id}`).trim();
        statusPersisted = st === '1';
      }

      // details (read-only)
      if (id) {
        await page.goto(`${MIG}/admin/production/routing-master/${id}/details`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        detailReadOnly = await page.evaluate(() => {
          const body = document.body.innerText || '';
          const hasEditBtn = !![...document.querySelectorAll('button')].find(b => /^(submit|update|create)$/i.test((b.textContent || '').trim()));
          return { renders: body.length > 50, hasEditBtn };
        });
      }

      // delete (endpoint — cascades details)
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(r => String(r.productionTaskTemplateId) === String(id)); id = deletedGone ? null : id; }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      try {
        const ids = psql(`SELECT production_task_template_id_pk FROM raptech_scm.production_task_template WHERE template_name LIKE 'ZZ Routing %'`).trim().split(/\r?\n/).filter(Boolean);
        for (const tid of ids) psql(`DELETE FROM raptech_scm.production_task_template_details WHERE production_task_template_id_fk=${tid}`);
        psql(`DELETE FROM raptech_scm.production_task_template WHERE template_name LIKE 'ZZ Routing %'`);
      } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, dupMsg, detailSaved, statusPersisted, detailReadOnly, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Detail step (task) persisted', migrated: m.detailSaved, expected: 'true or n/a', ok: m.detailSaved === true || m.detailSaved === 'n/a' },
      { aspect: 'Duplicate blocked (org+entity)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (status→Inactive) persisted', migrated: m.statusPersisted, expected: true, ok: m.statusPersisted === true },
      { aspect: 'Details view read-only (renders, no edit btn)', migrated: JSON.stringify(m.detailReadOnly || {}), expected: 'renders + no edit btn', ok: !!m.detailReadOnly && m.detailReadOnly.renders && !m.detailReadOnly.hasEditBtn },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
