// TC-UIP-12 — Manual issue #12: "Status section missing on Role Details page".
//
// EXPECTED (asserted here): the Role Details page shows the Status with the
// correct value, rendered read-only (per F-0004 Role Details read-only).
//
// RESULT: PASSES — the issue does NOT reproduce on the current build. As on the
// Edit page, RaptechForm.initStatusToggle() (raptech-form.js) renders the status
// <select> as a visible .status-switch in the form header. On Details (mode=view,
// canEdit=false) the toggle checkbox is disabled (read-only), which is correct.
// A manual tester scanning only the "Role Details" section body would miss the
// toggle that lives in the form header. (Overlaps F-0004.)
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

function cleanup() {
  try {
    const ids = psql(`SELECT role_id_pk FROM raptech_scm.roles_ WHERE name_ LIKE 'ZZ UIP12Role%';`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length) {
      const list = ids.join(',');
      psql(`DELETE FROM raptech_scm.role_permissions WHERE role_id_fk IN (${list});`);
      psql(`DELETE FROM raptech_scm.roles_ WHERE role_id_pk IN (${list});`);
    }
  } catch (e) { /* best-effort */ }
}

export default {
  id: 'TC-UIP-12',
  title: 'Issue #12 — Role Details page shows Status (value + read-only)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/{id}?mode=view',
  module: 'Admin Settings',
  subModule: 'Roles',
  hints: '- Manual issue #12.\n- form.html renders status <select> when !isNew; raptech-form.js initStatusToggle() converts it to a visible .status-switch in the form header.\n- On mode=view (canEdit=false) the toggle is disabled (read-only) → present + Active + read-only, issue does not reproduce. Overlaps F-0004.',

  data() { return { name: makeRoleName('ZZ UIP12Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    try {
      await forms.loginMigrated(page, base, creds.user, creds.pass);
      const MIG = base.replace(/\/+$/, '');
      const { roleId } = await createMigratedRole(page, base, data.name, data.group);

      await page.goto(`${MIG}/admin/roles/${roleId}?mode=view`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const st = await page.evaluate(() => {
        const sw = document.querySelector('.status-switch');
        const sel = document.querySelector('#status');
        if (!sw) return { present: false, selValue: sel ? sel.value : null };
        const cs = getComputedStyle(sw);
        const cb = sw.querySelector('input[type=checkbox]');
        const nm = sw.querySelector('.st-name');
        return {
          present: true,
          visible: cs.display !== 'none' && cs.visibility !== 'hidden',
          valueText: nm ? nm.textContent.trim() : null,
          readOnly: cb ? cb.disabled : null,
          selValue: sel ? sel.value : null,
        };
      });

      shots.view = shot('view'); await page.screenshot({ path: shots.view, fullPage: true }).catch(() => {});
      return { roleId, st, shots };
    } finally {
      cleanup();
    }
  },

  check(m) {
    const s = m.st || {};
    return [
      { aspect: 'Status control present on Role Details', migrated: s.present ? 'present' : 'MISSING', expected: 'present', ok: s.present === true },
      { aspect: 'Status control visible', migrated: String(s.visible), expected: 'true', ok: s.visible === true },
      { aspect: 'Status value correct (new role = Active)', migrated: `${s.valueText} (select=${s.selValue})`, expected: 'Active (0)', ok: s.valueText === 'Active' && s.selValue === '0' },
      { aspect: 'Status read-only on Role Details (F-0004)', migrated: String(s.readOnly), expected: 'true', ok: s.readOnly === true },
    ];
  },
};
