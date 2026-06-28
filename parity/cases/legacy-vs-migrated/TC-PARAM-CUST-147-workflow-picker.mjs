// TC-PARAM-CUST-147 — Customer Approval (147) WORKFLOW-PICKER field-visibility (F-0006).
//
// Closes the field-visibility gap recorded in ORG-PARAMETER-BEHAVIOR-SPEC §13 (the
// "147 also controls visibility of the Approval field" claim that TC-PARAM-CUST-087
// assertion D reported as a ❌ gap). The fix renamed/added the field as a **"Workflow"**
// picker (id/name=workflowId), entity-scoped, gated by `customerApprovalEnabled`
// (CustomerController param 147 → customers/form.html).
//
// UI-only assertions on the rendered Create-Customer form (regular org user):
//   A. 147 OFF → NO Workflow field on the form.
//   B. 147 ON  → Workflow field present, labelled "Workflow", and REQUIRED.
//   C. 147 ON  → the entity-scoped picker endpoint (/customers/customers/workflows) the
//      form's reloadWorkflows() JS calls returns 200 and is entity-scoped (a flow seeded
//      on one entity appears for that entity, not for a different entity). The reload JS
//      is wired to the Entity <select> change event.
//
// Routing (147 ON + pick flow → PENDING) is covered by TC-PARAM-ACT-147; this case only
// asserts the FIELD presence/required/entity-reload wiring that was the no-consumer gap.
//
// Isolation: org 36; snapshot+restore param 147 (admin form) in finally. The entity-scope
// proof seeds a wtype-48 CUSTOMER flow on entity 34 and tears it down (last-resort seeding:
// a manual tester would configure a Customers workflow first; org 36 ships with none).
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const ORG = 36;
const URL = '/customers/customers/new';
const ENTITY = 34;       // an entity present on the org-36 customer form (Marketing1)
const OTHER_ENTITY = 26; // a different entity → must NOT see the entity-34-scoped flow
const SEED_WF = 990147;  // fixed high id for clean teardown
const CUSTOMER_WTYPE = 48;

export default {
  id: 'TC-PARAM-CUST-147',
  title: 'Customer Approval (147) — Workflow picker shown+required when ON, absent when OFF; entity-scoped',
  track: 'B',
  role: 'superadmin',
  urlPath: URL,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Customers) → customer-create Workflow picker (param 147)',
  hints: '- CustomerController customerApprovalEnabled (param 147) → customers/form.html #workflowId '
       + '(th:if customerApprovalEnabled, required). Entity-scoped via /customers/customers/workflows?entityId=. '
       + 'reloadWorkflows() bound to #entityIds change.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);

    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    // Read the Workflow field state on the create-customer form.
    const fieldState = async () => {
      const r = await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' }).catch(() => null);
      await up.waitForTimeout(700);
      const accessible = !!(r && r.ok()) && !/signin/i.test(up.url());
      const st = await up.evaluate(() => {
        const f = document.querySelector('#workflowId, [name="workflowId"]');
        if (!f) return { present: false };
        const wrap = f.closest('.field');
        const label = (wrap?.querySelector('label')?.textContent || '').trim();
        return {
          present: true,
          required: !!(f.required || (wrap && wrap.getAttribute('data-req') === '1')),
          label,
          isSelect: f.tagName === 'SELECT',
          reloadWired: /reloadWorkflows/.test(document.documentElement.innerHTML),
        };
      });
      return { accessible, ...st };
    };

    const teardownFlow = () => {
      psql(`DELETE FROM raptech_scm.workflow_stage WHERE wf_id_fk=${SEED_WF}`);
      psql(`DELETE FROM raptech_scm.workflow WHERE wf_id_pk=${SEED_WF}`);
    };
    const seedFlow = () => {
      teardownFlow();
      const src = (psql(`SELECT w.wf_id_pk FROM raptech_scm.workflow w JOIN raptech_scm.workflow_type_mapping m ON m.wf_tm_pk=w.wf_tm_fk WHERE m.wtype_id_fk=${CUSTOMER_WTYPE} AND w.status=0 AND (w.del_flag IS NULL OR w.del_flag='N') ORDER BY w.wf_id_pk LIMIT 1`) || '').trim();
      if (!src) return false;
      psql(`INSERT INTO raptech_scm.workflow (wf_id_pk,name_,status,del_flag,created_date,updated_date,created_by,updated_by,org_id_fk,wf_tm_fk,entity_id_fk,is_condition,condition_type) SELECT ${SEED_WF},'ZZ CUST147 FLOW',0,'N',created_date,updated_date,created_by,updated_by,${ORG},wf_tm_fk,${ENTITY},'N',NULL FROM raptech_scm.workflow WHERE wf_id_pk=${src}`);
      psql(`INSERT INTO raptech_scm.workflow_stage (wfs_id_pk,due_days,seq_flow,is_mandatory,notification,del_flag,wf_id_fk,wsbt_id_fk,amount) SELECT 990147000+wfs_id_pk,due_days,seq_flow,is_mandatory,notification,del_flag,${SEED_WF},wsbt_id_fk,amount FROM raptech_scm.workflow_stage WHERE wf_id_fk=${src} AND (del_flag IS NULL OR del_flag<>'Y')`);
      return true;
    };

    const orig147 = await readOrgParamState(page, base, ORG, 147);
    let off, on, seeded = false, e34 = null, eOther = null;
    try {
      await setOrgParam(page, base, ORG, 147, false);
      off = await fieldState();

      seeded = seedFlow();
      await setOrgParam(page, base, ORG, 147, true);
      on = await fieldState();

      // Entity-scoped picker: probe the endpoint the form JS calls (reloadWorkflows).
      await up.goto(`${MIG}${URL}`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(400);
      const probe = (eid) => up.evaluate(async (e) => {
        const r = await fetch('/customers/customers/workflows?entityId=' + e, { headers: { Accept: 'application/json' } });
        return r.ok ? await r.json() : null;
      }, eid);
      e34 = await probe(ENTITY);
      eOther = await probe(OTHER_ENTITY);
    } finally {
      await setOrgParam(page, base, ORG, 147, orig147 === null ? false : orig147);
      try { teardownFlow(); } catch (e) { /* best-effort */ }
      await uctx.close();
    }

    const e34HasSeed = Array.isArray(e34) && e34.some(w => w.id === SEED_WF || String(w.name).includes('ZZ CUST147 FLOW'));
    const eOtherHasSeed = Array.isArray(eOther) && eOther.some(w => w.id === SEED_WF || String(w.name).includes('ZZ CUST147 FLOW'));
    return {
      offPresent: off?.present, onPresent: on?.present, onRequired: on?.required,
      onLabel: on?.label, onIsSelect: on?.isSelect, reloadWired: on?.reloadWired,
      seeded, e34HasSeed, eOtherHasSeed,
    };
  },

  check(m) {
    return [
      { aspect: '147 OFF → no Workflow field on the customer form',
        migrated: m.offPresent ? 'present' : 'absent', expected: 'absent', ok: m.offPresent === false },
      { aspect: '147 ON → Workflow field present',
        migrated: m.onPresent ? 'present' : 'absent', expected: 'present', ok: m.onPresent === true },
      { aspect: '147 ON → Workflow field is required',
        migrated: String(m.onRequired), expected: 'true', ok: m.onRequired === true },
      { aspect: '147 ON → field labelled "Workflow"',
        migrated: m.onLabel || '(none)', expected: 'Workflow…', ok: /workflow/i.test(m.onLabel || '') },
      { aspect: '147 ON → reloadWorkflows() entity-change handler wired',
        migrated: String(m.reloadWired), expected: 'true', ok: m.reloadWired === true },
      { aspect: 'Entity-scoped: seeded flow appears for its own entity (34)',
        migrated: m.seeded ? (m.e34HasSeed ? 'listed' : 'not listed') : 'no source flow to clone',
        expected: 'listed', ok: m.e34HasSeed === true, severity: m.seeded ? undefined : 'warn' },
      { aspect: 'Entity-scoped: seeded entity-34 flow does NOT appear for a different entity (26)',
        migrated: m.eOtherHasSeed ? 'leaked to other entity' : 'correctly scoped out',
        expected: 'correctly scoped out', ok: m.seeded ? m.eOtherHasSeed === false : true,
        severity: m.seeded ? undefined : 'warn' },
    ];
  },
};
