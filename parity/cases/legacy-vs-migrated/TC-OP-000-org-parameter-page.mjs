// TC-OP-000 — Org Parameter page loads (super admin tab) — Track B.
// Org-scoped conditional-parameter matrix. Create a fixture org, switch to it, open
// the page, and verify the parameter list renders, Save is present, and the page is
// scoped to the selected org.
import { makeOrgData, createMigratedOrg, switchOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-OP-000',
  title: 'Org Parameter page loads',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter',
  module: 'Admin Settings',
  subModule: 'Org Parameter',
  hints: '- Legacy createOrEditOrgParameter (conditional parameters by package).\n- Migrated: AdminMiscController.orgParameterList(); admin/org-parameter/form.html.',

  data() { return makeOrgData('ZZ OP Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);
    const switchStatus = await switchOrg(page, base, orgId);

    await page.goto(`${MIG}/admin/org-parameter`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const paramCount = await page.locator('input.op-param-toggle').count();
    const hasSave = await page.getByRole('button', { name: /save\/update/i }).count();
    const scopedOrgId = await page.locator('input[name="orgId"]').first().inputValue().catch(() => null);
    shots.page = shot('page'); await page.screenshot({ path: shots.page, fullPage: true }).catch(() => {});

    return { orgId: String(orgId), switchStatus, paramCount, hasSave, scopedOrgId, shots };
  },

  check(m) {
    return [
      { aspect: 'Switched to fixture org', migrated: m.switchStatus, expected: '200', ok: m.switchStatus === 200, severity: 'warn' },
      { aspect: 'Parameter list renders', migrated: m.paramCount, expected: '>=1', ok: (m.paramCount || 0) >= 1 },
      { aspect: 'Scoped to selected org', migrated: m.scopedOrgId, expected: m.orgId, ok: m.scopedOrgId === m.orgId },
      { aspect: 'Save button present', migrated: m.hasSave, expected: '>=1', ok: m.hasSave >= 1, severity: 'warn' },
    ];
  },
};
