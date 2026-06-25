// TC-PRICE-001 — Org Pricing → Edit Pricing: valid save (super admin action)
// Track B: migrated verified against legacy spec. SAFE: re-saves the SAME End Date
// (>= current is allowed), so no real data change. Confirms the only editable field
// is End Date and a valid save succeeds.
export default {
  id: 'TC-PRICE-001',
  title: 'Org Pricing — Edit End Date (valid save)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-pricing/{id}',
  module: 'Admin Settings',
  subModule: 'Org Pricing',
  hints: '- Legacy editOrgPricing: only End Date (toDate) editable; required; >= current.\n'
       + '- Migrated: OrgPricingController.orgPricingUpdate().',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null;
    }, `${MIG}/admin/org-pricing/rows`);
    const pid = rows && rows[0] ? rows[0].orgPricingId : null;
    if (!pid) throw new Error('no org pricing row for active org');

    await page.goto(`${MIG}/admin/org-pricing/${pid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const curDate = await page.inputValue('#toDate').catch(() => null);
    const dateEditable = await page.evaluate(() => { const el = document.querySelector('#toDate'); return el ? !(el.readOnly || el.disabled) : null; });
    const readonlyCount = await page.evaluate(() => document.querySelectorAll('input[readonly]').length);

    await page.fill('#toDate', curDate);   // re-save same End Date (valid, no-op)
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.click('button[type=submit][form=orgPricingForm]'),
    ]);
    await page.waitForTimeout(1200);
    const msg = await page.evaluate(() => {
      const m = document.body.innerText.match(/updated successfully|Failed to update|End Date is required|on or after/i);
      return m ? m[0] : null;
    });
    shots.after = shot('after'); await page.screenshot({ path: shots.after, fullPage: true }).catch(() => {});

    return { pid, curDate, dateEditable, readonlyCount, msg, shots };
  },

  check(m) {
    return [
      { aspect: 'End Date editable, other fields read-only', migrated: `editable=${m.dateEditable}, readonlyInputs=${m.readonlyCount}`,
        expected: 'editable + ≥1 read-only', ok: m.dateEditable === true && m.readonlyCount >= 1, severity: 'warn' },
      { aspect: 'Valid End Date saves', migrated: m.msg || '(no message)', expected: 'updated successfully', ok: /updated successfully/i.test(m.msg || '') },
    ];
  },
};
