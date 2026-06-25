// TC-PARAM-SO-069 — Sales Order Credit Limit (org param 69) enforcement (F-0006).
// Customer 109 (org 36) has a large outstanding balance. With 69 enabled:
//   - credit_limit set LOW  → submitting an SO is BLOCKED ("credit limit exceeded")
//   - credit_limit set HIGH → submit is allowed (no credit error)
// Proves the validation blocks over-limit AND allows within-limit orders.
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const ORG = 36;
const CUSTOMER = 109;     // has outstanding ~155M in org 36
const ENTITY = 34;        // belongs to org 36
const CURRENCY = '7';
const ITEM = 9326;        // a valid item in org 36

export default {
  id: 'TC-PARAM-SO-069',
  title: 'Sales Order Credit Limit (69) blocks an over-limit submit, allows within-limit',
  track: 'B',
  role: 'superadmin',
  urlPath: '/sales-orders/sales-orders/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Order) → SO submit credit-limit guard',
  hints: '- SalesOrdersController.enforceCreditLimit (param 69); soRepo.customerOutstandingForCreditLimit; @Transactional rollback + @ExceptionHandler.',

  data() { const stamp = Date.now().toString().slice(-7); return { stamp }; },

  async runMigrated({ page, base, creds, data, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const submitSo = async (tag) => {
      await up.goto(`${MIG}/sales-orders/sales-orders/new`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(400);
      const csrf = await up.evaluate(() => document.querySelector('input[name="_csrf"]')?.value || '');
      return up.evaluate(async ({ MIG, csrf, ENTITY, CUSTOMER, CURRENCY, ITEM }) => {
        const p = new URLSearchParams();
        p.set('entityId', String(ENTITY));
        p.set('customerId', String(CUSTOMER));
        p.set('currency', CURRENCY);
        p.set('poType', 'Inventory PO');
        p.set('workflowId', '0');        // non-workflow (wf_id_fk is NOT NULL)
        p.set('globalWorkflowId', '0');
        p.set('warehouse', '14');
        p.set('submitType', 'submit');
        p.set('sectionJson', JSON.stringify([{ items: [{ itemId: ITEM, qty: 1, price: 1 }] }]));
        p.set('_csrf', csrf);
        const r = await fetch(`${MIG}/sales-orders/sales-orders/new`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: p.toString(), redirect: 'follow',
        });
        const t = await r.text();
        return { creditError: /credit limit exceeded/i.test(t) };
      }, { MIG, csrf, ENTITY, CUSTOMER, CURRENCY, ITEM });
    };

    const orig69 = await readOrgParamState(page, base, ORG, 69);
    await setOrgParam(page, base, ORG, 69, true);

    // LOW limit → block
    psql(`UPDATE raptech_scm.customer SET credit_limit=100 WHERE customer_id_pk=${CUSTOMER};`);
    const low = await submitSo('low');

    // HIGH limit → allow
    psql(`UPDATE raptech_scm.customer SET credit_limit=999999999999 WHERE customer_id_pk=${CUSTOMER};`);
    const high = await submitSo('high');

    // restore
    psql(`UPDATE raptech_scm.customer SET credit_limit=0 WHERE customer_id_pk=${CUSTOMER};`);
    await setOrgParam(page, base, ORG, 69, orig69 === null ? false : orig69);
    // delete any SO created by the high-limit (allowed) submit
    try {
      psql(`DELETE FROM raptech_scm.customer_po_items WHERE section_id_fk IN (SELECT section_id_pk FROM raptech_scm.customer_purchase_section WHERE purchase_id_fk IN (SELECT purchase_id_pk FROM raptech_scm.customer_purchase WHERE org_id_fk=${ORG} AND customer_id_fk=${CUSTOMER} AND created_by IS NOT NULL AND created_date > now() - interval '5 minutes'));`);
      psql(`DELETE FROM raptech_scm.customer_purchase_section WHERE purchase_id_fk IN (SELECT purchase_id_pk FROM raptech_scm.customer_purchase WHERE org_id_fk=${ORG} AND customer_id_fk=${CUSTOMER} AND created_date > now() - interval '5 minutes');`);
      psql(`DELETE FROM raptech_scm.customer_purchase WHERE org_id_fk=${ORG} AND customer_id_fk=${CUSTOMER} AND created_date > now() - interval '5 minutes';`);
    } catch (e) { /* leave */ }
    await uctx.close();

    return { lowBlocked: low.creditError, highBlocked: high.creditError };
  },

  check(m) {
    return [
      { aspect: '69 ON + low limit → over-limit SO blocked', migrated: m.lowBlocked, expected: true, ok: m.lowBlocked === true },
      { aspect: '69 ON + high limit → within-limit SO allowed', migrated: m.highBlocked, expected: false, ok: m.highBlocked === false },
    ];
  },
};
