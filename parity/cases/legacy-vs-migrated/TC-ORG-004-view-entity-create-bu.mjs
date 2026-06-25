// TC-ORG-004 — View Entity → create Business Unit (super admin Action: "View Entity")
// Track B: migrated verified against legacy spec. Self-contained fixture.
// Flow: create fixture org → open its Business Units → create a BU → assert it
//       persists and (legacy parity) a NEW BU defaults to ACTIVE.
// NB: BU status convention is legacy-style 0=Active / 1=Inactive (entity-form.html).
import { makeOrgData, createMigratedOrg } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-ORG-004',
  title: 'View Entity — create Business Unit',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/organizations/{id}/entities/new',
  module: 'Admin Settings',
  subModule: 'Organization / Business Units',
  hints: '- Legacy: viewEntity.action / addEntity.action / saveOrUpdateEntity.\n'
       + '- Migrated: OrganizationController.createEntity(); OrganizationServiceImpl.createEntity(); admin/org/entity-form.html.\n'
       + '- BU status: entity-form maps 0=Active, 1=Inactive (opposite of Organization).',

  data() { return makeOrgData('ZZ Entity Org'); },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { orgId } = await createMigratedOrg(page, base, forms, data);

    const buName = `ZZ BU ${data.stamp}`;
    await page.goto(`${MIG}/admin/organizations/${orgId}/entities/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await forms.fillById(page, 'entityName', buName);
    await forms.fillById(page, 'displayName', `BU ${data.stamp}`);
    await forms.fillById(page, 'abbreviation', 'BU1');
    await page.selectOption('#currency', { index: 1 }).catch(() => {});       // first org-enrolled currency
    await page.selectOption('#dateFormat', { value: 'MM/dd/yyyy' }).catch(() => {});
    await forms.fillById(page, 'address1', data.address1);
    await forms.fillById(page, 'country', data.country);
    await forms.fillById(page, 'state', data.state);
    await forms.fillById(page, 'city', data.city);
    await forms.fillById(page, 'postalCode', data.postalCode);
    await forms.fillById(page, 'firstName', data.firstName);
    await forms.fillById(page, 'phoneNo', data.phoneNo);
    await forms.fillById(page, 'email', data.emailId);
    shots.buForm = shot('bu-form'); await page.screenshot({ path: shots.buForm, fullPage: true }).catch(() => {});

    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.getByRole('button', { name: /^create$/i }).click(),
    ]);
    await page.waitForTimeout(2000);
    const afterUrl = page.url();
    const buMatch = afterUrl.match(/entities\/(\d+)/);

    // appears in the BU list?
    await page.goto(`${MIG}/admin/organizations/${orgId}/entities`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const inList = await page.locator(`text=${buName}`).first().isVisible().catch(() => false);
    shots.buList = shot('bu-list'); await page.screenshot({ path: shots.buList, fullPage: true }).catch(() => {});

    // default status of the new BU (read the #status select on its edit page; 0=Active,1=Inactive)
    let statusLabel = null;
    if (buMatch) {
      await page.goto(`${MIG}/admin/organizations/${orgId}/entities/${buMatch[1]}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      statusLabel = await page.evaluate(() => {
        const s = document.querySelector('#status'); if (!s) return null;
        const o = s.options[s.selectedIndex]; return o ? o.textContent.trim() : null;
      });
      shots.buDetail = shot('bu-detail'); await page.screenshot({ path: shots.buDetail, fullPage: true }).catch(() => {});
    }

    return { orgId, buId: buMatch ? buMatch[1] : null, buName, createdOk: !!buMatch, inList, statusLabel, shots };
  },

  check(m) {
    return [
      { aspect: 'Business Unit created', migrated: m.createdOk, expected: true, ok: m.createdOk === true },
      { aspect: 'BU appears in entity list', migrated: m.inList, expected: true, ok: m.inList === true },
      { aspect: 'New BU default status Active', migrated: m.statusLabel, expected: 'Active', ok: m.statusLabel === 'Active' },
    ];
  },
};
