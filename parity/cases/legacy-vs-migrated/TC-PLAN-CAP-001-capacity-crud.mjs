// TC-PLAN-CAP-001 — Admin → Planning → Resource Capacities create / overlap-guard / edit / delete — Track B.
// Create (resourceType=Resource): entity + type + resource name (entity-filtered) + 1 task (multiselect)
//   + dailyHours + hourlyRate (req for Resource/Machine) + start/end date. Overlap guard: same
//   resource+entity with an overlapping period → "Resource already exists for this time period."
// Edit: dailyHours/hourlyRate/dates/status editable (entity/type/resource locked). No UI delete —
// delete via {id}/delete endpoint (verification + cleanup; FK-ordered child rows removed in finally).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-PLAN-CAP-001', title: 'Resource Capacity create / overlap-guard / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/planning/resource-capacities', module: 'Admin Settings', subModule: 'Planning → Resource Capacities',
  hints: '- PlanningController capacityCreate (overlap guard), {id} update, {id}/delete. resource_capacity (+ resource_capacity_task child).',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/planning/resource-capacities/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/planning/resource-capacities/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    // Resolve a valid entity + resource (entity-scoped) + a task from the live form options.
    const pick = await page.evaluate(async (u) => {
      await fetch(u).catch(() => {});
      return true;
    }, `${MIG}/admin/planning/resource-capacities/new`);

    // Open the create form and choose a Resource-type capacity for an entity that has a resource.
    async function openForm() {
      await page.goto(`${MIG}/admin/planning/resource-capacities/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
    }
    await openForm();
    const combo = await page.evaluate(() => {
      const res = [...document.querySelectorAll('#resourceId option')].filter(o => o.value)
        .map(o => ({ v: o.value, e: o.getAttribute('data-entity'), t: o.textContent.trim() }));
      const r = res[0] || null;
      const task = [...document.querySelectorAll('#taskIds option')].filter(o => o.value).map(o => o.value)[0] || null;
      return r ? { entityId: r.e, resourceId: r.v, resourceName: r.t, taskId: task } : null;
    });
    if (!combo || !combo.taskId) {
      return { noPrereq: true, inGrid: false, dupMsg: null, editPersisted: false, deletedGone: false };
    }

    // Helper: fill the create form. resourceType=Resource.
    async function fillCreate(startD, endD, daily, rate) {
      await openForm();
      await page.selectOption('#entityId', combo.entityId).catch(() => {});
      await page.selectOption('#resourceType', 'Resource').catch(() => {});
      await page.waitForTimeout(400); // let the type/entity scripts unhide + filter
      await page.selectOption('#resourceId', combo.resourceId).catch(() => {});
      // Task multiselect: drive the widget UI if present, else the native select.
      const droveWidget = await page.evaluate((taskId) => {
        const wrap = document.querySelector('.ms-wrap');
        if (!wrap) return false;
        const ctrl = wrap.querySelector('.multiselect');
        if (ctrl) ctrl.click();
        const opt = [...wrap.querySelectorAll('.ms-option')].find(o => {
          const inp = o.querySelector('input');
          return inp && String(inp.value) === String(taskId);
        }) || wrap.querySelector('.ms-option');
        if (opt && !opt.classList.contains('selected')) opt.click();
        return true;
      }, combo.taskId);
      if (!droveWidget) await page.selectOption('#taskIds', combo.taskId).catch(() => {});
      await page.fill('#dailyHours', String(daily)).catch(() => {});
      await page.fill('#hourlyRate', String(rate)).catch(() => {});
      await page.fill('#startDateStr', startD).catch(() => {});
      await page.fill('#endDateStr', endD).catch(() => {});
    }

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      // create — non-overlapping historical window
      await fillCreate('2025-01-01', '2025-01-31', 8, 100);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /submit/i }).click()]);
      await page.waitForTimeout(1300);
      // Identify the created row precisely by our unique start date (2025-01-01) +
      // resource name — never by "last matching" (resource may already have rows).
      const after = await rows();
      const mine = after.filter(r => String(r.resourceName) === String(combo.resourceName)
        && String(r.startDate || '').startsWith('2025-01-01'));
      id = mine.length ? mine[0].resourceCapacityId : null;
      inGrid = id != null;

      // overlap guard — same resource+entity, period inside the first
      await fillCreate('2025-01-10', '2025-01-20', 8, 100);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /submit/i }).click()]);
      await page.waitForTimeout(1100);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit — change dailyHours
      if (id) {
        await page.goto(`${MIG}/admin/planning/resource-capacities/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.fill('#dailyHours', '9.5').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /submit/i }).click()]);
        await page.waitForTimeout(1100);
        editPersisted = (await rows()).some(r => String(r.resourceCapacityId) === String(id) && Number(r.dailyHours) === 9.5);
      }

      // delete (endpoint)
      if (id) {
        // remove child task mappings first so the FK doesn't block the hard delete
        try { psql(`DELETE FROM raptech_scm.resource_capacity_task WHERE resource_capacity_id_fk = ${Number(id)}`); } catch (e) { /* best-effort */ }
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.resourceCapacityId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      // FK-ordered cleanup: child mappings then the capacity rows we created (ZZ-tagged by date window).
      try {
        psql(`DELETE FROM raptech_scm.resource_capacity_task
              WHERE resource_capacity_id_fk IN (
                SELECT resource_capacity_id_pk FROM raptech_scm.resource_capacity
                WHERE resource_id_fk = ${Number(combo.resourceId)}
                  AND entity_id_fk = ${Number(combo.entityId)}
                  AND start_date >= DATE '2025-01-01' AND start_date < DATE '2025-02-01')`);
        psql(`DELETE FROM raptech_scm.resource_capacity
              WHERE resource_id_fk = ${Number(combo.resourceId)}
                AND entity_id_fk = ${Number(combo.entityId)}
                AND start_date >= DATE '2025-01-01' AND start_date < DATE '2025-02-01'`);
      } catch (e) { /* best-effort */ }
    }
    return { inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    if (m.noPrereq) {
      return [{ aspect: 'Prerequisites (entity+resource+task) available', migrated: 'missing', expected: 'present', ok: false }];
    }
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Overlap blocked (same resource+entity period)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (dailyHours) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
