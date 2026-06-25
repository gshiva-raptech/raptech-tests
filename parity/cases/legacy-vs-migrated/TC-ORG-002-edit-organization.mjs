// TC-ORG-002 — Edit Organization (super admin Action: "Edit Organization")
// Track B: migrated verified against legacy spec. Self-contained fixture.
// Flow: create fixture org → open ?mode=edit → change Display Name + Contact phone
//       → Save Changes → reload → assert the edits persisted and status stayed Active.
import { makeOrgData, createMigratedOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ORG-002',
  title: 'Edit Organization',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}?mode=edit',
  module: 'Admin Settings',
  subModule: 'Organization',
  hints: '- Legacy: editOrganization.action / saveOrUpdateOrganization.action.\n'
       + '- Migrated: OrganizationController.updateOrg() (fetch-then-set); admin/org/form.html.',

  data() { return makeOrgData('ZZ Edit Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);

    const newDisplay = `Edited ${data.stamp}`;
    const newPhone = '9990001112';
    await page.goto(`${MIG}/admin/organizations/${orgId}?mode=edit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await forms.fillById(page, 'displayName', newDisplay);
    await forms.fillById(page, 'phoneNo', newPhone);
    shots.editForm = shot('edit-form'); await page.screenshot({ path: shots.editForm, fullPage: true }).catch(() => {});
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /save changes/i }).click(),
    ]);
    await page.waitForTimeout(2000);

    // reload and read back the persisted values
    await page.goto(`${MIG}/admin/organizations/${orgId}?mode=edit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const gotDisplay = await page.inputValue('#displayName').catch(() => null);
    const gotPhone = await page.inputValue('#phoneNo').catch(() => null);
    const statusName = await page.evaluate(() => {
      const n = document.querySelector('#statusName'); return n ? n.textContent.trim() : null;
    });
    shots.reloaded = shot('reloaded'); await page.screenshot({ path: shots.reloaded, fullPage: true }).catch(() => {});

    return { orgId, gotDisplay, gotPhone, expectedDisplay: newDisplay, expectedPhone: newPhone, statusName, shots };
  },

  check(m) {
    return [
      { aspect: 'Display Name persisted', migrated: m.gotDisplay, expected: m.expectedDisplay, ok: m.gotDisplay === m.expectedDisplay },
      { aspect: 'Contact phone persisted', migrated: m.gotPhone, expected: m.expectedPhone, ok: m.gotPhone === m.expectedPhone },
      { aspect: 'Status stays Active after edit', migrated: m.statusName, expected: 'Active', ok: m.statusName === 'Active', severity: 'warn' },
    ];
  },
};
