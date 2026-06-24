// TC-PARAM-SI-081 — Sales Invoice Credit Limit (org param 81) enforcement (F-0006).
// Mirrors legacy CHECK_CREDIT_LIMIT (distinct from SO 69). With 81 enabled the pre-save
// check blocks when customer NOT-RECEIVED invoiced total + THIS invoice > credit_limit.
// Driven purely off the new-invoice contribution (1000 × 1000 = 1,000,000):
//   - credit_limit LOW (1)            → submit BLOCKED ("credit limit exceeded")
//   - credit_limit HIGH (1e12)        → submit allowed (no credit error)
import { switchOrg, setOrgParam, readOrgParamState } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

const ORG = 36;
const CUSTOMER = 109;     // a customer in org 36
const ENTITY = 34;        // belongs to org 36
const CURRENCY = '7';

export default {
  id: 'TC-PARAM-SI-081',
  title: 'Sales Invoice Credit Limit (81) blocks an over-limit invoice, allows within-limit',
  track: 'B',
  role: 'superadmin',
  urlPath: '/sales-invoice/sales-invoices/new',
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Invoice) → invoice submit credit-limit guard',
  hints: '- SalesInvoiceController.siCreditLimitError (param 81); CustomerInvoiceMasterRepository.salesInvoiceOutstandingForCreditLimit; pre-save (no @Transactional).',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    const submitInvoice = async () => {
      await up.goto(`${MIG}/sales-invoice/sales-invoices/new`, { waitUntil: 'networkidle' });
      await up.waitForTimeout(400);
      const csrf = await up.evaluate(() => document.querySelector('input[name="_csrf"]')?.value || '');
      return up.evaluate(async ({ MIG, csrf, ENTITY, CUSTOMER, CURRENCY }) => {
        const p = new URLSearchParams();
        p.set('entityId', String(ENTITY));
        p.set('customerId', String(CUSTOMER));
        p.set('currency', CURRENCY);
        p.set('invoiceType', 'Non PO');
        p.set('itemJson', JSON.stringify([{ itemNo: 'TST-CL', qty: 1000, price: 1000 }]));
        p.set('_csrf', csrf);
        const r = await fetch(`${MIG}/sales-invoice/sales-invoices/new`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: p.toString(), redirect: 'follow',
        });
        const t = await r.text();
        return { creditError: /credit limit exceeded/i.test(t) };
      }, { MIG, csrf, ENTITY, CUSTOMER, CURRENCY });
    };

    const orig81 = await readOrgParamState(page, base, ORG, 81);
    await setOrgParam(page, base, ORG, 81, true);

    psql(`UPDATE raptech_scm.customer SET credit_limit=1 WHERE customer_id_pk=${CUSTOMER};`);
    const low = await submitInvoice();

    psql(`UPDATE raptech_scm.customer SET credit_limit=1000000000000 WHERE customer_id_pk=${CUSTOMER};`);
    const high = await submitInvoice();

    // restore param + limit
    psql(`UPDATE raptech_scm.customer SET credit_limit=0 WHERE customer_id_pk=${CUSTOMER};`);
    await setOrgParam(page, base, ORG, 81, orig81 === null ? false : orig81);

    // clean up any invoice the high-limit (allowed) submit created in the last 5 min
    try {
      const recent = `SELECT master_invoice_id_pk FROM raptech_scm.customer_invoice_master WHERE org_id_fk=${ORG} AND customer_id_fk=${CUSTOMER} AND created_date > now() - interval '5 minutes'`;
      const inv = `SELECT invoice_id_pk FROM raptech_scm.customer_invoice WHERE master_invoice_id_fk IN (${recent})`;
      psql(`DELETE FROM raptech_scm.customer_invoice_item WHERE section_id_fk IN (SELECT section_id_pk FROM raptech_scm.customer_invoice_section WHERE invoice_id_fk IN (${inv}));`);
      psql(`DELETE FROM raptech_scm.customer_invoice_section WHERE invoice_id_fk IN (${inv});`);
      psql(`DELETE FROM raptech_scm.customer_invoice WHERE master_invoice_id_fk IN (${recent});`);
      psql(`DELETE FROM raptech_scm.customer_invoice_master WHERE org_id_fk=${ORG} AND customer_id_fk=${CUSTOMER} AND created_date > now() - interval '5 minutes';`);
    } catch (e) { /* best-effort */ }
    await uctx.close();

    return { lowBlocked: low.creditError, highBlocked: high.creditError };
  },

  check(m) {
    return [
      { aspect: '81 ON + low limit → over-limit invoice blocked',   migrated: m.lowBlocked,  expected: true,  ok: m.lowBlocked === true },
      { aspect: '81 ON + high limit → within-limit invoice allowed', migrated: m.highBlocked, expected: false, ok: m.highBlocked === false },
    ];
  },
};
