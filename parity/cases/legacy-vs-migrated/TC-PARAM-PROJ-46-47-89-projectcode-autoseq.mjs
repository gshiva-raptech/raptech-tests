// TC-PARAM-PROJ-46-47-89 — Project Code auto-generation org params (Section 11).
//
// Spec (ORG-PARAMETER-BEHAVIOR-SPEC.md §11) — all three are no-consumer ⚠️ in the audit:
//   [46] Project Code with BOQ Sequence → ON: auto-generate Project Code + BOQ sequence.
//   [47] Project Code Sequence          → ON: auto-generate Project Code from the sequence.
//   [89] Project Code - Auto Sequence    → ON: Project Code generated automatically; no manual entry.
//   OFF (all): manual entry.
//   Parity risk noted in spec: which param wins when >1 ON (mutual-exclusion ambiguity).
//
// Where the user enters a Project Code in migrated:
//   - /projects/projects/new        → the PROJECT create form: Entity, Customer, Project Name,
//                                      Status. There is NO "Project Code" field here at all.
//   - /projects/projects/{id}/codes/new → the PROJECT CODE subsystem form: field id="code"
//                                      (th:field=*{code}), readonly only when view-only, ALWAYS
//                                      required + editable on create. NO autoGen gate.
//
// What this asserts (UI-only, org-user forms):
//   A. The project create form exposes no Project Code field (structural note).
//   B. For EACH of 46/47/89: with the param ON, is the Project Code field on the code form
//      auto/readonly (auto-gen honored) vs manual/editable (gap)?  → migrated keeps it MANUAL
//      in every state → EXPECTED ❌ GAP (no consumer). Reported as a finding aspect.
//   C. Mutual-exclusion observation: with ALL THREE ON, the field is still manual (no winner
//      because none is consumed) — recorded as the observed behavior.
//
// Isolation: org 36 (has existing projects), snapshot+restore 46/47/89 in finally.
// No rows created (read-only inspection of the create forms). No cleanup needed.
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const ORG = 36;
const PARAMS = [46, 47, 89];

export default {
  id: 'TC-PARAM-PROJ-46-47-89',
  title: 'Project Code auto-seq params (46/47/89): gate the Project Code field?',
  track: 'B',
  role: 'superadmin',
  urlPath: '/projects/projects/{id}/codes/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Projects) → Project Code create form (46/47/89 auto-gen gate)',
  hints: '- ProjectsController.newProjectCodeForm + project-code-form.html #code: '
       + 'th:readonly="${!(isNew or canEdit)}" (no autoGen). createProjectCode reads '
       + 'projectCode.getCode() with NO countEnabledParameter(46/47/89). project-form.html has '
       + 'no Project Code field. Audit: all 3 no-consumer ⚠️ → expected ❌ gap.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);

    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    // Pick an existing project in org 36 to reach the Project Code create form.
    const projId = (psql(`SELECT project_id_pk FROM raptech_scm.project_master WHERE org_id_fk=${ORG} ORDER BY project_id_pk DESC LIMIT 1;`) || '').trim();
    const codeUrl = `/projects/projects/${projId}/codes/new`;

    // A. Project create form — is there a Project Code field?
    const projFormHasCode = await (async () => {
      const r = await up.goto(`${MIG}/projects/projects/new`, { waitUntil: 'networkidle' }).catch(() => null);
      if (!(r && r.ok())) return { accessible: false };
      await up.waitForTimeout(500);
      const has = await up.evaluate(() => {
        const byName = !!document.querySelector('form [name="code"], form #code, form [name="projectCode"]');
        const byLabel = [...document.querySelectorAll('form label')].some(l => /project\s*code/i.test(l.textContent || ''));
        return byName || byLabel;
      });
      return { accessible: true, has };
    })();

    // State of the Project Code field (id="code") on the project-code create form.
    const codeFieldState = async () => {
      const r = await up.goto(`${MIG}${codeUrl}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(600);
      const accessible = !!(r && r.ok()) && !/signin/i.test(up.url());
      const st = await up.evaluate(() => {
        const f = document.querySelector('#code, [name="code"]');
        if (!f) return { present: false };
        const wrap = f.closest('.field');
        return {
          present: true,
          readonly: f.readOnly || f.disabled,
          required: !!(f.required || (wrap && wrap.getAttribute('data-req') === '1')),
          placeholder: f.getAttribute('placeholder') || '',
        };
      });
      return { accessible, ...st };
    };

    const origs = {};
    for (const p of PARAMS) origs[p] = await readOrgParamState(page, base, ORG, p);

    const perParam = [];
    let allOn = null;
    try {
      // Baseline: all OFF.
      for (const p of PARAMS) await setOrgParam(page, base, ORG, p, false);
      const off = await codeFieldState();

      // B. each param ON in isolation → does the Code field become auto/readonly?
      for (const p of PARAMS) {
        await setOrgParam(page, base, ORG, p, true);
        const on = await codeFieldState();
        await setOrgParam(page, base, ORG, p, false);
        perParam.push({
          id: p,
          accessible: off.accessible && on.accessible,
          // "honored" = field switched from manual (editable) to auto (readonly) when ON.
          becameAuto: off.present && on.present && off.readonly === false && on.readonly === true,
          onReadonly: on.readonly, onRequired: on.required, onPlaceholder: on.placeholder,
        });
      }

      // C. all three ON together → mutual-exclusion observation.
      for (const p of PARAMS) await setOrgParam(page, base, ORG, p, true);
      const all = await codeFieldState();
      allOn = { readonly: all.readonly, required: all.required, placeholder: all.placeholder, present: all.present, accessible: all.accessible };

      const sc = shot('project-code-form'); await up.screenshot({ path: sc, fullPage: true }).catch(() => {});
      return { projId, projFormHasCode, off, perParam, allOn, shots: { form: sc } };
    } finally {
      for (const p of PARAMS) await setOrgParam(page, base, ORG, p, origs[p] === null ? false : origs[p]);
      await uctx.close();
    }
  },

  check(m) {
    const res = [];
    // A — structural: project create form has no Project Code field (informational warn).
    res.push({
      aspect: 'Project create form (/projects/projects/new) has no Project Code field',
      migrated: m.projFormHasCode?.accessible ? (m.projFormHasCode.has ? 'has a Project Code field' : 'no Project Code field') : 'form not accessible',
      expected: 'no Project Code field (code lives in the Project Code subsystem)',
      ok: m.projFormHasCode?.accessible === true && m.projFormHasCode?.has === false,
      severity: 'warn',
      note: 'Structural: the Project Code is entered on /projects/projects/{id}/codes/new, not the project form.',
    });

    // The Project Code field exists + is manual when all params OFF (sanity for the gap below).
    res.push({
      aspect: 'Baseline (46/47/89 all OFF) → Project Code field is manual (editable)',
      migrated: m.off?.present ? (m.off.readonly ? 'readonly' : 'editable') : 'field missing',
      expected: 'editable', ok: m.off?.present === true && m.off?.readonly === false,
      severity: 'warn',
    });

    // B — per-param: ON should auto-generate (readonly). Migrated keeps it manual → GAP.
    for (const p of (m.perParam || [])) {
      res.push({
        aspect: `Param ${p.id} ON → Project Code field auto-generated (readonly)`,
        migrated: !p.accessible ? 'form not accessible' : (p.onReadonly ? 'readonly (auto)' : 'editable (manual)'),
        expected: 'readonly (auto-generated)',
        ok: p.becameAuto === true,
        // EXPECTED gap (no-consumer param): migrated does not honor → report as finding, not noise.
        severity: p.becameAuto ? undefined : 'warn',
        note: p.becameAuto ? undefined
          : `GAP (expected): param ${p.id} is no-consumer; the Project Code field stays manual when ON — migrated does not honor auto-generation.`,
      });
    }

    // C — mutual exclusion: with all three ON the field is still manual (no winner).
    res.push({
      aspect: 'Mutual-exclusion: ALL of 46/47/89 ON → which wins?',
      migrated: !m.allOn?.accessible ? 'form not accessible' : (m.allOn?.readonly ? 'auto (readonly)' : 'still manual (editable) — no param consumed, so none wins'),
      expected: 'legacy determines a winning composer; migrated should auto-generate',
      ok: false,
      severity: 'warn',
      note: 'Observed: with all three ON the Project Code field remains manual — none of 46/47/89 is consumed, so the "which wins" ambiguity is moot in migrated (all are inert). Real ❌ gap vs the spec.',
    });

    return res;
  },
};
