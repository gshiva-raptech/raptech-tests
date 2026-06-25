// TC-SA-USER-5 — New User: Entity dropdown populated for the SELECTED org — UI only.
//
// Legacy parity (addUser.jsp + multiselect-entity.jsp): on the Add User form the
// Entity multiselect lists the SELECTED organization's entities (legacy even has
// an Organization dropdown that drives it). A super-admin always sees the org's
// entities to choose from — the field is required, so an empty list makes user
// creation impossible.
//
// What the USER sees here (migrated): after switching the active org to one the
// super-admin is NOT personally mapped to (org 78 Oracle_16th), the Entity
// dropdown on /admin/users/new is EMPTY — because populateModel's create branch
// uses entityRepo.findEntitiesForUser(orgId, currentUserId) (only the logged-in
// user's own entities) instead of the org's entities. That blocks creation. Bug
// F-0041.
//
// UI-ONLY: open the Entity multiselect widget and count the option rows the user
// can pick. No /rows, no DB.
import { switchOrg } from '../../lib/fixtures.mjs';

const TARGET_ORG = 78;     // Oracle_16th — has entities; super-admin (user 1) not mapped there

export default {
  id: 'TC-SA-USER-5',
  title: 'New User Entity dropdown is populated for the selected org (Super Admin)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/new',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only. Legacy Add User Entity multiselect lists the org\'s entities. '
       + 'Migrated populateModel create branch uses findEntitiesForUser(orgId, '
       + 'currentUserId) → empty for a super-admin not mapped to the org. F-0041.',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' });
    await switchOrg(page, base, TARGET_ORG).catch(() => {});

    await page.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    // Open the data-multiselect widget and count selectable options (what the user sees).
    await page.click('.ms-wrap .multiselect').catch(() => {});
    await page.waitForTimeout(400);
    const widgetOptionCount = await page.evaluate(() =>
      [...document.querySelectorAll('.ms-wrap .ms-option')].length);
    // Fallback: native option count, excluding the empty placeholder.
    const nativeOptionCount = await page.evaluate(() => {
      const sel = document.querySelector('#entityIds');
      return sel ? [...sel.options].filter(o => o.value !== '').length : -1;
    });

    await page.goto(`${MIG}/admin/users`, { waitUntil: 'networkidle' }).catch(() => {});
    await switchOrg(page, base, 1).catch(() => {});

    return { widgetOptionCount, nativeOptionCount };
  },

  check(m) {
    const visible = Math.max(m.widgetOptionCount, m.nativeOptionCount);
    return [
      { aspect: 'New User Entity dropdown is populated for the selected org',
        migrated: `${visible} selectable entity option(s) (widget=${m.widgetOptionCount}, native=${m.nativeOptionCount})`,
        expected: '> 0 (the org\'s entities)', ok: visible > 0 },
    ];
  },
};
