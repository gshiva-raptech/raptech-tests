// TC-SA-ROLE-1 — Roles grid: an ACTIVE role must show the "Active" status icon.
//
// EXPECTED (legacy viewRoles.jsp, golden master): the grid Status column renders
// `status > 0 ? Inactive : Active` — i.e. status 0 = ACTIVE (green). A freshly
// created role (status 0) must show the "Active" icon in the grid the user lands on.
//
// RESULT: FAILS (confirmed bug F-0035). `RolePermissionController.roleListRows()`
// returns the RAW status (0 for Active), but the shared grid renderer
// `raptech-grid.js statusIcon` treats `value===1` as Active(green) else Inactive(red).
// Roles use the inverted convention (0=Active), so EVERY active role renders as
// "Inactive". Peer endpoints (ItemsController etc.) normalise 0/null→1 before
// returning; roleListRows() does not.
//
// UI-only: we read the status-cell icon's title attribute in the AG-Grid DOM (what
// the user sees on hover / by colour), never the /rows JSON for pass/fail.
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

function cleanup() {
  try {
    const ids = psql(`SELECT role_id_pk FROM raptech_scm.roles_ WHERE name_ LIKE 'ZZ SAR1Role%';`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length) {
      const list = ids.join(',');
      psql(`DELETE FROM raptech_scm.role_permissions WHERE role_id_fk IN (${list});`);
      psql(`DELETE FROM raptech_scm.roles_ WHERE role_id_pk IN (${list});`);
    }
  } catch (e) { /* best-effort */ }
}

export default {
  id: 'TC-SA-ROLE-1',
  title: 'Roles grid — an Active role shows the Active status icon (not Inactive)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles',
  module: 'Super Admin',
  subModule: 'Roles',
  hints: '- F-0035. Legacy viewRoles.jsp: status>0?Inactive:Active (0=Active).\n- roleListRows() returns raw status; raptech-grid.js statusIcon expects 1=Active → all active roles render Inactive.\n- Fix: normalise 0/null→1, 1→0 in roleListRows() like ItemsController.',

  data() { return { name: makeRoleName('ZZ SAR1Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    try {
      await forms.loginMigrated(page, base, creds.user, creds.pass);
      const MIG = base.replace(/\/+$/, '');
      // Create a fresh ACTIVE role (new roles are status 0 = Active).
      const { roleId } = await createMigratedRole(page, base, data.name, data.group);

      // Go to the grid the user is returned to; find our row by visible name.
      await page.goto(`${MIG}/admin/roles`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.ag-row', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Search the grid for our role so its row is rendered, then read the icon.
      const search = await page.$('#quickSearch');
      if (search) { await search.fill(data.name); await page.waitForTimeout(1000); }

      const icon = await page.evaluate((nm) => {
        const rows = [...document.querySelectorAll('.ag-center-cols-container .ag-row')];
        const row = rows.find(r => [...r.querySelectorAll('.ag-cell')].some(c => c.textContent.includes(nm)));
        if (!row) return { found: false };
        const idx = row.getAttribute('row-index');
        // status cell may be pinned-right; match same row-index there too
        let statusCell = row.querySelector('[col-id="status"]');
        if (!statusCell) {
          const pinned = document.querySelector(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"]`);
          statusCell = pinned ? pinned.querySelector('[col-id="status"]') : null;
        }
        const titled = statusCell ? statusCell.querySelector('[title]') : null;
        return { found: true, title: titled ? titled.getAttribute('title') : null };
      }, data.name);

      shots.grid = shot('grid');
      await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
      return { roleId, icon, shots };
    } finally {
      cleanup();
    }
  },

  check(m) {
    const i = m.icon || {};
    return [
      { aspect: 'New role row visible in grid', migrated: i.found ? 'visible' : 'NOT FOUND', expected: 'visible', ok: i.found === true },
      { aspect: 'Active role status icon (title)', migrated: i.title || '(none)', expected: 'Active', ok: i.title === 'Active', severity: 'medium',
        note: 'F-0035: roleListRows() returns raw status (0=Active) but statusIcon expects 1=Active → renders Inactive.' },
    ];
  },
};
