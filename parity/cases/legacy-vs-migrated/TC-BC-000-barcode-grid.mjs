// TC-BC-000 — Barcode grid (super admin tab) — Track B (structure).
// Migrated grid is org-scoped (BarcodeDetailRepository.findAllByOrgId on session org).
// Legacy "Barcode" tab links to viewBarcodeBulkupload.action (bulk-upload page, not the
// format list) → no clean legacy grid URL to column-compare; verify the migrated grid is
// reachable with the expected columns instead.
export default {
  id: 'TC-BC-000',
  title: 'Barcode grid reachable + columns',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/barcode',
  module: 'Admin Settings',
  subModule: 'Barcode',
  hints: '- AdminMiscController.barcodeList()/barcodeRows(); cols: name_, created, updated, status.',

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/barcode`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => {
      const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null;
    }, `${MIG}/admin/barcode/rows`);
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { columns, rowCount: rows ? rows.length : null, shots };
  },

  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    const has = (re) => cols.some(c => re.test(c));
    return [
      { aspect: 'Grid reachable (rows endpoint)', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1 column', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has a Name/Format column', migrated: has(/name|format/), expected: true, ok: has(/name|format/) },
      { aspect: 'Has a Status column', migrated: has(/status/), expected: true, ok: has(/status/) },
    ];
  },
};
