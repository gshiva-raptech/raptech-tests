// TC-PARAM-PR-gates — Section 5 (Tab - Purchase Requisitions) wired form-gate params.
//
// Drives the migrated PR/PO create form (/procurement/purchase-requisitions/new) and proves
// each WIRED org param changes the rendered form (OFF vs ON form-signature diff), on a throwaway
// fixture org we own. ISOLATION: own org, snapshot+restore each param, no commits, UI-only.
//
//   [55]  Sales Order No.   → ON shows the "Sales Order" field (salesOrderEnable th:if) + SO dropdown.
//   [84]  PO Discount       → ON shows the summary-level "Trade Discount" row (poDiscountEnable th:if)
//                             + hidden tradingDiscount input. (Per-line "Disc %" column is always
//                             present; the param gates the summary Trade Discount, not that column.)
//   [99]  Manual PO No.     → ON makes the PO Number an editable <input id=poNo> (manualPoEnable);
//                             OFF replaces it with a hidden poNo (auto-generated requestNo shown RO).
//   [110] Service Order New Item  → spec: param exists, functionality NOT implemented.
//   [117] PO New Item             → spec: param exists, functionality NOT implemented.
//         Controller computes poNewItemEnable/woNewItemEnable but form.html never consumes them.
//         Assert: NO 'New Item' option renders in EITHER state (confirmed not-implemented, not a gap).
//
// Verdicts (form-level, what a tester sees on the create form):
//   differs===true for 55/84/99  → migrated HONORS the param.
//   noNewItem in both states for 110/117 → CONFIRMED not-implemented (matches spec).
import { createMigratedOrg, makeOrgData, switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const PR_URL = '/procurement/purchase-requisitions/new';

export default {
  id: 'TC-PARAM-PR-gates',
  title: 'PR/PO create form honors wired params 55/84/99; 110/117 confirmed not-implemented',
  track: 'B',
  role: 'superadmin',
  urlPath: PR_URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Purchase Requisitions) → PR/PO create form',
  hints: '- PurchaseRequisitionController.prepareForm gates: salesOrderEnable(55), poDiscountEnable(84), '
       + 'manualPoEnable(99); poNewItemEnable(117)/woNewItemEnable(110) computed but NOT consumed by '
       + 'templates/procurement/pr/form.html (no New Item control rendered).',

  data() { return { org: makeOrgData('ZZ PR-Param') }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);   // super admin

    // Own throwaway org — isolation, no concurrent-save races on a shared org.
    const { orgId } = await createMigratedOrg(page, base, forms, data.org);
    data.orgId = orgId;
    await switchOrg(page, base, orgId);

    // Load the PR create form for the (switched) org and capture a control/section signature
    // plus the specific evidence flags each param should flip.
    const probe = async () => {
      const r = await page.goto(`${MIG}${PR_URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await page.waitForTimeout(600);
      const ok = !!(r && r.ok()) && !/signin/i.test(page.url());
      const ev = await page.evaluate(() => {
        const ctrls = [...document.querySelectorAll('form [name]')].map(e =>
          `${e.tagName}|${e.getAttribute('name')}|${e.type || ''}|${(e.readOnly || e.disabled) ? 'ro' : ''}`);
        const secs = [...document.querySelectorAll('.section')]
          .filter(s => getComputedStyle(s).display !== 'none').map(s => s.id);
        const sig = JSON.stringify([...new Set(ctrls)].sort()) + '#' + JSON.stringify(secs.sort());
        const txt = (document.body.innerText || '');
        // poNo control: editable text input (manual) vs hidden (auto)
        const poNoEl = document.querySelector('[name="poNo"]');
        const poNoEditable = !!(poNoEl && poNoEl.type !== 'hidden' && !poNoEl.readOnly && !poNoEl.disabled);
        return {
          sig,
          // precise: the salesOrderEnable th:if wraps a field labelled "Sales Order No." that
          // contains the #soMulti picker + a hidden name="purchaseId" input (present only when ON).
          salesOrderField: [...document.querySelectorAll('.field-label, label')].some(l => /^sales order no\.?$/i.test(l.textContent.trim()))
            && !!document.querySelector('#soMulti, [name="purchaseId"]'),
          tradeDiscountRow: [...document.querySelectorAll('.calc-label')].some(l => /trade discount/i.test(l.textContent)),
          tradingDiscountInput: !!document.querySelector('[name="tradingDiscount"]'),
          poNoEditable,
          // 'New Item' option for non-master items — should NOT exist (not implemented)
          newItemControl: [...document.querySelectorAll('button, a, .btn, [role="button"]')]
            .some(b => /new item/i.test((b.textContent || '').trim())),
        };
      });
      return { ok, ...ev };
    };

    const out = { accessible: true };
    const snap = {};

    // switchOrg needs the CSRF meta tags present on the current document; after a param save the
    // page may be mid-navigation. Settle + retry to avoid a transient "Failed to fetch".
    const ensureOrg = async () => {
      // Tolerate transient server saturation (switch-org POST can fail under load). Retry with
      // backoff, re-loading a CSRF-bearing page between attempts.
      let lastErr;
      for (let i = 0; i < 6; i++) {
        try {
          if (!/admin\/org-parameter/.test(page.url())) {
            await page.goto(`${MIG}/admin/org-parameter?orgId=${orgId}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
          }
          await page.waitForTimeout(400);
          await switchOrg(page, base, orgId);
          return;
        } catch (e) { lastErr = e; await page.waitForTimeout(1500 * (i + 1)); }
      }
      throw lastErr;
    };

    // generic OFF/ON probe for a single param, restoring original
    const toggleProbe = async (pid) => {
      const orig = await readOrgParamState(page, base, orgId, pid);
      snap[pid] = orig;
      await setOrgParam(page, base, orgId, pid, false); await ensureOrg();
      const off = await probe();
      await setOrgParam(page, base, orgId, pid, true);  await ensureOrg();
      const on = await probe();
      await setOrgParam(page, base, orgId, pid, orig === null ? false : orig);
      if (!off.ok || !on.ok) out.accessible = false;
      return { off, on };
    };

    // [55] Sales Order No.
    const p55 = await toggleProbe(55);
    out.p55 = {
      differs: p55.off.sig !== p55.on.sig,
      fieldOff: p55.off.salesOrderField, fieldOn: p55.on.salesOrderField,
    };

    // [84] PO Discount → summary Trade Discount row
    const p84 = await toggleProbe(84);
    out.p84 = {
      differs: p84.off.sig !== p84.on.sig,
      rowOff: p84.off.tradeDiscountRow, rowOn: p84.on.tradeDiscountRow,
      inputOff: p84.off.tradingDiscountInput, inputOn: p84.on.tradingDiscountInput,
    };

    // [99] Manual PO No. → editable poNo input vs hidden
    const p99 = await toggleProbe(99);
    out.p99 = {
      differs: p99.off.sig !== p99.on.sig,
      editableOff: p99.off.poNoEditable, editableOn: p99.on.poNoEditable,
    };

    // [110] Service Order New Item — not implemented: no New Item control in either state
    const p110 = await toggleProbe(110);
    out.p110 = { newItemOff: p110.off.newItemControl, newItemOn: p110.on.newItemControl, differs: p110.off.sig !== p110.on.sig };

    // [117] PO New Item — not implemented
    const p117 = await toggleProbe(117);
    out.p117 = { newItemOff: p117.off.newItemControl, newItemOn: p117.on.newItemControl, differs: p117.off.sig !== p117.on.sig };

    const sc = shot('pr-form'); await page.screenshot({ path: sc, fullPage: true }).catch(() => {});
    out.shots = { prForm: sc };

    // Cleanup our throwaway org via the UI delete (soft-delete delFlag=Y) — same path as TC-ORG-005.
    // Switch back off the fixture org first, then delete it from the edit form.
    try {
      page.on('dialog', d => d.accept().catch(() => {}));
      await page.goto(`${MIG}/admin/organizations/${orgId}?mode=edit`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await Promise.all([
        page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /^delete$/i }).click(),
      ]);
      await page.waitForTimeout(1500);
    } catch (e) { out.cleanupNote = 'fixture org delete failed — orphan ZZ PR-Param org left for lead'; }

    return out;
  },

  check(m) {
    const r = [];
    r.push({ aspect: 'PR/PO create form is accessible for the fixture org (both states)',
      migrated: m.accessible, expected: true, ok: m.accessible === true,
      severity: m.accessible ? undefined : undefined });

    // [55]
    r.push({ aspect: '[55] Sales Order No. — ON shows the "Sales Order No." field on PR form',
      migrated: `differs=${m.p55.differs} (field OFF=${m.p55.fieldOff}/ON=${m.p55.fieldOn})`,
      expected: 'differs=true (field ON only)',
      ok: m.p55.differs === true && m.p55.fieldOn === true && m.p55.fieldOff === false });

    // [84]
    r.push({ aspect: '[84] PO Discount — ON shows summary "Trade Discount" row + tradingDiscount input',
      migrated: `differs=${m.p84.differs} (row OFF=${m.p84.rowOff}/ON=${m.p84.rowOn}, input OFF=${m.p84.inputOff}/ON=${m.p84.inputOn})`,
      expected: 'differs=true (Trade Discount ON only)',
      ok: m.p84.differs === true && m.p84.rowOn === true && m.p84.rowOff === false });

    // [99]
    r.push({ aspect: '[99] Manual PO No. — ON makes PO Number editable; OFF auto/hidden',
      migrated: `differs=${m.p99.differs} (editable OFF=${m.p99.editableOff}/ON=${m.p99.editableOn})`,
      expected: 'differs=true (editable ON only)',
      ok: m.p99.differs === true && m.p99.editableOn === true && m.p99.editableOff === false });

    // [110] not implemented
    r.push({ aspect: '[110] Service Order New Item — confirmed NOT implemented (no New Item control, either state)',
      migrated: `newItem OFF=${m.p110.newItemOff}/ON=${m.p110.newItemOn}, formDiffers=${m.p110.differs}`,
      expected: 'no New Item control; no form effect',
      ok: m.p110.newItemOff === false && m.p110.newItemOn === false });

    // [117] not implemented
    r.push({ aspect: '[117] PO New Item — confirmed NOT implemented (no New Item control, either state)',
      migrated: `newItem OFF=${m.p117.newItemOff}/ON=${m.p117.newItemOn}, formDiffers=${m.p117.differs}`,
      expected: 'no New Item control; no form effect',
      ok: m.p117.newItemOff === false && m.p117.newItemOn === false });

    return r;
  },
};
