// TC-IPARAM-001 — Org Parameter "Item Type" business rule, end-to-end (PILOT).
// Proves the configure→login-as-org-user→verify loop for parameter business rules.
// As super admin, disable one "Item Type" conditional param for shekar_N's org (36),
// then log in AS shekar_N and confirm that item type is gone from Add Item; then
// restore it and confirm it's back. Non-destructive (restores original state).
//
// Wiring: ItemsRepository.findItemTypesForOrg() → ItemsController.itemTypes() →
// items/form.html #assetOrConsumable. Item-Type params live in conditional package 1
// (type_='Item Type'); cp.ref_id → asset_master row shown in the dropdown.
import { switchOrg } from '../../lib/fixtures.mjs';

const ORG_ID    = 36;             // shekar_N's org
const PARAM_ID  = 14;             // "Travel Item" Item-Type conditional parameter
const TYPE_NAME = 'Travel Item';  // asset_master.value shown in the dropdown
const SANITY    = 'Service Item'; // a different type that must stay visible

export default {
  id: 'TC-IPARAM-001',
  title: 'Org Parameter Item-Type gates Add-Item list (org user)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-parameter → /items/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Item Type) → Items',
  hints: '- Legacy: org "Item Type" conditional params (pkg 1) gate the Add-Item type list.\n'
       + '- Migrated: ItemsRepository.findItemTypesForOrg(); ItemsController.itemTypes(); items/form.html #assetOrConsumable.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);   // super admin
    await switchOrg(page, base, ORG_ID);

    // Configure (super admin): set the Item-Type param enabled/disabled via the Org Parameter form.
    const setParam = async (enabled) => {
      await page.goto(`${MIG}/admin/org-parameter?orgId=${ORG_ID}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.evaluate(({ pid, en }) => {
        const cb = document.querySelector(`input[name="enable_${pid}"]`);
        if (cb) { cb.checked = en; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      }, { pid: PARAM_ID, en: enabled });
      await Promise.all([
        page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /save\/update/i }).click(),
      ]);
      await page.waitForTimeout(1200);
    };

    // Verify (org user shekar_N, separate session): read the Add-Item Item-Type dropdown.
    const readOrgUserItemTypes = async (label) => {
      const browser = page.context().browser();
      const ctx = await browser.newContext();
      const up = await ctx.newPage();
      await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);
      await up.goto(`${MIG}/items/new`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(800);
      const opts = await up.$$eval('#assetOrConsumable option',
        os => os.map(o => o.textContent.trim()).filter(t => t && !/choose the item type/i.test(t)));
      const sc = shot(label); await up.screenshot({ path: sc, fullPage: true }).catch(() => {});
      await ctx.close();
      return { opts, sc };
    };

    // 1) disable Travel Item → org user must NOT see it
    await setParam(false);
    const disabled = await readOrgUserItemTypes('after-disable');
    shots.disabled = disabled.sc;

    // 2) restore (re-enable) → org user sees it again
    await setParam(true);
    const restored = await readOrgUserItemTypes('after-restore');
    shots.restored = restored.sc;

    return {
      disabledCount: disabled.opts.length,
      restoredCount: restored.opts.length,
      travelAfterDisable: disabled.opts.includes(TYPE_NAME),
      sanityAfterDisable: disabled.opts.includes(SANITY),
      travelAfterRestore: restored.opts.includes(TYPE_NAME),
      shots,
    };
  },

  check(m) {
    return [
      { aspect: `Disabled item type hidden from org user (${TYPE_NAME})`, migrated: m.travelAfterDisable ? 'still shown' : 'hidden',
        expected: 'hidden', ok: m.travelAfterDisable === false },
      { aspect: `Other item types still shown (${SANITY})`, migrated: m.sanityAfterDisable, expected: true,
        ok: m.sanityAfterDisable === true, severity: 'warn' },
      { aspect: `Re-enabled item type restored (${TYPE_NAME})`, migrated: m.travelAfterRestore ? 'shown' : 'missing',
        expected: 'shown', ok: m.travelAfterRestore === true },
    ];
  },
};
