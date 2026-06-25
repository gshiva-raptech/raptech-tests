// TC-UIP-18 — Users grid must be scoped to the SELECTED org (Super Admin) — Track B.
// Manual issue #18: the Users grid shows users from ALL organizations; it should
// show only the users of the session-active org.
//
// EXPECTED (legacy parity): /admin/users/rows returns only the active org's users.
// CURRENT (bug): UserController.userListRows uses userService.findAllForGrid()
//   (ALL orgs) for super-admin instead of findAllForGridByOrg(currentOrgId).
//   raptech-web/.../controller/admin/UserController.java:150-152.
//
// This case switches to a known org (78 = "Oracle_16th", 9 users in DB) and
// asserts the rows endpoint returns ONLY that org's rows. It FAILS now (rows
// span hundreds of orgs) and goes GREEN once the controller scopes by org.
import { switchOrg } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const TARGET_ORG = 78;            // Oracle_16th
const TARGET_ORG_NAME = 'Oracle_16th';

export default {
  id: 'TC-UIP-18',
  title: '#18 Users grid org-scoped — only the selected org\'s users (Super Admin)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/rows',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'Manual UI-parity issue #18. Super-admin Users grid leaks all orgs. '
       + 'Root cause: UserController.userListRows → userService.findAllForGrid() '
       + '(should be findAllForGridByOrg(principal.getCurrentOrgId())). '
       + 'Overlaps F-0013 org/user binding.',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // Land on a page so CSRF meta exists, then switch the active org.
    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    const switchStatus = await switchOrg(page, base, TARGET_ORG);

    // Read the grid rows AS THE active org now is.
    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const rows = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      return r.ok ? await r.json() : { error: r.status };
    }, `${MIG}/admin/users/rows`);

    // DB ground truth: distinct active users for the target org.
    const dbCount = Number(psql(
      `SELECT count(DISTINCT user_id_fk) FROM raptech_scm.org_user_mapping `
      + `WHERE org_id_fk=${TARGET_ORG} AND (del_flag IS NULL OR del_flag <> 'Y');`).trim());

    const list = Array.isArray(rows) ? rows : [];
    const distinctOrgNames = [...new Set(list.map(r => r.orgName))];
    const foreignOrgCount = distinctOrgNames.filter(n => n !== TARGET_ORG_NAME).length;

    // Switch back to org 1 for tidiness.
    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' }).catch(() => {});
    await switchOrg(page, base, 1).catch(() => {});

    return {
      switchStatus,
      rowCount: list.length,
      distinctOrgCount: distinctOrgNames.length,
      foreignOrgCount,
      dbCount,
      sampleForeign: distinctOrgNames.filter(n => n !== TARGET_ORG_NAME).slice(0, 5),
    };
  },

  check(m) {
    return [
      {
        aspect: 'Org switch succeeded',
        migrated: m.switchStatus, expected: 200, ok: m.switchStatus === 200, severity: 'warn',
      },
      {
        // The core regression guard: NO foreign-org rows in the grid.
        aspect: 'Grid contains only the selected org\'s users (no foreign orgs)',
        migrated: `${m.distinctOrgCount} distinct orgs, ${m.foreignOrgCount} foreign (e.g. ${JSON.stringify(m.sampleForeign)})`,
        expected: '0 foreign orgs',
        ok: m.foreignOrgCount === 0,
      },
      {
        aspect: 'Grid row count matches DB count for the selected org',
        migrated: m.rowCount, expected: `${m.dbCount} (org ${TARGET_ORG})`,
        ok: m.rowCount === m.dbCount,
      },
    ];
  },
};
