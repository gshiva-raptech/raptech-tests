// TC-UIP-22 — Reporting Manager dropdown must be filtered to the entity — Track B.
// Manual issue #22: the Reporting Manager dropdown shows users not in the selected
// entity; it should be filtered to the selected entity (legacy parity).
//
// EXPECTED (legacy parity): Reporting Manager options belong to the selected
//   entity, not the whole org.
// CURRENT (bug): UserController.populateModel calls
//   userService.findReportingManagerOptions(orgId) — org-wide, never entity-scoped.
//   UserRepository.findReportingManagerCandidates joins org_user_mapping on
//   org_id_fk only (no entity_id_fk).
//   raptech-web/.../controller/admin/UserController.java:546;
//   raptech-persistence/.../repo/admin/UserRepository.java:228-239.
//
// Repro: org 78 (Oracle_16th) has user SU_ora (id 1560) who is in the ORG but NOT
//   in entity 119 (Maintainance). The migrated org-wide RM list wrongly includes
//   SU_ora. The case asserts the RM list equals the entity-119 user set (and that
//   SU_ora is absent). FAILS now (RM is the 9 org users incl. SU_ora), GREEN once
//   RM is entity-scoped.
//
// FIXED (F-0044): the New User form now entity-scopes the RM dropdown. Each RM option
//   carries data-entity-ids (oum.entity_id_fk set); selecting an entity hides managers
//   outside it. This case selects the target entity and asserts the VISIBLE RM options
//   equal the entity user set (and the foreign manager is hidden).
import { switchOrg } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const TARGET_ORG = 78;            // Oracle_16th
const TARGET_ENTITY = 119;        // Maintainance — SU_ora (1560) is NOT in it
const FOREIGN_RM_USERNAME = 'SU_ora';   // org user that should NOT be an RM for entity 119

export default {
  id: 'TC-UIP-22',
  title: '#22 Reporting Manager dropdown filtered to the selected entity',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/new',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'Manual UI-parity issue #22. Reporting Manager dropdown is org-wide, not '
       + 'entity-scoped. Root cause: UserController.populateModel → '
       + 'userService.findReportingManagerOptions(orgId); '
       + 'UserRepository.findReportingManagerCandidates joins org_user_mapping on '
       + 'org_id_fk only (no entity_id_fk). Expected legacy behaviour: filter RM '
       + 'candidates to the selected entity (fetchReportingManagerUserList by entity).',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    const switchStatus = await switchOrg(page, base, TARGET_ORG);

    await page.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Drive the client-side entity filter (F-0044): select the target entity, then read
    // the VISIBLE Reporting Manager options (the fix hides managers outside the entity).
    const rm = await page.evaluate((targetEntity) => {
      const ent = document.querySelector('#entityIds');
      const s   = document.querySelector('#reportingManagerId');
      if (!ent || !s) return null;
      [...ent.options].forEach(o => { o.selected = (o.value === String(targetEntity)); });
      ent.dispatchEvent(new Event('change', { bubbles: true }));
      return [...s.options].filter(o => o.value !== '' && !o.hidden)
               .map(o => ({ id: Number(o.value), label: o.textContent.trim() }));
    }, TARGET_ENTITY);
    const rmIds = (rm || []).map(o => o.id).sort((a, b) => a - b);
    const rmIncludesForeign = (rm || []).some(o => o.label.startsWith(FOREIGN_RM_USERNAME));

    // DB ground truth: users mapped to the SELECTED entity (expected RM set), and
    // the org-wide user set (the current, buggy RM set).
    const entityIds = psql(
      `SELECT DISTINCT user_id_fk FROM raptech_scm.org_user_mapping `
      + `WHERE org_id_fk=${TARGET_ORG} AND entity_id_fk=${TARGET_ENTITY} `
      + `AND (del_flag IS NULL OR del_flag <> 'Y') ORDER BY 1;`)
      .trim().split('\n').filter(Boolean).map(Number).sort((a, b) => a - b);
    const orgIds = psql(
      `SELECT DISTINCT user_id_fk FROM raptech_scm.org_user_mapping `
      + `WHERE org_id_fk=${TARGET_ORG} AND (del_flag IS NULL OR del_flag <> 'Y') ORDER BY 1;`)
      .trim().split('\n').filter(Boolean).map(Number).sort((a, b) => a - b);

    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' }).catch(() => {});
    await switchOrg(page, base, 1).catch(() => {});

    return {
      switchStatus,
      rmCount: (rm || []).length,
      rmIds,
      rmIncludesForeign,
      entityUserCount: entityIds.length,
      orgUserCount: orgIds.length,
      matchesEntitySet: JSON.stringify(rmIds) === JSON.stringify(entityIds),
      matchesOrgSet: JSON.stringify(rmIds) === JSON.stringify(orgIds),
    };
  },

  check(m) {
    return [
      { aspect: 'Org switch succeeded',
        migrated: m.switchStatus, expected: 200, ok: m.switchStatus === 200, severity: 'warn' },
      {
        // Core regression guard: a user NOT in the entity must not be an RM option.
        aspect: `Reporting Manager excludes "${FOREIGN_RM_USERNAME}" (not in entity ${TARGET_ENTITY})`,
        migrated: m.rmIncludesForeign ? 'present (bug)' : 'absent',
        expected: 'absent', ok: m.rmIncludesForeign === false,
      },
      {
        aspect: 'Reporting Manager options match the selected entity\'s user set',
        migrated: `${m.rmCount} options (matchesOrg=${m.matchesOrgSet}, matchesEntity=${m.matchesEntitySet})`,
        expected: `${m.entityUserCount} (entity ${TARGET_ENTITY})`,
        ok: m.matchesEntitySet === true,
      },
    ];
  },
};
