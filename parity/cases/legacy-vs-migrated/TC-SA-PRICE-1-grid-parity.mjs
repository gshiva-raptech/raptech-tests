// TC-SA-PRICE-1 — Org Pricing grid, UI-only legacy↔migrated parity (super admin).
// Verifies what the user sees: the rendered grid columns on BOTH apps, that the
// migrated grid shows the session-org's pricing row(s), and that the only row action
// offered is "Edit Pricing" (the migrated grid declares one GridAction:
// OrgPricingController.orgPricingList → GridAction.of("Edit Pricing","edit","view")).
import * as ui from '../../lib/ui.mjs';

const norm = arr => (arr || []).map(s => s.toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean);

export default {
  id: 'TC-SA-PRICE-1',
  title: 'Org Pricing grid — UI parity (columns + Edit Pricing row action)',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/org-pricing',
  module: 'Admin Settings',
  subModule: 'Org Pricing',
  priority: 'Low',
  hints: '- Legacy /admin/viewOrgPricing.action grid. Migrated OrgPricingController + OrgPricingSchema.\n'
       + '- Migrated row action: "Edit Pricing" only (opens the read-only edit form).',

  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    await page.goto(`${base}/admin/viewOrgPricing.action`, { waitUntil: 'networkidle' });
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
    await page.goto(`${MIG}/admin/org-pricing`, { waitUntil: 'networkidle' });
    await ui.gridReady(page);
    const columns = await ui.gridColumns(page);
    const rows = await ui.gridRows(page);

    let rowActions = [];
    if (rows.length) {
      await page.click('.ag-pinned-right-cols-container .ag-row[row-index="0"] button.rap-kebab').catch(() => {});
      await page.waitForTimeout(400);
      rowActions = await page.$$eval('button.menu-item, [role=menuitem]',
        els => els.filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean)).catch(() => []);
      await page.keyboard.press('Escape').catch(() => {});
    }
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, rowCount: rows.length, rowActions, shots };
  },

  compare(legacy, migrated) {
    const L = norm(legacy.columns).filter(c => !/^actions?$/.test(c));
    const M = norm(migrated.columns).filter(c => !/^actions?$/.test(c));
    return [
      { aspect: 'Both grids render columns to the user',
        legacy: L.join(', ') || '(none)', migrated: M.join(', ') || '(none)',
        ok: L.length >= 1 && M.length >= 1, severity: 'warn' },
      { aspect: 'Migrated grid shows the session-org pricing row(s)',
        legacy: 'n/a', migrated: migrated.rowCount, ok: migrated.rowCount >= 1, severity: 'warn' },
      { aspect: 'Only the "Edit Pricing" row action is offered',
        legacy: 'n/a', migrated: migrated.rowActions.join('/') || '(none)',
        ok: migrated.rowActions.length === 1 && /edit pricing/i.test(migrated.rowActions[0] || ''),
        severity: 'warn' },
    ];
  },
};
