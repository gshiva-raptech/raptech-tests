// TC-SA-USER-9 — Assign Report / Assign Views screens reachable + Assign Report
// persists — UI only.
//
// Legacy parity: "Assign Report" and "Assign Views" are per-user screens reached
// from the grid row. Each lists the org's reports / data views as checkboxes with
// a Save action; ticking one and saving persists the assignment (it stays ticked
// on re-open).
//
// What the USER sees here (migrated): /admin/users/{id}/assign-report shows a
// checkbox list (input[name=reportIds]) + a "Save Assignments" button;
// /admin/users/{id}/assign-views shows input[name=viewIds] + "Save Assignments".
// We tick the first report, Save, re-open, and confirm it stays ticked (success
// banner "Report assignments saved.").
//
// Uses a disposable ZZ user (UI-created) so we never touch a real user's
// assignments. FK-ordered psql cleanup only. UI-ONLY for pass/fail (re-read the
// checkbox state + banner the user sees).
import { submit, flashText } from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-SA-USER-9',
  title: 'Assign Report + Assign Views screens load; Assign Report persists',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/{id}/assign-report',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only. Assign Report/Views per-user screens (UserController). '
       + 'Save button label "Save Assignments"; success "Report assignments saved." '
       + 'Disposable ZZ user; psql cleanup only.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const userName = `zzasg${data.stamp}`;
    let id = null;
    const out = {
      created: false,
      reportCount: 0, reportSaveMsg: null, reportPersisted: null,
      viewsScreenLoaded: false, viewsCount: 0, viewsHasSave: false,
    };

    try {
      // create disposable user via UI
      await page.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.fill('#userName', userName).catch(() => {});
      await page.fill('#newPassword', 'Raptech@12345').catch(() => {});
      await page.fill('#confirmPassword', 'Raptech@12345').catch(() => {});
      await page.fill('#firstName', 'ZZ').catch(() => {});
      await page.fill('#email', `zzasg${data.stamp}@example.com`).catch(() => {});
      await page.fill('#phoneNo', '9999999999').catch(() => {});
      await page.click('.ms-wrap .multiselect').catch(() => {});
      await page.waitForTimeout(300);
      await page.click('.ms-wrap .ms-option').catch(() => {});
      await page.waitForTimeout(200);
      await submit(page, /^create$/i);
      await page.waitForTimeout(1500);
      id = (page.url().match(/admin\/users\/(\d+)/) || [])[1] || null;
      out.created = !!id;

      if (id) {
        // ── Assign Report: tick first → save → re-open → still ticked ──
        await page.goto(`${MIG}/admin/users/${id}/assign-report`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);
        const reportVals = await page.$$eval('input[name=reportIds]', els => els.map(e => e.value));
        out.reportCount = reportVals.length;
        if (reportVals.length) {
          const pick = reportVals[0];
          await page.check(`input[name=reportIds][value="${pick}"]`).catch(() => {});
          await Promise.all([
            page.waitForLoadState('networkidle').catch(() => {}),
            page.getByRole('button', { name: /save assignments/i }).click(),
          ]);
          await page.waitForTimeout(1000);
          out.reportSaveMsg = await flashText(page);
          await page.goto(`${MIG}/admin/users/${id}/assign-report`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(700);
          out.reportPersisted = await page.evaluate(v => {
            const el = document.querySelector(`input[name=reportIds][value="${v}"]`);
            return !!(el && el.checked);
          }, pick);
        }

        // ── Assign Views: screen reachable + has Save button ──
        await page.goto(`${MIG}/admin/users/${id}/assign-views`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        out.viewsScreenLoaded = /assign-views/.test(page.url());
        out.viewsCount = await page.$$eval('input[name=viewIds]', els => els.length).catch(() => 0);
        out.viewsHasSave = await page.getByRole('button', { name: /save assignments/i }).count().then(c => c > 0).catch(() => false);
      }
    } finally {
      if (id) {
        try {
          psql(`DELETE FROM raptech_scm.user_report_detail urd USING raptech_scm.assign_user_report aur WHERE urd.user_report_id_fk=aur.user_report_id_pk AND aur.user_id_fk=${id};`);
          psql(`DELETE FROM raptech_scm.assign_user_report WHERE user_id_fk=${id};`);
          psql(`DELETE FROM raptech_scm.view_user_mapping WHERE user_id_fk=${id};`);
          psql(`DELETE FROM raptech_scm.org_user_mapping WHERE user_id_fk=${id};`);
          psql(`DELETE FROM raptech_scm.user_roles WHERE user_id_fk=${id};`);
          psql(`DELETE FROM raptech_scm.users WHERE user_id_pk=${id};`);
        } catch (e) { out.cleanupErr = String(e).slice(0, 200); }
      }
    }

    return out;
  },

  check(m) {
    return [
      { aspect: 'Disposable test user created', migrated: m.created ? 'created' : 'failed',
        expected: 'created', ok: m.created === true, severity: m.created ? undefined : 'warn' },
      { aspect: 'Assign Report screen lists the org\'s reports (checkboxes)',
        migrated: `${m.reportCount} report checkboxes`, expected: '> 0', ok: m.reportCount > 0 },
      { aspect: 'Saving an Assign Report shows success message',
        migrated: m.reportSaveMsg || '(none)', expected: '"Report assignments saved."',
        ok: /assignments saved/i.test(m.reportSaveMsg || '') },
      { aspect: 'Assigned report persists (still ticked on re-open)',
        migrated: m.reportPersisted, expected: true, ok: m.reportPersisted === true },
      { aspect: 'Assign Views screen reachable with a Save button',
        migrated: `loaded=${m.viewsScreenLoaded}, ${m.viewsCount} view checkbox(es), save=${m.viewsHasSave}`,
        expected: 'screen loads + Save Assignments present',
        ok: m.viewsScreenLoaded === true && m.viewsHasSave === true },
    ];
  },
};
