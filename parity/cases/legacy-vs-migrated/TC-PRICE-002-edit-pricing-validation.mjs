// TC-PRICE-002 — Org Pricing → Edit Pricing validation (negative)
// Track B: migrated verified against legacy spec. Confirms the SERVER backstop for
// the two legacy rules: End Date required, and End Date must be on/after current.
// Client attrs (required/min) are removed so the request reaches the server.
export default {
  id: 'TC-PRICE-002',
  title: 'Org Pricing — End Date validation (required, ≥ current)',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/org-pricing/{id}',
  module: 'Admin Settings',
  subModule: 'Org Pricing',
  hints: '- Legacy editOrgPricing rejects empty End Date and End Date before current.\n'
       + '- Migrated: OrgPricingController.orgPricingUpdate() server validation.',

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

    // Sub A — empty End Date (bypass client required) → server rejects
    await page.goto(`${MIG}/admin/org-pricing/${pid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.evaluate(() => { const el = document.querySelector('#toDate'); el.removeAttribute('required'); el.removeAttribute('min'); el.value = ''; });
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.click('button[type=submit][form=orgPricingForm]'),
    ]);
    await page.waitForTimeout(1000);
    const requiredMsg = await page.evaluate(() => { const m = document.body.innerText.match(/End Date is required|required/i); return m ? m[0] : null; });

    // Sub B — earlier than current (bypass client min) → server rejects
    await page.goto(`${MIG}/admin/org-pricing/${pid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const curDate = await page.inputValue('#toDate').catch(() => null);
    const earlier = (() => { const d = new Date(curDate); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
    await page.evaluate((v) => { const el = document.querySelector('#toDate'); el.removeAttribute('min'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, earlier);
    shots.earlier = shot('earlier'); await page.screenshot({ path: shots.earlier, fullPage: true }).catch(() => {});
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      page.click('button[type=submit][form=orgPricingForm]'),
    ]);
    await page.waitForTimeout(1000);
    const earlierMsg = await page.evaluate(() => { const m = document.body.innerText.match(/on or after the current End Date|on or after/i); return m ? m[0] : null; });

    // confirm nothing was saved (End Date unchanged)
    await page.goto(`${MIG}/admin/org-pricing/${pid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const finalDate = await page.inputValue('#toDate').catch(() => null);

    return { pid, curDate, earlier, requiredMsg, earlierMsg, finalDate, shots };
  },

  check(m) {
    return [
      { aspect: 'Empty End Date rejected', migrated: m.requiredMsg || '(none)', expected: 'End Date is required', ok: /required/i.test(m.requiredMsg || '') },
      { aspect: 'Earlier End Date rejected', migrated: m.earlierMsg || '(none)', expected: 'on or after current', ok: /on or after/i.test(m.earlierMsg || '') },
      { aspect: 'End Date unchanged after rejects', migrated: m.finalDate, expected: m.curDate, ok: m.finalDate === m.curDate },
    ];
  },
};
