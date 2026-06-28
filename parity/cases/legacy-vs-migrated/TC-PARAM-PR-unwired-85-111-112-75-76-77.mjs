// TC-PARAM-PR-unwired — Section 5 params with NO consumer in the migrated PR/PO create form.
//
// PurchaseRequisitionController.prepareForm gates ONLY 55/84/99/117/110 (+cost-centre/exchange/tax).
// It does NOT reference 85 (Service Order Sequence No.), 111 (PO Fixed Price), 112 (PO Variable
// Price), or the Additional Fields 75/76/77. This case toggles each on our OWN throwaway org and
// captures the create-form signature OFF vs ON to record, from the user's view, whether the param
// has ANY visible effect on the PR form.
//
//   [85]  Service Order Sequence No. → spec: PO numbering for service orders uses the SO sequence.
//                                      Form-level: assert what (if anything) is visible.
//   [111] PO Fixed Price   → spec: PO amount fixed after creation (cannot modify).   } the main
//   [112] PO Variable Price→ spec: PO amount modifiable after creation. (opposes 111) } 111/112 pair
//         Tested BOTH states + the 111+112 interaction (both ON together).
//   [75]  Addl Field 1, [76] Addl Field 2, [77] Addl Field 3 (77 = WIRED ✅ per audit) →
//         summary-level extra field + alias/calc. Assert summary-level visibility.
//
// Verdict reading (form-signature differs OFF vs ON):
//   differs===true  → migrated HONORS the param at form level.
//   differs===false → no visible PR-form effect. For 85/111/112 the spec has real form behavior →
//                     report as ❌ gap (not wired into the PR/PO create form). For 75/76/77 the
//                     effect may be summary/alias-level; report what is seen.
import { createMigratedOrg, makeOrgData, switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';

const PR_URL = '/procurement/purchase-requisitions/new';

export default {
  id: 'TC-PARAM-PR-unwired',
  title: 'PR/PO create form vs unwired Section-5 params 85/111/112 + addl fields 75/76/77',
  track: 'B',
  role: 'superadmin',
  urlPath: PR_URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Purchase Requisitions) → PR/PO create form (no-consumer params)',
  hints: '- PurchaseRequisitionController gates only 55/84/99/117/110; 85/111/112/75/76/77 are NOT '
       + 'referenced by the controller or templates/procurement/pr/form.html. Form-signature diff '
       + 'records whether any of them changes the rendered PR/PO create form.',

  data() { return { org: makeOrgData('ZZ PR-Unwired') }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);

    const { orgId } = await createMigratedOrg(page, base, forms, data.org);
    data.orgId = orgId;
    await switchOrg(page, base, orgId);

    const probe = async () => {
      const r = await page.goto(`${MIG}${PR_URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await page.waitForTimeout(600);
      const ok = !!(r && r.ok()) && !/signin/i.test(page.url());
      const sig = await page.evaluate(() => {
        const ctrls = [...document.querySelectorAll('form [name]')].map(e =>
          `${e.tagName}|${e.getAttribute('name')}|${e.type || ''}|${(e.readOnly || e.disabled) ? 'ro' : ''}`);
        const secs = [...document.querySelectorAll('.section')]
          .filter(s => getComputedStyle(s).display !== 'none').map(s => s.id);
        return JSON.stringify([...new Set(ctrls)].sort()) + '#' + JSON.stringify(secs.sort());
      });
      return { ok, sig };
    };

    const out = { accessible: true };
    const ensureOrg = async () => {
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
    const toggleProbe = async (pid) => {
      const orig = await readOrgParamState(page, base, orgId, pid);
      await setOrgParam(page, base, orgId, pid, false); await ensureOrg();
      const off = await probe();
      await setOrgParam(page, base, orgId, pid, true);  await ensureOrg();
      const on = await probe();
      await setOrgParam(page, base, orgId, pid, orig === null ? false : orig);
      if (!off.ok || !on.ok) out.accessible = false;
      return { differs: off.sig !== on.sig, offSig: off.sig, onSig: on.sig };
    };

    out.p85  = await toggleProbe(85);
    out.p111 = await toggleProbe(111);
    out.p112 = await toggleProbe(112);
    out.p75  = await toggleProbe(75);
    out.p76  = await toggleProbe(76);
    out.p77  = await toggleProbe(77);

    // 111 + 112 interaction: both ON together — does the form respond at all?
    {
      const o111 = await readOrgParamState(page, base, orgId, 111);
      const o112 = await readOrgParamState(page, base, orgId, 112);
      await setOrgParam(page, base, orgId, 111, false);
      await setOrgParam(page, base, orgId, 112, false); await ensureOrg();
      const baseSig = (await probe()).sig;
      await setOrgParam(page, base, orgId, 111, true);
      await setOrgParam(page, base, orgId, 112, true); await ensureOrg();
      const bothSig = (await probe()).sig;
      await setOrgParam(page, base, orgId, 111, o111 === null ? false : o111);
      await setOrgParam(page, base, orgId, 112, o112 === null ? false : o112);
      out.bothFixedVariable = { differs: baseSig !== bothSig };
    }

    const sc = shot('pr-form-unwired'); await page.screenshot({ path: sc, fullPage: true }).catch(() => {});
    out.shots = { prForm: sc };

    // Cleanup: UI soft-delete of our throwaway org (same path as TC-ORG-005).
    try {
      page.on('dialog', d => d.accept().catch(() => {}));
      await page.goto(`${MIG}/admin/organizations/${orgId}?mode=edit`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await Promise.all([
        page.waitForLoadState('networkidle').catch(() => {}),
        page.getByRole('button', { name: /^delete$/i }).click(),
      ]);
      await page.waitForTimeout(1500);
    } catch (e) { out.cleanupNote = 'fixture org delete failed — orphan ZZ PR-Unwired org left for lead'; }

    return out;
  },

  check(m) {
    const r = [];
    r.push({ aspect: 'PR/PO create form accessible for fixture org (both states)',
      migrated: m.accessible, expected: true, ok: m.accessible === true, severity: 'warn' });

    // 85/111/112 have real spec behavior; no PR-form effect ⇒ gap (not wired into create form).
    r.push({ aspect: '[85] Service Order Sequence No. — PR/PO form effect',
      migrated: m.p85.differs ? 'form changes' : 'no PR-form effect',
      expected: 'spec: SO-sequence numbering', ok: m.p85.differs === true,
      note: m.p85.differs ? undefined : 'not consumed by PR/PO create form (controller has no gate)' });

    r.push({ aspect: '[111] PO Fixed Price — PR/PO form effect (amount fixed after create)',
      migrated: m.p111.differs ? 'form changes' : 'no PR-form effect',
      expected: 'spec: amount fixed after creation', ok: m.p111.differs === true,
      note: m.p111.differs ? undefined : 'not gated in PurchaseRequisitionController/form.html' });

    r.push({ aspect: '[112] PO Variable Price — PR/PO form effect (amount editable after create)',
      migrated: m.p112.differs ? 'form changes' : 'no PR-form effect',
      expected: 'spec: amount editable after creation', ok: m.p112.differs === true,
      note: m.p112.differs ? undefined : 'not gated in PurchaseRequisitionController/form.html' });

    r.push({ aspect: '[111]+[112] interaction — both ON changes the form',
      migrated: m.bothFixedVariable.differs ? 'form changes' : 'no PR-form effect',
      expected: 'spec: fixed/variable pair interaction', ok: m.bothFixedVariable.differs === true,
      severity: 'warn',
      note: m.bothFixedVariable.differs ? undefined : 'neither fixed nor variable price is wired into the create form' });

    // Additional fields 75/76/77 (77 wired per audit) — summary-level/alias; record effect.
    for (const [pid, key, name] of [[75, 'p75', 'Addl Field 1'], [76, 'p76', 'Addl Field 2'], [77, 'p77', 'Addl Field 3 (WIRED)']]) {
      const e = m[key];
      r.push({ aspect: `[${pid}] ${name} — PR/PO form effect (summary-level addl field)`,
        migrated: e.differs ? 'form changes' : 'no PR-form effect',
        expected: 'spec: summary addl field + alias/calc', ok: e.differs === true,
        severity: 'warn',
        note: e.differs ? undefined : 'no visible PR/PO create-form change (may be summary/alias-level only)' });
    }

    return r;
  },
};
