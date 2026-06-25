// TC-SA-USER-1 — Super-Admin Users grid: reachable, columns, and ORG-SCOPED — UI only.
//
// Legacy parity (Track A reference, /admin/viewUser.action): the Users grid a
// super-admin sees is scoped to the *selected* organization — it lists that org's
// users, not every user in the whole platform. Columns: Action, Entity, Emp ID,
// First Name, Last Name, User ID, Email, Role.
//
// What the USER sees here (migrated): the grid page shows a "Total N users" metric
// and AG-Grid rows spanning MANY organizations (the Entity column shows entities
// from orgs other than the one selected in the top-bar switcher). After switching
// the active org, the count/rows do NOT narrow to that org. That is the bug
// (F-0040): UserController.userListRows → userService.findAllForGrid() (ALL orgs)
// for super-admin instead of findAllForGridByOrg(currentOrgId).
//
// UI-ONLY: we read the on-screen metric text and the visible grid Entity cells.
// We do NOT call /rows for pass/fail. We switch org via the top-bar switcher POST
// (the same thing the user's click does) purely as a navigation action.
import { switchOrg } from '../../lib/fixtures.mjs';
import { gridReady, gridRows, gridColumns } from '../../lib/ui.mjs';

const TARGET_ORG = 78;                 // Oracle_16th — a small org (~6-9 users)

export default {
  id: 'TC-SA-USER-1',
  title: 'Users grid reachable + columns + scoped to the selected org (Super Admin)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only. Legacy /admin/viewUser.action is org-scoped. Migrated grid leaks '
       + 'all orgs (metric "Total 4743 users"). Root cause: UserController.userListRows '
       + '→ userService.findAllForGrid() (should be findAllForGridByOrg(currentOrgId)). '
       + 'Overlaps F-0040.',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // Switch the active org via the top-bar switcher (user action), then load grid.
    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    await switchOrg(page, base, TARGET_ORG).catch(() => {});
    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    await gridReady(page);

    const columns = await gridColumns(page);

    // Metric the user reads, e.g. "Total 4743 users".
    const metricCount = await page.evaluate(() => {
      const txt = document.body.innerText.match(/Total\s+([\d,]+)\s+users/i);
      return txt ? Number(txt[1].replace(/,/g, '')) : null;
    });

    // Visible rows → distinct Entity values shown to the user (col index 0 in the
    // center container; "Entity" is the first data column).
    const rows = await gridRows(page);
    const entityCells = rows.map(r => r.cells[0]).filter(Boolean);
    const distinctEntities = [...new Set(entityCells)];

    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' }).catch(() => {});
    await switchOrg(page, base, 1).catch(() => {});

    return { columns, metricCount, distinctEntities, rowCount: rows.length };
  },

  check(m) {
    const expectedCols = ['Entity', 'Emp ID', 'First Name', 'Last Name', 'User ID', 'Email', 'Role'];
    const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const have = m.columns.map(norm);
    const missing = expectedCols.map(norm).filter(c => !have.includes(c));

    return [
      {
        aspect: 'Grid reachable + shows rows',
        migrated: `${m.rowCount} rows`, expected: '> 0 rows',
        ok: m.rowCount > 0, severity: 'warn',
      },
      {
        aspect: 'Legacy columns all present (Entity, Emp ID, First/Last Name, User ID, Email, Role)',
        migrated: m.columns.join(', '),
        expected: expectedCols.join(', '),
        ok: missing.length === 0,
        note: missing.length ? `missing: ${missing.join(', ')}` : '',
      },
      {
        // The core regression guard, read from the on-screen metric.
        aspect: 'Total-users metric reflects ONLY the selected org (not the whole platform)',
        migrated: m.metricCount == null ? '(metric not found)' : `Total ${m.metricCount} users`,
        expected: `a small per-org count (org ${TARGET_ORG} has ~tens of users, NOT thousands)`,
        ok: m.metricCount != null && m.metricCount < 500,
      },
      {
        // A single org's users share that org's (few) entities. Many distinct
        // entity names across just the first screenful of rows means the grid is
        // leaking other orgs' users to the user. (Entity names aren't org names,
        // so this is a supporting signal; the metric above is the hard proof.)
        aspect: 'Visible grid rows belong to the selected org only (few distinct entities)',
        migrated: `${m.distinctEntities.length} distinct entities in the first ${m.rowCount} rows (e.g. ${JSON.stringify(m.distinctEntities.slice(0, 8))})`,
        expected: 'a handful — only the selected org\'s entity/entities',
        ok: m.distinctEntities.length > 0 && m.distinctEntities.length <= 3,
      },
    ];
  },
};
