// TC-ORG-007 — Delete Organization guard (super admin)
// Track B, LOCAL ONLY (seeds the dev DB). Self-contained.
// Legacy deleteOrganization (deActivateCheck) blocks deleting an org that has
// active users/suppliers. This case creates a fixture org + BU, seeds a user
// mapped to that org (via DB — the user-create UI is a separate use case), then
// attempts delete and asserts it is BLOCKED and the org survives. Seeded rows are
// cleaned up afterward.
import { makeOrgData, createMigratedOrg, fetchActiveOrgRows } from '../../lib/fixtures.mjs';
import { psql, psqlScalar } from '../../lib/db.mjs';

export default {
  id: 'TC-ORG-007',
  title: 'Delete Organization blocked when it has users (guard)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}/delete',
  module: 'Admin Settings',
  subModule: 'Organization',
  hints: '- Legacy: deleteOrganization.action deActivateCheck (ALL_USERS / ALL_SUPPLIERS).\n'
       + '- Migrated: OrganizationController.deleteOrg() guard (userRepo.countByOrg / supplierRepo.countActiveByOrgId).',

  data() { return makeOrgData('ZZ Guard Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));   // accept the delete confirm()
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);

    // BU under the org → supplies entity_id_fk for the user mapping
    const buName = `ZZ Guard BU ${data.stamp}`;
    await page.goto(`${MIG}/admin/organizations/${orgId}/entities/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await forms.fillById(page, 'entityName', buName);
    await page.selectOption('#currency', { index: 1 }).catch(() => {});
    await page.selectOption('#dateFormat', { value: 'MM/dd/yyyy' }).catch(() => {});
    await forms.fillById(page, 'address1', data.address1);
    await forms.fillById(page, 'country', data.country);
    await forms.fillById(page, 'state', data.state);
    await forms.fillById(page, 'city', data.city);
    await forms.fillById(page, 'postalCode', data.postalCode);
    await forms.fillById(page, 'firstName', data.firstName);
    await forms.fillById(page, 'phoneNo', data.phoneNo);
    await forms.fillById(page, 'email', data.emailId);
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /^create$/i }).click(),
    ]);
    await page.waitForTimeout(1800);
    const entId = (page.url().match(/entities\/(\d+)/) || [])[1];
    if (!entId) throw new Error('guard fixture: BU create failed');

    // seed a user mapped to this org (makes userRepo.countByOrg > 0)
    const username = `zz_guard_${data.stamp}`;
    const seededUserId = psqlScalar(
      `INSERT INTO raptech_scm.users(username, created_by, updated_by, contact_id_fk)
       VALUES ('${username}', 1, 1,
               (SELECT contact_id_pk FROM raptech_scm.contact_details ORDER BY contact_id_pk LIMIT 1))
       RETURNING user_id_pk;`);
    psql(
      `INSERT INTO raptech_scm.org_user_mapping(org_id_fk, entity_id_fk, user_id_fk, del_flag)
       VALUES (${orgId}, ${entId}, ${seededUserId}, 'N');`);

    // attempt delete via the edit-form Delete button — expect BLOCKED
    await page.goto(`${MIG}/admin/organizations/${orgId}?mode=edit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /^delete$/i }).click(),
    ]);
    await page.waitForTimeout(1800);
    const afterUrl = page.url();
    const guardMsg = await page.evaluate(() => {
      const m = document.body.innerText.match(/associated (users|suppliers)[^.]*\.?|deactivate or remove[^.]*\.?/i);
      return m ? m[0].trim() : null;
    });
    shots.afterAttempt = shot('after-delete-attempt'); await page.screenshot({ path: shots.afterAttempt, fullPage: true }).catch(() => {});

    // still in the active-org list? (blocked = yes)
    const rows = await fetchActiveOrgRows(page, base);
    const stillPresent = rows ? rows.some(r => String(r.orgId) === String(orgId)) : null;

    // cleanup the seeded rows (leave the org + BU for the cleanup script)
    psql(`DELETE FROM raptech_scm.org_user_mapping WHERE user_id_fk = ${seededUserId};`);
    psql(`DELETE FROM raptech_scm.users WHERE user_id_pk = ${seededUserId};`);

    return { orgId, entId, seededUserId, afterUrl, guardMsg, stillPresent, shots };
  },

  check(m) {
    return [
      { aspect: 'Seeded user mapped to org (precondition)', migrated: m.seededUserId ? `user ${m.seededUserId}` : 'none',
        expected: 'a user', ok: !!m.seededUserId, severity: 'warn' },
      { aspect: 'Delete BLOCKED — org survives', migrated: m.stillPresent === true ? 'still present (blocked)' : 'deleted',
        expected: 'still present (blocked)', ok: m.stillPresent === true },
      { aspect: 'Guard message shown', migrated: m.guardMsg || '(none)',
        expected: 'associated users / deactivate message', ok: !!m.guardMsg, severity: 'warn' },
    ];
  },
};
