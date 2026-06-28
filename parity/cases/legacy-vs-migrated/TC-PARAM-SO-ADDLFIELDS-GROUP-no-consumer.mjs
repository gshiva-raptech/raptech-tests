// TC-PARAM-SO-ADDLFIELDS-GROUP — Sales Order "Additional Fields" + "Group Name"
// org params (Section 2 of ORG-PARAMETER-BEHAVIOR-SPEC). These are no-consumer ⚠️
// params: per the audit the migrated SalesOrdersController has NO wiring for them,
// so the documented effect (alias-configurable Summary / Line-Item additional fields,
// and the SO Group Name) is expected to be ABSENT in migrated.
//
// This case DOCUMENTS the gap (F-0006 class). For each param it toggles OFF→ON on a
// throwaway fixture org and checks whether the new-SO form changes at all
// (formSignature diff) and whether any additional-field / group-name control appears.
// Expected per code audit: NO change, NO control → migrated does NOT honor (gap).
//
// Params covered:
//   Summary additional fields + calc type: 90, 91, 92, 121 (+default), 139, 140, 141, 145
//   Line-Item additional fields (alias only): 120, 122
//   166 Sales Order Group Name (used when Group Items = Yes)
//
// ISOLATION: own throwaway fixture org; toggles only on it; NEVER touches org 36.
import { createMigratedOrg, makeOrgData, switchOrg, setOrgParam, formSignature } from '../../lib/fixtures.mjs';

const URL = '/sales-orders/sales-orders/new';
const PARAMS = [
  { pid: 90,  name: 'Addl Field 1 (Summary)' },
  { pid: 91,  name: 'Addl Field 2 (Summary)' },
  { pid: 92,  name: 'Addl Field 3 (Summary)' },
  { pid: 120, name: 'Addl Field 4 (Line Item)' },
  { pid: 121, name: 'Addl Field 5 (Summary + default)' },
  { pid: 122, name: 'Addl Field 1 (Line Item)' },
  { pid: 139, name: 'Addl Field 6 (Summary)' },
  { pid: 140, name: 'Addl Field 7 (Summary)' },
  { pid: 141, name: 'Addl Field 8 (Summary)' },
  { pid: 145, name: 'Addl Field 9 (Summary)' },
  { pid: 166, name: 'Sales Order Group Name' },
];

export default {
  id: 'TC-PARAM-SO-ADDLFIELDS-GROUP',
  title: 'Sales Order Additional-Fields (90-145) + Group Name (166) — no-consumer gap (own fixture org)',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Order) → Additional Fields / Group Name (no consumer)',
  hints: '- SalesOrdersController.addFormLookups has NO wiring for SO additional-field params (90/91/92/120/121/122/139/140/141/145) or Group Name (166). Documented gap: migrated does not render these vs legacy createReceivablePurchase.jsp additional fields.',

  data() { return {}; },

  async runMigrated({ page, base, creds }) {
    const MIG = base.replace(/\/+$/, '');
    const forms = await import('../../lib/forms.mjs');
    await forms.loginMigrated(page, base, creds.user, creds.pass);

    const orgData = makeOrgData('ZZ SO AddlFld');
    const { orgId } = await createMigratedOrg(page, base, forms, orgData);
    await switchOrg(page, base, orgId);

    const view = async () => {
      const r = await page.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await page.waitForTimeout(500);
      const ok = !!(r && r.ok()) && !/signin/i.test(page.url());
      const sig = await formSignature(page);
      const addlControls = await page.evaluate(() =>
        Array.from(document.querySelectorAll('form [name]'))
          .map(e => e.getAttribute('name'))
          .filter(n => n && /addl|additional|grpName|groupName|groupItems|customField|custom_field/i.test(n)));
      return { ok, sig, addlControls };
    };

    const results = {};
    let accessible = true;
    for (const p of PARAMS) {
      await setOrgParam(page, base, orgId, p.pid, false);
      await switchOrg(page, base, orgId);
      const off = await view();
      await setOrgParam(page, base, orgId, p.pid, true);
      await switchOrg(page, base, orgId);
      const on = await view();
      await setOrgParam(page, base, orgId, p.pid, false); // restore
      if (!off.ok || !on.ok) accessible = false;
      results[p.pid] = {
        differs: off.sig !== on.sig,
        controlsOff: off.addlControls,
        controlsOn: on.addlControls,
      };
    }

    return { orgId, accessible, results };
  },

  check(m) {
    if (!m.accessible) {
      return [{ aspect: `SO form accessible on fixture org ${m.orgId}`, migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn',
        note: 'fresh fixture org SO form did not render — gap could not be verified (BLOCKER)' }];
    }
    const out = [];
    for (const p of PARAMS) {
      const r = m.results[p.pid];
      // Expected behavior per spec/legacy: ON should add the field → form should DIFFER.
      // Migrated audit: no consumer → form does NOT differ → this is the GAP we record.
      // Mark ok=false (migrated does NOT honor) UNLESS migrated surprises us and renders it.
      const honored = r.differs || (r.controlsOn.length > r.controlsOff.length);
      out.push({
        aspect: `${p.pid} ${p.name}: ON renders the field`,
        migrated: honored ? 'rendered (honored)' : 'no change (NOT rendered)',
        expected: 'rendered (per spec/legacy)',
        ok: honored,
        note: honored ? undefined : 'no-consumer gap — migrated does not honor this SO param (expected per audit)',
      });
    }
    return out;
  },
};
