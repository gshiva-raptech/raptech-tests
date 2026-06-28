// TC-PARAM-SO-ORDERTYPE — Order Type dropdown gates (org params 23/24/25/26/72) on the
// new Sales Order form (Section 2 of ORG-PARAMETER-BEHAVIOR-SPEC, F-0006 class).
//
// Spec rule: each Order-Type org param, when ON, makes its option appear in the
// "Order Type" (#poType) dropdown; OFF → hidden. Migrated additionally applies a
// fail-safe: if NONE are enabled, ALL options show (so SO creation never breaks).
//   [26] Standard Order - Inventory   value "Inventory PO"
//   [23] Standard Order - Non-Inventory value "Normal PO"
//   [24] Blanket Order                 value "Blanket PO"
//   [25] Service Order                 value "Work Order"
//   [72] Rental Order                  value "Rental Order"
//
// ISOLATION: creates its OWN throwaway fixture org (createMigratedOrg) and toggles
// params ONLY on that org. NEVER touches shared org 36. The fresh fixture org has no
// regular-user assignment, so the form is viewed in the SAME super-admin session that
// switched into the fixture org (session-active org drives SalesOrdersController
// addFormLookups). Track B (migrated-only): legacy has no equivalent throwaway org.
import { createMigratedOrg, makeOrgData, switchOrg, setOrgParam } from '../../lib/fixtures.mjs';

const URL = '/sales-orders/sales-orders/new';
const ALL_TYPES = [
  { pid: 26, label: 'Standard Order - Inventory' },
  { pid: 23, label: 'Standard Order - Non-Inventory' },
  { pid: 24, label: 'Blanket Order' },
  { pid: 25, label: 'Service Order' },
  { pid: 72, label: 'Rental Order' },
];

export default {
  id: 'TC-PARAM-SO-ORDERTYPE-23-26-72',
  title: 'Sales Order "Order Type" dropdown gated by params 23/24/25/26/72 (own fixture org)',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Order) → Order Type dropdown gates',
  hints: '- SalesOrdersController.addFormLookups: SO_TYPE_OPTIONS filtered by orgParamRepo.findEnabledParameterIds (params 23-26/72); fallback = all when none enabled.',

  data() { return {}; },

  async runMigrated({ page, base, creds }) {
    const MIG = base.replace(/\/+$/, '');
    const { loginMigrated } = await import('../../lib/forms.mjs');
    await loginMigrated(page, base, creds.user, creds.pass);

    // 1) own throwaway fixture org
    const orgData = makeOrgData('ZZ SO OrderType');
    const { orgId } = await createMigratedOrg(page, base, await import('../../lib/forms.mjs'), orgData);
    await switchOrg(page, base, orgId);

    const optsFor = async () => {
      const r = await page.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await page.waitForTimeout(500);
      const ok = !!(r && r.ok()) && !/signin/i.test(page.url());
      const labels = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#poType option'))
          .filter(o => o.value).map(o => o.textContent.trim()));
      return { ok, labels };
    };
    const setAll = async (on) => { for (const t of ALL_TYPES) await setOrgParam(page, base, orgId, t.pid, on); };

    // baseline: all OFF → fail-safe shows ALL 5
    await setAll(false);
    const none = await optsFor();

    // each param ON alone → only its option (re-switch active org defensively)
    const single = {};
    for (const t of ALL_TYPES) {
      await setAll(false);
      await setOrgParam(page, base, orgId, t.pid, true);
      await switchOrg(page, base, orgId);
      single[t.pid] = (await optsFor()).labels;
    }

    // all ON → all 5
    await setAll(true);
    await switchOrg(page, base, orgId);
    const all = await optsFor();

    return {
      orgId,
      accessible: none.ok && all.ok,
      noneLabels: none.labels,
      all: all.labels,
      single,
    };
  },

  check(m) {
    if (!m.accessible) {
      return [{ aspect: `SO form accessible on fixture org ${m.orgId}`, migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn',
        note: 'fresh fixture org SO form did not render — visibility gate could not be verified (BLOCKER)' }];
    }
    const out = [
      { aspect: 'all params OFF → fail-safe shows ALL 5 order types', migrated: m.noneLabels.length, expected: 5, ok: m.noneLabels.length === 5 },
      { aspect: 'all params ON → all 5 order types shown', migrated: m.all.length, expected: 5, ok: m.all.length === 5 },
    ];
    for (const t of ALL_TYPES) {
      const labels = m.single[t.pid] || [];
      const onlyThis = labels.length === 1 && labels[0] === t.label;
      out.push({
        aspect: `${t.pid} ON alone → only "${t.label}" shown`,
        migrated: JSON.stringify(labels), expected: JSON.stringify([t.label]), ok: onlyThis,
      });
    }
    return out;
  },
};
