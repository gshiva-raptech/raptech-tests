// TC-UIP-08 — Manual issue #8: the DEFAULT org-pricing record's End Date is editable
// via Edit Pricing, but should NOT be editable for the default record. The default
// record is the one auto-created at org creation (legacy
// OrganizationServiceImpl.saveOrgPricing: TRIAL plan, no txn_id). The migrated
// org_pricing has no default flag; the default row is identified by txn_id IS NULL.
//
// EXPECTED: on the default record's Edit Pricing form, the End Date (#toDate) input
// is NOT editable (disabled / readonly / rendered static). Migrated
// OrgPricingController.orgPricingForm() + admin/org-pricing/form.html render #toDate
// editable for every record, so this fails now (bug reproduced) and goes green once
// the default record locks the End Date.
//
// NOTE (parity caveat, see report): legacy editOrgPricing.jsp makes End Date editable
// on EVERY record including the default — so this is a NEW requirement, not strict
// legacy parity. This case encodes the manual issue's stated expectation.
export default {
  id: 'TC-UIP-08',
  title: 'Manual #8 — Default org-pricing record End Date not editable',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-pricing/{id}',
  module: 'Admin Settings',
  subModule: 'Org Pricing',
  hints: '- Manual issue #8: default pricing record End Date editable; should be read-only for the default.\n'
       + '- Default = org-creation row (txn_id IS NULL, TRIAL plan).\n'
       + '- Migrated OrgPricingController.orgPricingForm()/orgPricingUpdate() + form.html allow editing #toDate for all rows.\n'
       + '- Parity caveat: legacy makes End Date editable on ALL rows; this asserts the manual issue requirement.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const rows = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      return r.ok ? await r.json() : null;
    }, `${MIG}/admin/org-pricing/rows`);
    if (!rows || !rows.length) throw new Error('no org-pricing rows for active org');

    // Identify the DEFAULT record: org-creation row has txn_id NULL. If several
    // rows have null txnId, take the earliest (lowest id) — the org-creation one.
    const defaults = rows.filter(r => r.txnId == null || r.txnId === '');
    const defaultRow = (defaults.length ? defaults : rows)
      .slice().sort((a, b) => Number(a.orgPricingId) - Number(b.orgPricingId))[0];
    const pid = defaultRow.orgPricingId;
    const isDefaultByTxn = defaultRow.txnId == null || defaultRow.txnId === '';

    await page.goto(`${MIG}/admin/org-pricing/${pid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});

    // Is the End Date field editable on the default record's form?
    const toDate = await page.evaluate(() => {
      const el = document.querySelector('#toDate, [name=toDate]');
      if (!el) return { present: false };
      return {
        present: true,
        tag: el.tagName,
        type: el.type || '',
        disabled: !!el.disabled,
        readonly: !!el.readOnly,
        value: el.value || '',
      };
    });
    const editable = toDate.present && !toDate.disabled && !toDate.readonly;

    return { pid, isDefaultByTxn, defaultRowPlan: defaultRow.plan, toDate, editable, rowCount: rows.length, shots };
  },

  check(m) {
    return [
      { aspect: 'Default record identified (txn_id null)',
        migrated: `id=${m.pid} plan=${m.defaultRowPlan} txnNull=${m.isDefaultByTxn} (of ${m.rowCount} rows)`,
        expected: 'a default/org-creation row exists', ok: !!m.pid, severity: 'warn' },
      { aspect: 'Default record End Date is NOT editable',
        migrated: m.toDate && m.toDate.present
          ? `editable=${m.editable} (disabled=${m.toDate.disabled}, readonly=${m.toDate.readonly})`
          : 'End Date field absent',
        expected: 'disabled or readonly (non-editable) for the default record',
        ok: m.toDate && m.toDate.present ? m.editable === false : false },
    ];
  },
};
