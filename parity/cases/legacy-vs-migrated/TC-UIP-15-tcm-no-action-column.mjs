// TC-UIP-15 — Manual issue #15: Tax Country Mapping grid shows an unwanted "Action"
// column. EXPECTED: no Action column (legacy viewTaxCountryMapping.jsp renders an
// Action header whose only action — a delete link — is fully commented out, and it
// offers NO edit/details; i.e. legacy has no usable row actions on this grid).
// Migrated AdminMiscController.taxCountryMappingList() declares View/Edit/Delete
// GridActions (AdminMiscController.java ~lines 270-282), so the grid renders an
// Actions column. This case asserts the column is absent → fails now (bug reproduced),
// goes green once the actions are removed from the grid config.
export default {
  id: 'TC-UIP-15',
  title: 'Manual #15 — Tax Country Mapping grid has no Action column',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/tax-country-mapping',
  module: 'Admin Settings',
  subModule: 'Tax Country Mapping',
  hints: '- Manual issue #15: unwanted Action column on the Tax Country Mapping grid.\n'
       + '- Legacy viewTaxCountryMapping.jsp: Action header present but delete commented out, no edit/details → no usable actions.\n'
       + '- Migrated: AdminMiscController.taxCountryMappingList() .actions(View/Edit/Delete) renders the column.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/admin/tax-country-mapping`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});

    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const hasActionHeader = columns.some(c => /^actions?$/i.test(c));

    // also detect an actions cell renderer (action buttons / kebab) in the grid body
    const hasActionCells = await page.evaluate(() =>
      document.querySelectorAll('.ag-cell[col-id="actions"], .ag-cell .grid-action, .ag-cell .row-actions, [col-id="actions"]').length > 0);

    return { columns, hasActionHeader, hasActionCells, shots };
  },

  check(m) {
    return [
      { aspect: 'No "Action(s)" column header',
        migrated: m.hasActionHeader ? `present: ${m.columns.filter(c => /action/i.test(c)).join(', ')}` : 'absent',
        expected: 'no Action column (legacy has none usable)',
        ok: m.hasActionHeader === false },
      { aspect: 'No row-action cells rendered',
        migrated: m.hasActionCells ? 'present' : 'absent',
        expected: 'none',
        ok: m.hasActionCells === false, severity: 'warn' },
    ];
  },
};
