// TC-UIP-14 — Manual issue #14: Tax Country Mapping "Business Type" column shows
// "0" for all rows. EXPECTED: the column shows the legacy business-type LABEL, not
// the raw integer code. Legacy maps business_type 0 -> "" (blank/unselected),
// 4 -> "Unregistered Business" (ApplicationConstant.RCM), 5 -> "Special Economic
// Zone" (ApplicationConstant.REGULAR_SEZ); codes 1/2/3 are never used in this grid.
// Migrated AdminMiscController.resolveBusinessType() only maps 1->Supplier,
// 2->Customer and falls through to String.valueOf(code) for everything else, so the
// real data (0/4/5) renders as the bare number. This case asserts EXPECTED labels →
// fails now (reproducing the bug), goes green once resolveBusinessType is fixed.
export default {
  id: 'TC-UIP-14',
  title: 'Manual #14 — Tax Country Mapping Business Type shows label (not "0")',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/tax-country-mapping/rows',
  module: 'Admin Settings',
  subModule: 'Tax Country Mapping',
  hints: '- Manual issue #14: Business Type column = "0" for all rows.\n'
       + '- Migrated rows expose businessTypeName = AdminMiscController.resolveBusinessType(business_type).\n'
       + '- Legacy labels: 0="" , 4="Unregistered Business", 5="Special Economic Zone".\n'
       + '- Bug: resolveBusinessType() (AdminMiscController.java ~line 973) only maps 1/2; 0/4/5 leak raw.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const rows = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      return r.ok ? await r.json() : null;
    }, `${MIG}/admin/tax-country-mapping/rows`);
    if (!rows || !rows.length) throw new Error('no tax-country-mapping rows returned');

    // distinct businessTypeName values currently served
    const distinct = [...new Set(rows.map(r => String(r.businessTypeName)))].sort();

    // A value is "buggy" if it is a raw numeric code that should have been a label.
    // Legacy: 0 -> blank, 4/5 -> a non-numeric label. Any purely-numeric, non-empty
    // businessTypeName (e.g. "0","4","5") is the bug.
    const numericLeak = distinct.filter(v => v !== '' && v !== 'null' && /^\d+$/.test(v));

    // Expected label resolution for the codes that actually occur in the data.
    const EXPECT = { 0: '', 4: 'Unregistered Business', 5: 'Special Economic Zone' };
    // Cross-check a few rows against the DB business_type code.
    const sample = rows.slice(0, 8).map(r => ({ id: r.taxCountryMappingId, shown: String(r.businessTypeName) }));

    await page.goto(`${MIG}/admin/tax-country-mapping`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});

    // read the rendered Business Type cells as the user sees them
    const cellValues = await page.evaluate(() => {
      const idx = [...document.querySelectorAll('.ag-header-cell-text')].findIndex(e => /business type/i.test(e.textContent));
      if (idx < 0) return null;
      const cells = [...document.querySelectorAll(`.ag-center-cols-container .ag-row [aria-colindex]`)];
      // fall back: grab all cells under the Business Type column by col-id text
      const vals = [...document.querySelectorAll('.ag-cell')]
        .filter(c => c.getAttribute('col-id') === 'businessTypeName')
        .map(c => c.textContent.trim());
      return [...new Set(vals)];
    });

    return { distinct, numericLeak, sample, cellValues, EXPECT, shots };
  },

  check(m) {
    return [
      { aspect: 'Business Type column has no raw numeric codes',
        migrated: `distinct=${JSON.stringify(m.distinct)}`,
        expected: 'labels only (e.g. "Unregistered Business", "Special Economic Zone", blank) — never "0"/"4"/"5"',
        ok: m.numericLeak.length === 0,
        note: m.numericLeak.length ? `raw numeric values leaked: ${m.numericLeak.join(', ')}` : '' },
      { aspect: 'Code 4 renders as "Unregistered Business"',
        migrated: m.distinct.includes('4') ? '"4" (raw)' : (m.distinct.includes('Unregistered Business') ? 'Unregistered Business' : 'n/a'),
        expected: 'Unregistered Business',
        ok: !m.distinct.includes('4'), severity: 'warn' },
      { aspect: 'Code 5 renders as "Special Economic Zone"',
        migrated: m.distinct.includes('5') ? '"5" (raw)' : (m.distinct.includes('Special Economic Zone') ? 'Special Economic Zone' : 'n/a'),
        expected: 'Special Economic Zone',
        ok: !m.distinct.includes('5'), severity: 'warn' },
    ];
  },
};
