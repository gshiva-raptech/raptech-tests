// TC-WF-001 — Approval Flow create / duplicate / details / assign-users / delete — Track B.
// Minimum create = select an Approval Type + submit (locked first/last stages auto-include and are
// exempt from stage validation; only middle stages need alias+roles). Guard: one active flow per type.
// Pick a type that has no existing flow so create succeeds, then test dup, details, assign-users, delete.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-WF-001', title: 'Approval Flow create / duplicate / details / assign-users / delete', track: 'B', role: 'regular',
  urlPath: '/admin/workflows/approval-flows', module: 'Admin Settings', subModule: 'Workflows → Approval Flows',
  hints: '- WorkflowController approvalFlowCreate (one-active-per-type guard), {id}/details, {id}/assign-users, {id}/delete.',
  async runMigrated({ page, base, creds, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/workflows/approval-flows/rows`);

    let id = null, createdId = null, inGrid = false, dupMsg = null, detailReadOnly = null, assignReachable = false, deletedGone = false, typeName = null;
    try {
      // pick an Approval Type with no existing active flow
      const existing = (await rows()).map(r => String(r.approvalType));
      await page.goto(`${MIG}/admin/workflows/approval-flows/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const pick = await page.evaluate((ex) => {
        const sel = document.querySelector('#wtypeId');
        const opt = [...(sel?.options || [])].find(o => o.value && !ex.includes(o.textContent.trim()));
        return opt ? { v: opt.value, t: opt.textContent.trim() } : null;
      }, existing);
      typeName = pick ? pick.t : null;

      // ── create ──
      if (pick) {
        await page.selectOption('#wtypeId', pick.v).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
        await page.waitForTimeout(1500);
        id = (page.url().match(/approval-flows\/(\d+)/) || [])[1] || null;
        createdId = id;   // preserved for hard cleanup (UI delete is soft)
        inGrid = id ? (await rows()).some(r => String(r.wfTmId) === String(id)) : false;
      }

      // ── duplicate (same type) ──
      if (pick) {
        await page.goto(`${MIG}/admin/workflows/approval-flows/new`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.selectOption('#wtypeId', pick.v).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
        await page.waitForTimeout(1000);
        dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });
      }

      // ── details (read-only) ──
      if (id) {
        await page.goto(`${MIG}/admin/workflows/approval-flows/${id}/details`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        detailReadOnly = await page.evaluate(() => {
          const typeShown = !!document.querySelector('#wtypeId, #typeNameRo');
          const hasSave = !![...document.querySelectorAll('button')].find(b => /^(create|update)$/i.test((b.textContent || '').trim()));
          return { typeShown, hasSaveBtn: hasSave };
        });
      }

      // ── assign users screen reachable ──
      if (id) {
        const resp = await page.goto(`${MIG}/admin/workflows/approval-flows/${id}/assign-users`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        assignReachable = !!resp && resp.status() < 400 && /assign-users/.test(page.url());
      }

      // ── delete ──
      if (id) {
        await page.goto(`${MIG}/admin/workflows/approval-flows`, { waitUntil: 'networkidle' });
        await page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/workflows/approval-flows/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
        await page.waitForTimeout(900);
        deletedGone = !(await rows()).some(r => String(r.wfTmId) === String(id));
      }
    } finally {
      // UI delete is soft (del_flag='Y') and leaves the stage rows — hard-remove the created
      // flow + its stages/roles so test runs don't accumulate soft-deleted junk.
      if (createdId) {
        try {
          psql(`DELETE FROM raptech_scm.stage_by_type_roles WHERE stage_by_type_id_fk IN (SELECT stage_by_type_id_pk FROM raptech_scm.workflow_stage_by_type WHERE wf_tm_fk=${createdId})`);
          psql(`DELETE FROM raptech_scm.workflow_stage_by_type WHERE wf_tm_fk=${createdId}`);
          psql(`DELETE FROM raptech_scm.workflow_type_mapping WHERE wf_tm_pk=${createdId}`);
        } catch (e) { /* best-effort */ }
      }
    }
    return { typeName, inGrid, dupMsg, detailReadOnly, assignReachable, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: `${m.typeName || '?'} → ${m.inGrid}`, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (one active flow per type)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Details view read-only (type shown, no Create/Update btn)', migrated: JSON.stringify(m.detailReadOnly || {}), expected: 'shown + no save btn', ok: !!m.detailReadOnly && m.detailReadOnly.typeShown && !m.detailReadOnly.hasSaveBtn },
      { aspect: 'Assign-users screen reachable', migrated: m.assignReachable, expected: true, ok: m.assignReachable === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
