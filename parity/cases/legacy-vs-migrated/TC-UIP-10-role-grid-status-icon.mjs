// TC-UIP-10 — Manual issue #10: Newly created role shows as "Inactive" in the
// Roles grid status column even though it is stored Active.
//
// EXPECTED (asserted here, so it FAILS now = bug reproduced): a freshly-created
// role (stored status=0 = Active) renders the ACTIVE status icon in the grid.
//
// Root cause: RolePermissionController.roleListRows() returns the raw role status
// (0 = Active in roles_.status), but the STATUS_ICON renderer in raptech-grid.js
// (statusIcon: value===1 => green/Active; else red/Inactive) treats 1 as Active.
// So status=0 (Active) renders the red "Inactive" icon. Other controllers
// (ItemsController, FormTemplatesController, PlanningController) normalise
// 0/null Active -> 1 before returning rows; the roles endpoint does not.
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

function cleanup() {
  try {
    const ids = psql(`SELECT role_id_pk FROM raptech_scm.roles_ WHERE name_ LIKE 'ZZ UIP10Role%';`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length) {
      const list = ids.join(',');
      psql(`DELETE FROM raptech_scm.role_permissions WHERE role_id_fk IN (${list});`);
      psql(`DELETE FROM raptech_scm.roles_ WHERE role_id_pk IN (${list});`);
    }
  } catch (e) { /* best-effort */ }
}

export default {
  id: 'TC-UIP-10',
  title: 'Issue #10 — Roles grid shows Active role as Inactive (STATUS_ICON mapping)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles',
  module: 'Admin Settings',
  subModule: 'Roles',
  hints: '- Manual issue #10.\n- roleListRows() returns raw status (0=Active); statusIcon renderer wants 1=Active → Active role shows red Inactive icon.\n- Fix: normalise 0/null→1 in roleListRows (like ItemsController) OR map status in the schema/renderer for roles.',

  data() { return { name: makeRoleName('ZZ UIP10Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    try {
      await forms.loginMigrated(page, base, creds.user, creds.pass);
      const MIG = base.replace(/\/+$/, '');
      const { roleId } = await createMigratedRole(page, base, data.name, data.group);

      // DB truth: a new role is stored Active (status = 0).
      const dbStatus = psql(
        `SELECT status FROM raptech_scm.roles_ WHERE role_id_pk = ${parseInt(roleId, 10)};`).trim();

      // Grid: read the rows endpoint value + the rendered status-icon title for our row.
      await page.goto(`${MIG}/admin/roles`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.ag-row', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(900);

      const rowStatus = await page.evaluate(async (a) => {
        const r = await fetch(a.url, { headers: { Accept: 'application/json' } });
        const j = r.ok ? await r.json() : [];
        const row = j.find(x => String(x.roleId) === String(a.roleId));
        return row ? row.status : null;
      }, { url: `${MIG}/admin/roles/rows`, roleId });

      // Quick-filter the grid to our role so its row is rendered (AG Grid virtualises).
      await page.fill('#quickSearch', data.name).catch(() => {});
      await page.waitForTimeout(900);

      // Rendered icon title for the grid row whose name link matches our role.
      const iconTitle = await page.evaluate((name) => {
        const rows = [...document.querySelectorAll('.ag-row')];
        for (const row of rows) {
          if (row.textContent && row.textContent.includes(name)) {
            const ic = row.querySelector('svg[title], span[title]');
            return ic ? ic.getAttribute('title') : '(no icon title)';
          }
        }
        return '(row not found)';
      }, data.name);

      shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
      return { roleId, dbStatus, rowStatus, iconTitle, shots };
    } finally {
      cleanup();
    }
  },

  check(m) {
    return [
      { aspect: 'New role stored Active in DB', migrated: `roles_.status=${m.dbStatus}`, expected: '0 (Active)', ok: m.dbStatus === '0' },
      { aspect: 'Grid status icon shows Active for an Active role',
        migrated: `icon title="${m.iconTitle}" (rows status=${m.rowStatus})`,
        expected: 'Active', ok: m.iconTitle === 'Active' },
    ];
  },
};
