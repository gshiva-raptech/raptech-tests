// TC-UIP-11 — Manual issue #11: "Status section missing on Edit Role page".
//
// EXPECTED (asserted here): the Edit Role page shows a Status control with the
// correct value, and it is editable.
//
// RESULT: PASSES — the issue does NOT reproduce on the current build. The Status
// control IS present. RaptechForm.initStatusToggle() (raptech-form.js) upgrades
// the form.html status <select id="status"> into a visible .status-switch toggle
// in the form header (the original .field is hidden by design but the toggle
// replaces it). On Edit (mode=edit, canEdit=true) the toggle is enabled.
// A manual tester looking only inside the "Role Details" section body would miss
// the toggle that now lives in the form header. (Overlaps F-0004 read-only work.)
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

function cleanup() {
  try {
    const ids = psql(`SELECT role_id_pk FROM raptech_scm.roles_ WHERE name_ LIKE 'ZZ UIP11Role%';`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length) {
      const list = ids.join(',');
      psql(`DELETE FROM raptech_scm.role_permissions WHERE role_id_fk IN (${list});`);
      psql(`DELETE FROM raptech_scm.roles_ WHERE role_id_pk IN (${list});`);
    }
  } catch (e) { /* best-effort */ }
}

export default {
  id: 'TC-UIP-11',
  title: 'Issue #11 — Edit Role page shows Status control (value + editable)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/{id}?mode=edit',
  module: 'Admin Settings',
  subModule: 'Roles',
  hints: '- Manual issue #11.\n- form.html renders status <select> when !isNew; raptech-form.js initStatusToggle() converts it to a visible .status-switch in the form header.\n- Status control present + Active + editable on Edit → issue does not reproduce.',

  data() { return { name: makeRoleName('ZZ UIP11Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    try {
      await forms.loginMigrated(page, base, creds.user, creds.pass);
      const MIG = base.replace(/\/+$/, '');
      const { roleId } = await createMigratedRole(page, base, data.name, data.group);

      await page.goto(`${MIG}/admin/roles/${roleId}?mode=edit`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const st = await page.evaluate(() => {
        const sw = document.querySelector('.status-switch');
        const sel = document.querySelector('#status'); // hidden binding source
        if (!sw) return { present: false, selValue: sel ? sel.value : null };
        const cs = getComputedStyle(sw);
        const cb = sw.querySelector('input[type=checkbox]');
        const nm = sw.querySelector('.st-name');
        return {
          present: true,
          visible: cs.display !== 'none' && cs.visibility !== 'hidden',
          valueText: nm ? nm.textContent.trim() : null,
          editable: cb ? !cb.disabled : null,
          selValue: sel ? sel.value : null,
        };
      });

      shots.edit = shot('edit'); await page.screenshot({ path: shots.edit, fullPage: true }).catch(() => {});
      return { roleId, st, shots };
    } finally {
      cleanup();
    }
  },

  check(m) {
    const s = m.st || {};
    return [
      { aspect: 'Status control present on Edit Role', migrated: s.present ? 'present' : 'MISSING', expected: 'present', ok: s.present === true },
      { aspect: 'Status control visible', migrated: String(s.visible), expected: 'true', ok: s.visible === true },
      { aspect: 'Status value correct (new role = Active)', migrated: `${s.valueText} (select=${s.selValue})`, expected: 'Active (0)', ok: s.valueText === 'Active' && s.selValue === '0' },
      { aspect: 'Status editable on Edit Role', migrated: String(s.editable), expected: 'true', ok: s.editable === true },
    ];
  },
};
