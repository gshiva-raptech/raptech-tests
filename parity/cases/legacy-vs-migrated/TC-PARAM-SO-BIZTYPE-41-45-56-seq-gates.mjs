// TC-PARAM-SO-BIZTYPE — Business-Type / "Document No. Sequence" gates (org params
// 41/42/43/44/45) plus param 56 picker visibility, on the new Sales Order form
// (Section 2 of ORG-PARAMETER-BEHAVIOR-SPEC, F-0006 class).
//
// Spec rule:
//   [56] Business Type  → ON shows the picker field itself; OFF hides it.
//   [41] Domestic  [42] Export  [43] Scrap  [44] Return  [45] FOC  → each ON adds its
//        value to the sequence/business-type dropdown; OFF → hidden.
//
// PARITY NOTE (recorded for the lead): the product-owner doc labels 41-45 as the
// "Document No. Sequence" field. Migrated wires them as the SALES_TYPE_* options of
// the **Business Type** (#salesType) field, which itself is gated by 56. So migrated
// honors the 41-45 gating, but under the "Business Type" picker rather than a
// separately-labelled "Document No. Sequence" field. The test asserts the gating
// behavior; the labelling difference is reported, not failed.
//
// ISOLATION: own throwaway fixture org; toggles only on it; NEVER touches org 36.
// Form viewed in the super-admin session that switched into the fixture org.
import { createMigratedOrg, makeOrgData, switchOrg, setOrgParam } from '../../lib/fixtures.mjs';

const URL = '/sales-orders/sales-orders/new';
const SEQ = [
  { pid: 41, label: 'Domestic' },
  { pid: 42, label: 'Export' },
  { pid: 43, label: 'Scrap' },
  { pid: 44, label: 'Return' },
  { pid: 45, label: 'FOC' },
];

export default {
  id: 'TC-PARAM-SO-BIZTYPE-41-45-56',
  title: 'Sales Order Business Type picker (56) + sequence options (41-45) gating (own fixture org)',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Order) → Business Type / Doc-No-Sequence gates',
  hints: '- SalesOrdersController: soBusinessTypeEnabled(56) gates #salesType visibility; BUSINESS_TYPES filtered by SALES_TYPE_PARAM (41-45) via findEnabledParameterIds. Doc names these "Document No. Sequence"; migrated shows them as Business Type options.',

  data() { return {}; },

  async runMigrated({ page, base, creds }) {
    const MIG = base.replace(/\/+$/, '');
    const forms = await import('../../lib/forms.mjs');
    await forms.loginMigrated(page, base, creds.user, creds.pass);

    const orgData = makeOrgData('ZZ SO BizType');
    const { orgId } = await createMigratedOrg(page, base, forms, orgData);
    await switchOrg(page, base, orgId);

    const inspect = async () => {
      const r = await page.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await page.waitForTimeout(500);
      const ok = !!(r && r.ok()) && !/signin/i.test(page.url());
      const s = await page.evaluate(() => ({
        present: !!document.querySelector('#salesType'),
        labels: Array.from(document.querySelectorAll('#salesType option')).filter(o => o.value).map(o => o.textContent.trim()),
      }));
      return { ok, ...s };
    };
    const setSeq = async (on) => { for (const t of SEQ) await setOrgParam(page, base, orgId, t.pid, on); };

    // 56 OFF → picker hidden (regardless of 41-45)
    await setOrgParam(page, base, orgId, 56, false);
    await setSeq(true);
    await switchOrg(page, base, orgId);
    const sixOff = await inspect();

    // 56 ON, all 41-45 ON → picker shown with all 5
    await setOrgParam(page, base, orgId, 56, true);
    await setSeq(true);
    await switchOrg(page, base, orgId);
    const allOn = await inspect();

    // 56 ON, each seq param alone → only its label
    const single = {};
    for (const t of SEQ) {
      await setSeq(false);
      await setOrgParam(page, base, orgId, t.pid, true);
      await switchOrg(page, base, orgId);
      single[t.pid] = (await inspect()).labels;
    }

    // 56 ON, all 41-45 OFF → fail-safe: all 5 (so creation never breaks)
    await setSeq(false);
    await switchOrg(page, base, orgId);
    const noneSeq = await inspect();

    return {
      orgId,
      accessible: allOn.ok && sixOff.ok,
      sixOffPresent: sixOff.present,
      allOnPresent: allOn.present,
      allOnLabels: allOn.labels,
      noneSeqLabels: noneSeq.labels,
      single,
    };
  },

  check(m) {
    if (!m.accessible) {
      return [{ aspect: `SO form accessible on fixture org ${m.orgId}`, migrated: 'not accessible', expected: 'accessible', ok: false, severity: 'warn',
        note: 'fresh fixture org SO form did not render — gate could not be verified (BLOCKER)' }];
    }
    const out = [
      { aspect: '56 OFF → Business Type picker hidden', migrated: m.sixOffPresent, expected: false, ok: m.sixOffPresent === false },
      { aspect: '56 ON → Business Type picker shown', migrated: m.allOnPresent, expected: true, ok: m.allOnPresent === true },
      { aspect: '56 ON + all 41-45 ON → all 5 options', migrated: m.allOnLabels.length, expected: 5, ok: m.allOnLabels.length === 5 },
      { aspect: '56 ON + all 41-45 OFF → fail-safe shows all 5', migrated: m.noneSeqLabels.length, expected: 5, ok: m.noneSeqLabels.length === 5 },
    ];
    for (const t of SEQ) {
      const labels = m.single[t.pid] || [];
      const onlyThis = labels.length === 1 && labels[0] === t.label;
      out.push({
        aspect: `${t.pid} ON alone → only "${t.label}"`,
        migrated: JSON.stringify(labels), expected: JSON.stringify([t.label]), ok: onlyThis,
      });
    }
    return out;
  },
};
