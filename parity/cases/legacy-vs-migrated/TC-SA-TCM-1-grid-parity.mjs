// TC-SA-TCM-1 — Tax Country Mapping grid, UI-only legacy↔migrated parity (super admin).
// Verifies ONLY what the user sees in the rendered grid (AG-Grid header cells + body
// cells the user reads), driving BOTH the legacy Struts grid and the migrated AG-Grid.
//
// Two confirmed user-visible defects on the migrated grid (manual #14 / #15, F-0010):
//   #15 — migrated grid renders an "Actions" column with a working View/Edit/Delete
//         kebab. Legacy viewTaxCountryMapping.jsp has an Action header whose only
//         action (a delete link) is fully commented out → NO usable row action. So the
//         migrated grid hands the user delete/edit power legacy never gave them here.
//   #14 — migrated grid shows the raw integer business-type code ("0") in the
//         "Business Type" column instead of a human label. (Legacy has no Business
//         Type column at all, so any visible numeric code is a migrated-only leak.)
// Both are asserted against EXPECTED behavior, so this case FAILS now (reproducing the
// bugs in the UI) and goes green once they are fixed.
import * as ui from '../../lib/ui.mjs';

const norm = arr => (arr || []).map(s => s.toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean);

export default {
  id: 'TC-SA-TCM-1',
  title: 'Tax Country Mapping grid — UI parity (Action column + Business Type label)',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/tax-country-mapping',
  module: 'Admin Settings',
  subModule: 'Tax Country Mapping',
  priority: 'Medium',
  hints: '- Manual #15 (F-0010): migrated grid has an Actions column (View/Edit/Delete kebab); legacy has none usable.\n'
       + '- Manual #14 (F-0010): migrated "Business Type" column shows raw "0"; AdminMiscController.resolveBusinessType ~L973 only maps 1/2.\n'
       + '- Legacy grid columns (no Tax Type / no Business Type): Action, Module, From/To Country/State/City, Group Id.',

  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    await page.goto(`${base}/admin/viewTaxCountryMapping.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const columns = await page.$$eval('[role=columnheader], th',
      els => els.map(e => e.textContent.trim()).filter(Boolean));
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, shots };
  },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/tax-country-mapping`, { waitUntil: 'networkidle' });
    await ui.gridReady(page);

    const columns = await ui.gridColumns(page);                 // what the user reads as headers
    const rows = await ui.gridRows(page);

    // Does the user see an "Actions" column header?
    const hasActionHeader = columns.some(c => /^actions?$/i.test(c.trim()));
    // Is there a working row-action kebab (real user power: open it → View/Edit/Delete)?
    let rowActions = [];
    if (rows.length) {
      await page.click('.ag-pinned-right-cols-container .ag-row[row-index="0"] button.rap-kebab').catch(() => {});
      await page.waitForTimeout(400);
      rowActions = await page.$$eval('button.menu-item, [role=menuitem]',
        els => els.filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean)).catch(() => []);
      await page.keyboard.press('Escape').catch(() => {});
    }

    // Business Type column cell values the user actually sees. Read by col-id (the grid
    // has a leading controls column, so positional indexing is off by one).
    const btCells = await page.evaluate(() => [...new Set(
      [...document.querySelectorAll('.ag-center-cols-container .ag-cell[col-id="businessTypeName"]')]
        .map(c => c.textContent.trim()))]);
    // A purely-numeric, non-empty cell (e.g. "0") is the raw-code leak.
    const numericLeak = btCells.filter(v => v !== '' && v !== '—' && /^\d+$/.test(v));

    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, rowCount: rows.length, hasActionHeader, rowActions, btCells, numericLeak, shots };
  },

  compare(legacy, migrated) {
    const L = norm(legacy.columns).filter(c => !/^actions?$/.test(c));
    const M = norm(migrated.columns).filter(c => !/^actions?$/.test(c));
    const missing = L.filter(c => !M.includes(c));
    return [
      // Structural diff (data columns only, action stripped) — informational.
      { aspect: 'Legacy data columns are all present in migrated',
        legacy: L.join(', ') || '(none read)', migrated: M.join(', ') || '(none read)',
        ok: missing.length === 0, severity: 'warn',
        note: missing.length ? `missing: ${missing.join(', ')}` : '' },
      // #15 — the unwanted Actions column + working kebab.
      { aspect: 'No usable row-action column (legacy delete is commented out)',
        legacy: 'Action header present but no usable action',
        migrated: migrated.hasActionHeader
          ? `Actions column with kebab: ${migrated.rowActions.join('/') || '(menu)'}`
          : 'no Actions column',
        ok: migrated.hasActionHeader === false && migrated.rowActions.length === 0 },
      // #14 — Business Type raw-code leak.
      { aspect: 'Business Type column shows no raw numeric code',
        legacy: 'no Business Type column in legacy grid',
        migrated: `cells=${JSON.stringify(migrated.btCells)}`,
        ok: migrated.numericLeak.length === 0,
        note: migrated.numericLeak.length ? `raw codes shown: ${migrated.numericLeak.join(', ')}` : '' },
    ];
  },
};
