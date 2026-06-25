// TC-SA-OP-1 — Org Parameter conditional-parameter matrix renders (real org, UI-only)
// — Track B. Manual-tester view: switch into a real org, open the page, and confirm
// the USER sees the parameter checkbox matrix grouped by package, the org context,
// the Save/Update button, and that the form is scoped to the selected org.
// Legacy ref: createOrEditOrgParameter.jsp.
import { switchOrg } from '../../lib/fixtures.mjs';

const ORG_ID = 36;

export default {
  id: 'TC-SA-OP-1',
  title: 'Org Parameter — matrix renders (real org, UI-only)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter',
  module: 'Admin Settings',
  subModule: 'Org Parameter',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const switchStatus = await switchOrg(page, base, ORG_ID);

    await page.goto(`${MIG}/admin/org-parameter`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const orgName = await page.evaluate(() => {
      const sp = [...document.querySelectorAll('span')].find(s => /Organization:/i.test(s.textContent));
      return sp ? (sp.nextElementSibling?.textContent || '').trim() : null;
    });
    const paramCount = await page.locator('input.op-param-toggle').count();
    const packageHeads = await page.$$eval('.section .section-head h2', h => h.map(e => e.textContent.trim()));
    const scopedOrgId = await page.locator('input[name="orgId"]').first().inputValue().catch(() => null);
    const hasSave = await page.getByRole('button', { name: /save\/update/i }).count();
    shots.page = shot('page'); await page.screenshot({ path: shots.page, fullPage: true }).catch(() => {});

    return { switchStatus, orgName, paramCount, packageGroups: packageHeads.length, scopedOrgId, hasSave, shots };
  },

  check(m) {
    return [
      { aspect: 'Switched to real org 36', migrated: m.switchStatus, expected: 200, ok: m.switchStatus === 200, severity: 'warn' },
      { aspect: 'Org context shown to user', migrated: m.orgName, expected: 'non-empty', ok: !!m.orgName },
      { aspect: 'Parameter checkbox matrix renders', migrated: m.paramCount, expected: '>=1', ok: (m.paramCount || 0) >= 1 },
      { aspect: 'Parameters grouped by package (sections)', migrated: m.packageGroups, expected: '>=1', ok: (m.packageGroups || 0) >= 1 },
      { aspect: 'Form scoped to selected org', migrated: m.scopedOrgId, expected: String(ORG_ID), ok: m.scopedOrgId === String(ORG_ID) },
      { aspect: 'Save/Update button present', migrated: m.hasSave, expected: '>=1', ok: m.hasSave >= 1 },
    ];
  },
};
