// TC-UIP-19 — Entity dropdown must be populated on the New User form — Track B.
// Manual issue #19: the Entity dropdown is not populated during user creation;
// it should list the (selected org's) applicable entities.
//
// EXPECTED (legacy parity): the New User Entity multiselect lists the active
//   org's entities.
// CURRENT (bug): UserController.populateModel uses
//   entityRepo.findEntitiesForUser(orgId, principal.getUserId()) on create —
//   i.e. only entities the LOGGED-IN user is mapped to. A super-admin who is not
//   mapped to the selected org gets an EMPTY dropdown even though the org has
//   entities. raptech-web/.../controller/admin/UserController.java:542;
//   BusinessEntityRepository.findActiveByOrgForUser (joins org_user_mapping on
//   the current userId).
//
// Repro org: 78 (Oracle_16th) has 6 entities in DB; super-admin (user 1) is NOT
//   mapped there, so the create dropdown is empty. FAILS now, GREEN once the
//   create form scopes entities to the org (findActiveByOrg) like edit does.
import { switchOrg } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const TARGET_ORG = 78;            // Oracle_16th — 6 entities, super-admin not mapped

export default {
  id: 'TC-UIP-19',
  title: '#19 New User Entity dropdown populated with the selected org\'s entities',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/new',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'Manual UI-parity issue #19. New User entity dropdown empty for super-admin. '
       + 'Root cause: UserController.populateModel create branch uses '
       + 'entityRepo.findEntitiesForUser(orgId, currentUserId) — should list the '
       + 'org\'s entities (findActiveByOrg) so a super-admin who is not mapped to '
       + 'the org still sees them. Overlaps F-0013.',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    const switchStatus = await switchOrg(page, base, TARGET_ORG);

    await page.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const entityOptionCount = await page.evaluate(() => {
      const sel = document.querySelector('#entityIds');
      if (!sel) return -1;
      return [...sel.options].filter(o => o.value !== '').length;
    });

    // DB ground truth: entities of the org.
    const dbEntityCount = Number(psql(
      `SELECT count(*) FROM raptech_scm.entity WHERE org_id_fk=${TARGET_ORG};`).trim());

    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' }).catch(() => {});
    await switchOrg(page, base, 1).catch(() => {});

    return { switchStatus, entityOptionCount, dbEntityCount };
  },

  check(m) {
    return [
      {
        aspect: 'Org switch succeeded',
        migrated: m.switchStatus, expected: 200, ok: m.switchStatus === 200, severity: 'warn',
      },
      {
        aspect: 'New User Entity dropdown is populated (option count > 0)',
        migrated: m.entityOptionCount, expected: '> 0', ok: m.entityOptionCount > 0,
      },
      {
        aspect: 'New User Entity dropdown lists ALL of the org\'s entities',
        migrated: m.entityOptionCount, expected: `${m.dbEntityCount} (org ${TARGET_ORG})`,
        ok: m.entityOptionCount === m.dbEntityCount,
      },
    ];
  },
};
