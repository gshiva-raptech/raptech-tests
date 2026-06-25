// TC-PARAM-ACT-147 — Customer Approval (147) behavioral action test.
// Drive the real customer UI form as shekar_N (so country/state searchable widgets
// resolve their master ids) → create a customer → check workflow_status:
//   147 OFF → 131 (LIVE, non-workflow path);  147 ON → not 131 (approval path).
// Uses 87 ON so the customer-id auto-generates (no manual id needed). Cleans up.
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const ORG = 36;

export default {
  id: 'TC-PARAM-ACT-147',
  title: 'Customer Approval (147) sets created-customer status',
  track: 'B',
  role: 'superadmin',
  urlPath: '/customers/customers/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Customers) → customer create',
  hints: '- CustomerController create: 147 off → setWorkflowStatus(131); on → approval workflow.',

  data() { const stamp = Date.now().toString().slice(-7); return { stamp }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const orig87 = await readOrgParamState(page, base, ORG, 87);
    const orig147 = await readOrgParamState(page, base, ORG, 147);
    await setOrgParam(page, base, ORG, 87, true);   // auto customer-id → no manual id

    const createCustomer = async (name) => {
      await up.goto(`${MIG}/customers/customers/new`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(700);
      await up.selectOption('#entityIds', '34').catch(() => {});
      await up.fill('#customerName', name).catch(() => {});
      await up.selectOption('#customerType', '2').catch(() => {});
      await forms.migratedChooseMs(up, 'country', 'India');
      await up.waitForTimeout(1500);   // state cascade (AJAX)
      const stateTxt = await up.evaluate(() => { const s = document.querySelector('#state'); return s && s.options.length > 1 ? s.options[1].textContent.trim() : null; });
      if (stateTxt) await forms.migratedChooseMs(up, 'state', stateTxt);
      await Promise.all([
        up.waitForLoadState('networkidle').catch(() => {}),
        up.evaluate(() => { if (window.RaptechForm && RaptechForm.trySubmit) RaptechForm.trySubmit(); else document.querySelector('form[data-raptech-form]')?.requestSubmit(); }),
      ]);
      await up.waitForTimeout(1500);
      const created = /\/customers\/customers\/\d+/.test(up.url());
      const err = created ? null : await up.evaluate(() => {
        const d = [...document.querySelectorAll('div')].filter(x => x.children.length === 0 && /not created/i.test(x.textContent || ''));
        return d.length ? d[0].textContent.trim().slice(0, 200) : null;
      });
      const status = psql(`SELECT workflow_status FROM raptech_scm.customer WHERE name = '${name}' ORDER BY customer_id_pk DESC LIMIT 1;`);
      return { created, url: up.url(), status, err };
    };

    // Seed a wtype-48 CUSTOMER approval flow on this org/entity so the 147-ON path is
    // actually exercised (org 36 has none natively). Clone a real flow's stages (valid
    // wsbt_id_fk etc.). Torn down in finally. SEED_WF is a fixed high id for clean removal.
    const SEED_WF = 990001;
    const teardownFlow = () => {
      psql(`DELETE FROM raptech_scm.workflow_audit_track WHERE wfa_id_fk IN (SELECT wfa_id_pk FROM raptech_scm.workflow_audit WHERE wf_id_fk=${SEED_WF})`);
      psql(`DELETE FROM raptech_scm.workflow_audit WHERE wf_id_fk=${SEED_WF}`);
      psql(`DELETE FROM raptech_scm.workflow_stage WHERE wf_id_fk=${SEED_WF}`);
      psql(`DELETE FROM raptech_scm.workflow WHERE wf_id_pk=${SEED_WF}`);
    };
    const seedFlow = () => {
      teardownFlow();
      const src = (psql(`SELECT w.wf_id_pk FROM raptech_scm.workflow w JOIN raptech_scm.workflow_type_mapping m ON m.wf_tm_pk=w.wf_tm_fk WHERE m.wtype_id_fk=48 AND w.status=0 AND (w.del_flag IS NULL OR w.del_flag='N') AND EXISTS (SELECT 1 FROM raptech_scm.workflow_stage s WHERE s.wf_id_fk=w.wf_id_pk AND (s.del_flag IS NULL OR s.del_flag<>'Y')) ORDER BY w.wf_id_pk LIMIT 1`) || '').trim();
      if (!src) return false;
      psql(`INSERT INTO raptech_scm.workflow (wf_id_pk,name_,status,del_flag,created_date,updated_date,created_by,updated_by,org_id_fk,wf_tm_fk,entity_id_fk,is_condition,condition_type) SELECT ${SEED_WF},'ZZ TEST CUST FLOW',0,'N',created_date,updated_date,created_by,updated_by,${ORG},wf_tm_fk,34,'N',NULL FROM raptech_scm.workflow WHERE wf_id_pk=${src}`);
      psql(`INSERT INTO raptech_scm.workflow_stage (wfs_id_pk,due_days,seq_flow,is_mandatory,notification,del_flag,wf_id_fk,wsbt_id_fk,amount) SELECT 990000000+wfs_id_pk,due_days,seq_flow,is_mandatory,notification,del_flag,${SEED_WF},wsbt_id_fk,amount FROM raptech_scm.workflow_stage WHERE wf_id_fk=${src} AND (del_flag IS NULL OR del_flag<>'Y')`);
      return true;
    };

    const offName = `ZZ CustApp Off ${data.stamp}`;
    const onName = `ZZ CustApp On ${data.stamp}`;
    let off, on, seeded = false;
    try {
      seeded = seedFlow();
      await setOrgParam(page, base, ORG, 147, false);
      off = await createCustomer(offName);
      await setOrgParam(page, base, ORG, 147, true);
      on = await createCustomer(onName);
    } finally {
      // restore params + cleanup customers + remove seeded flow
      await setOrgParam(page, base, ORG, 147, orig147 === null ? false : orig147);
      await setOrgParam(page, base, ORG, 87, orig87 === null ? false : orig87);
      try {
        psql(`DELETE FROM raptech_scm.customer_org_mapping WHERE customer_id_fk IN (SELECT customer_id_pk FROM raptech_scm.customer WHERE name IN ('${offName}','${onName}'));`);
        psql(`DELETE FROM raptech_scm.customer WHERE name IN ('${offName}','${onName}');`);
      } catch (e) { /* leave test customers (ZZ-named) */ }
      try { teardownFlow(); } catch (e) { /* best-effort */ }
      await uctx.close();
    }

    return { seeded, offCreated: off?.created, offStatus: off?.status, onCreated: on?.created, onStatus: on?.status, onErr: on?.err, offUrl: off?.url };
  },

  check(m) {
    return [
      { aspect: 'Seeded a wtype-48 flow on the org', migrated: m.seeded ? 'seeded' : 'no source flow to clone', expected: 'seeded', ok: m.seeded === true, severity: m.seeded ? undefined : 'warn' },
      { aspect: 'Customer create succeeded (147 OFF)', migrated: m.offCreated ? 'created' : `blocked (${m.offUrl})`, expected: 'created', ok: m.offCreated === true },
      { aspect: '147 OFF → status LIVE (131)', migrated: m.offStatus || '(none)', expected: '131', ok: m.offStatus === '131' },
      { aspect: '147 ON + flow → customer created (no raise() error)', migrated: m.onCreated ? 'created' : `FAILED: ${m.onErr || m.onStatus}`, expected: 'created', ok: m.onCreated === true },
      { aspect: '147 ON + flow → status PENDING (≠131)', migrated: m.onStatus || '(none)', expected: '≠131 (approval)', ok: !!m.onStatus && m.onStatus !== '131' },
    ];
  },
};
