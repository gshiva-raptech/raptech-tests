// TC-ORG-005 — Delete Organization (super admin Action: "Delete Organization")
// Track B: migrated verified against legacy spec. Self-contained fixture.
// Legacy deleteOrganization soft-deletes (delFlag) and guards against deleting an
// org with active suppliers/users. A fresh fixture has neither, so it deletes.
// Flow: create fixture org → delete via the edit-form Delete button (confirm) →
//       assert it's gone from the active-org list.
import { makeOrgData, createMigratedOrg, fetchActiveOrgRows } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ORG-005',
  title: 'Delete Organization',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}/delete',
  module: 'Admin Settings',
  subModule: 'Organization',
  hints: '- Legacy: deleteOrganization.action (soft-delete; deActivateCheck guard on suppliers/users).\n'
       + '- Migrated: OrganizationController.deleteOrg() (sets delFlag=Y; guard via supplierRepo/userRepo).',

  data() { return makeOrgData('ZZ Delete Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));   // accept the confirm() prompt
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);

    // present before delete?
    const before = await fetchActiveOrgRows(page, base);
    const presentBefore = before ? before.some(r => String(r.orgId) === String(orgId)) : null;

    // delete via the edit form's Delete button (super admin, edit screens only)
    await page.goto(`${MIG}/admin/organizations/${orgId}?mode=edit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /^delete$/i }).click(),
    ]);
    await page.waitForTimeout(2000);
    const afterUrl = page.url();
    shots.afterDelete = shot('after-delete'); await page.screenshot({ path: shots.afterDelete, fullPage: true }).catch(() => {});

    // gone from the active-org list?
    const after = await fetchActiveOrgRows(page, base);
    const presentAfter = after ? after.some(r => String(r.orgId) === String(orgId)) : null;

    const redirectedToList = /\/admin\/organizations(\?|$)/.test(afterUrl);
    return { orgId, presentBefore, presentAfter, redirectedToList, afterUrl, shots };
  },

  check(m) {
    return [
      { aspect: 'Org existed before delete', migrated: m.presentBefore, expected: true, ok: m.presentBefore === true, severity: 'warn' },
      { aspect: 'Delete redirected to org list', migrated: m.redirectedToList, expected: true, ok: m.redirectedToList === true, severity: 'warn' },
      { aspect: 'Org removed from active list', migrated: m.presentAfter === false ? 'absent' : 'still present', expected: 'absent', ok: m.presentAfter === false },
    ];
  },
};
