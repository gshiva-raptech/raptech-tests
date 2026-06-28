// TC-PARAM-SO-063 — Validate Stock Qty on Sales Order submit (org param 63),
// Section 2 of ORG-PARAMETER-BEHAVIOR-SPEC.
//
// Spec rule: for Reserved Sales Orders, if SO Qty > Stock-On-Hand Qty, block submit
// ("Sales Order Qty is Exceeded than OnHand Qty"). OFF → no stock check.
//
// MIGRATED WIRING (code audit): SalesOrdersController.soValidateOnhandEnabled(63) +
// onHandError() — when 63 is on and a warehouse is chosen, the submit is blocked if a
// line's ordered qty exceeds soRepo.availableOnHandQty(item, warehouse). So 63 IS
// consumed in migrated (unlike most Section-2 params).
//
// LIMITATION (honest): a true end-to-end submit test needs a fixture org seeded with a
// stock-tracked item that has a known on-hand qty in a warehouse, plus a customer. A
// FRESH fixture org has none of that and it cannot be created purely through the UI in
// a fresh org without a long master-data setup. Per the brief, the submit-flow for 63
// is therefore deferred (BLOCKER: needs seeded stock). This case asserts only that 63
// toggles cleanly and the SO form stays accessible — it does NOT fake a stock-block
// pass. The live block/allow behavior must be verified on an org with seeded stock
// (mirror of TC-PARAM-SO-069's submit harness, but with an on-hand row).
//
// ISOLATION: own throwaway fixture org; toggles only on it; NEVER touches org 36.
import { createMigratedOrg, makeOrgData, switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const URL = '/sales-orders/sales-orders/new';

export default {
  id: 'TC-PARAM-SO-063',
  title: 'Sales Order Validate Stock Qty (63) — wired in code; submit-flow deferred (needs seeded stock)',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Order) → on-hand qty validation',
  hints: '- SalesOrdersController.soValidateOnhandEnabled(63) + onHandError() blocks submit when ordered qty > soRepo.availableOnHandQty. End-to-end block needs a stock-tracked item with on-hand in a warehouse.',

  data() { return {}; },

  async runMigrated({ page, base, creds }) {
    const MIG = base.replace(/\/+$/, '');
    const forms = await import('../../lib/forms.mjs');
    await forms.loginMigrated(page, base, creds.user, creds.pass);

    const orgData = makeOrgData('ZZ SO Onhand');
    const { orgId } = await createMigratedOrg(page, base, forms, orgData);
    await switchOrg(page, base, orgId);

    const open = async () => {
      const r = await page.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await page.waitForTimeout(400);
      return !!(r && r.ok()) && !/signin/i.test(page.url());
    };

    // Toggle 63 OFF→ON→read, confirm it saves cleanly and the form stays reachable.
    await setOrgParam(page, base, orgId, 63, false);
    await switchOrg(page, base, orgId);
    const offReachable = await open();
    await setOrgParam(page, base, orgId, 63, true);
    const stateOn = await readOrgParamState(page, base, orgId, 63);
    await switchOrg(page, base, orgId);
    const onReachable = await open();
    await setOrgParam(page, base, orgId, 63, false); // restore

    return { orgId, offReachable, onReachable, stateOn };
  },

  check(m) {
    return [
      { aspect: '63 toggles ON and persists', migrated: m.stateOn, expected: true, ok: m.stateOn === true },
      { aspect: 'SO form reachable with 63 OFF', migrated: m.offReachable, expected: true, ok: m.offReachable === true },
      { aspect: 'SO form reachable with 63 ON', migrated: m.onReachable, expected: true, ok: m.onReachable === true },
      { aspect: '63 live block/allow submit (qty > on-hand)', migrated: 'deferred', expected: 'block over-stock submit',
        ok: true, severity: 'warn',
        note: 'PARTIAL — submit-flow deferred: needs a fixture org seeded with a stock-tracked item + on-hand qty in a warehouse + customer. Code IS wired (onHandError). Verify live on a seeded org.' },
    ];
  },
};
