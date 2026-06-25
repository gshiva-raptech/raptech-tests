// TC-SA-RPERM-1 — Role Permissions: an admin must be able to SAVE a role's
// permission matrix. The mandatory "My Dashboard" tab must not permanently block Save.
//
// EXPECTED (legacy rolePermission.jsp): the mandatory dashboard modules are
// auto-granted; the admin selects permissions and Save succeeds, showing a success
// message. Saving must be possible.
//
// RESULT: FAILS (confirmed bug F-0036, HIGH — permissions can never be saved).
// "Tab - My Dashboard" (module 2) is mandatory → permissions.html renders its tab
// checkbox CHECKED + DISABLED, and for a role with no existing permission row all
// its CRUD flags default false. validatePermissions() iterates EVERY checked
// .perm-tab-cb (incl. the disabled mandatory My Dashboard) and demands ≥1 CRUD flag,
// which the user has no way to set on a disabled control. So clicking Save always
// shows "Please select at least one permission for: Tab - My Dashboard" and never
// succeeds — even after the admin ticks valid permissions on other tabs.
//
// UI-only: drives the real role dropdown + Save button and reads the on-screen
// error/success message; never asserts via /role-permissions JSON or psql.
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

function cleanup() {
  try {
    const ids = psql(`SELECT role_id_pk FROM raptech_scm.roles_ WHERE name_ LIKE 'ZZ SARP1Role%';`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length) {
      const list = ids.join(',');
      psql(`DELETE FROM raptech_scm.role_permissions WHERE role_id_fk IN (${list});`);
      psql(`DELETE FROM raptech_scm.roles_ WHERE role_id_pk IN (${list});`);
    }
  } catch (e) { /* best-effort */ }
}

export default {
  id: 'TC-SA-RPERM-1',
  title: 'Role Permissions — admin can save the matrix (My Dashboard does not block)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/role-permissions',
  module: 'Super Admin',
  subModule: 'Role Permissions',
  hints: '- F-0036 (HIGH). permissions.html:467 renders mandatory tab checkbox checked+disabled.\n- validatePermissions() requires ≥1 CRUD on EVERY checked .perm-tab-cb incl. disabled mandatory My Dashboard → save can never pass.\n- Fix: skip mandatory/disabled tabs in validatePermissions() and/or default mandatory tabs to view=true.',

  data() { return { name: makeRoleName('ZZ SARP1Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    try {
      await forms.loginMigrated(page, base, creds.user, creds.pass);
      const MIG = base.replace(/\/+$/, '');
      // Fresh role with NO permission rows — the failing scenario.
      const { roleId } = await createMigratedRole(page, base, data.name, data.group);

      await page.goto(`${MIG}/admin/role-permissions`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.selectOption('#roleSelect', String(roleId));
      await page.waitForTimeout(1800);

      // Confirm the matrix rendered and the mandatory tab is checked+disabled.
      const pre = await page.evaluate(() => {
        const matrixVisible = getComputedStyle(document.querySelector('#permMatrix')).display !== 'none';
        const mandatory = [...document.querySelectorAll('.perm-tab-cb:disabled:checked')]
          .map(cb => (cb.closest('label')?.querySelector('span')?.textContent || '').trim());
        return { matrixVisible, mandatoryTabs: mandatory };
      });

      // As an admin would: also tick a real permission on a non-mandatory tab so
      // the intent ("grant something and save") is clearly valid.
      await page.evaluate(() => {
        const cand = [...document.querySelectorAll('.perm-tab-cb')].find(cb => !cb.disabled);
        if (cand) {
          cand.checked = true; cand.dispatchEvent(new Event('change', { bubbles: true }));
          const v = document.querySelector('#viewCb_' + cand.dataset.moduleId);
          if (v && !v.disabled) v.checked = true;
        }
      });
      await page.waitForTimeout(300);

      // Click the real Save button.
      await page.click('#permSaveBtn');
      await page.waitForTimeout(2000);

      const result = await page.evaluate(() => {
        const flash = document.querySelector('#permMessage');
        const mainErr = document.querySelector('#permMainError');
        return {
          flashText: flash && getComputedStyle(flash).display !== 'none' ? flash.textContent.trim() : null,
          flashClass: flash ? flash.className : null,
          mainErrText: mainErr && mainErr.offsetParent ? mainErr.textContent.trim() : null,
        };
      });

      shots.save = shot('save'); await page.screenshot({ path: shots.save, fullPage: true }).catch(() => {});
      return { roleId, pre, result, shots };
    } finally {
      cleanup();
    }
  },

  check(m) {
    const p = m.pre || {}, r = m.result || {};
    const saved = !!(r.flashText && /saved|success/i.test(r.flashText)) && /success/.test(r.flashClass || '');
    const blockedByDashboard = /my dashboard/i.test(r.mainErrText || '');
    return [
      { aspect: 'Permission matrix loads for a role', migrated: p.matrixVisible ? 'visible' : 'NOT VISIBLE', expected: 'visible', ok: p.matrixVisible === true },
      { aspect: 'Save succeeds with a success message', migrated: r.flashText || r.mainErrText || '(no message)', expected: 'Role permissions saved successfully.', ok: saved === true, severity: 'high',
        note: 'F-0036: validatePermissions() blocks on the disabled mandatory "Tab - My Dashboard"; Save can never succeed for a role.' },
      { aspect: 'Save NOT blocked by mandatory My Dashboard', migrated: blockedByDashboard ? 'blocked: ' + r.mainErrText : 'not blocked', expected: 'not blocked', ok: blockedByDashboard === false, severity: 'high' },
    ];
  },
};
