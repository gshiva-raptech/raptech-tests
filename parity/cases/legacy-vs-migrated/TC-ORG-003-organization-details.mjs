// TC-ORG-003 — Organization Details (super admin Action: "Organization Details")
// Track B: migrated verified against legacy spec. Self-contained fixture.
// Legacy detailOrganization.action is ALWAYS read-only. Migrated ?mode=view must
// show the org's data with fields read-only and NO Save button.
import { makeOrgData, createMigratedOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ORG-003',
  title: 'Organization Details (read-only view)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}?mode=view',
  module: 'Admin Settings',
  subModule: 'Organization',
  hints: '- Legacy: detailOrganization.action (read-only).\n'
       + '- Migrated: OrganizationController.viewOrg(mode=view) → canEdit=false; admin/org/form.html.',

  data() { return makeOrgData('ZZ Details Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);

    await page.goto(`${MIG}/admin/organizations/${orgId}?mode=view`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const nameVal = await page.inputValue('#name').catch(() => null);
    const nameReadonly = await page.evaluate(() => {
      const el = document.querySelector('#name'); return el ? (el.readOnly || el.disabled) : null;
    });
    const hasSave = await page.getByRole('button', { name: /save changes/i }).count();
    const hasBack = await page.getByRole('link', { name: /organizations/i }).count();
    shots.details = shot('details'); await page.screenshot({ path: shots.details, fullPage: true }).catch(() => {});

    return { orgId, nameVal, expectedName: data.name, nameReadonly, hasSave, hasBack, shots };
  },

  check(m) {
    return [
      { aspect: 'Details shows org name', migrated: m.nameVal, expected: m.expectedName, ok: m.nameVal === m.expectedName },
      { aspect: 'Read-only — no Save button', migrated: m.hasSave === 0 ? 'no save' : 'has save', expected: 'no save', ok: m.hasSave === 0 },
      { aspect: 'Name field is read-only', migrated: m.nameReadonly, expected: true, ok: m.nameReadonly === true },
    ];
  },
};
