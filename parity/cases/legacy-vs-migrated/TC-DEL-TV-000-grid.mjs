// TC-DEL-TV-000 — Admin → Delivery → Transporter Vehicles grid — Track B (structure).
export default {
  id: 'TC-DEL-TV-000', title: 'Transporter Vehicles grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/delivery/transporter-vehicles', module: 'Admin Settings', subModule: 'Delivery → Transporter Vehicles',
  hints: '- DeliveryController transporterGrid + rows. Columns: Entity, Transporter Type, Transporter, Created/Updated By/Date, Status.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/delivery/transporter-vehicles`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/delivery/transporter-vehicles/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable (rows endpoint)', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has Transporter Type column', migrated: cols.some(c => /transporter type/.test(c)), expected: true, ok: cols.some(c => /transporter type/.test(c)) },
      { aspect: 'Has Entity column', migrated: cols.some(c => /entity/.test(c)), expected: true, ok: cols.some(c => /entity/.test(c)) },
    ];
  },
};
