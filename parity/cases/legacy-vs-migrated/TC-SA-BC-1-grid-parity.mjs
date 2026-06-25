// TC-SA-BC-1 — Barcode grid, UI-only verification (super admin). Track B.
// Legacy's "Barcode" tab points at the bulk-upload page (viewBarcodeBulkupload.action),
// NOT a barcode-format list, so there is no clean legacy grid to column-compare (F-0037
// covers the broader UI gap). We verify what the user sees on the migrated grid:
//   - the grid is reachable and renders headers (Barcode Format / Status / Created / Updated);
//   - it offers a "New Barcode" action;
//   - the row-action menu offers View + Edit only — NO Delete (legacy viewBarcode.jsp
//     exposes Edit + Details only). A Delete here would be more power than legacy.
import * as ui from '../../lib/ui.mjs';

export default {
  id: 'TC-SA-BC-1',
  title: 'Barcode grid — reachable, columns, New + no Delete row action',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/barcode',
  module: 'Admin Settings',
  subModule: 'Barcode',
  priority: 'Low',
  hints: '- AdminMiscController.barcodeList: actions View+Edit only (no Delete). Cols: Barcode Format, Status, Created, Updated.\n'
       + '- Legacy "Barcode" tab → bulk-upload page (no format grid). F-0037 tracks the wider barcode UI gap.',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/barcode`, { waitUntil: 'networkidle' });
    await ui.gridReady(page);

    const columns = await ui.gridColumns(page);
    const rows = await ui.gridRows(page);
    const hasNew = (await page.getByRole('button', { name: /new barcode|new|create/i }).count()) > 0
      || (await ui.hasControl(page, /new barcode/i));

    let rowActions = [];
    if (rows.length) {
      await page.click('.ag-pinned-right-cols-container .ag-row[row-index="0"] button.rap-kebab').catch(() => {});
      await page.waitForTimeout(400);
      rowActions = await page.$$eval('button.menu-item, [role=menuitem]',
        els => els.filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean)).catch(() => []);
      await page.keyboard.press('Escape').catch(() => {});
    }
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, rowCount: rows.length, hasNew, rowActions, shots };
  },

  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    const has = re => cols.some(c => re.test(c));
    const acts = (m.rowActions || []).map(a => a.toLowerCase());
    return [
      { aspect: 'Grid reachable + renders headers', migrated: m.columns.join(', ') || '(none)',
        expected: '>=1 column', ok: m.columns.length >= 1 },
      { aspect: 'Has a Barcode Format / Name column', migrated: has(/format|name/), expected: true, ok: has(/format|name/) },
      { aspect: 'Has a Status column', migrated: has(/status/), expected: true, ok: has(/status/) },
      { aspect: 'Offers "New Barcode" action', migrated: m.hasNew, expected: true, ok: m.hasNew === true },
      { aspect: 'Row actions limited to View/Edit (no Delete — legacy parity)',
        migrated: m.rowCount ? (m.rowActions.join('/') || '(none)') : 'no rows to check',
        expected: 'no Delete',
        ok: m.rowCount === 0 || !acts.some(a => /delete/.test(a)), severity: 'warn' },
    ];
  },
};
