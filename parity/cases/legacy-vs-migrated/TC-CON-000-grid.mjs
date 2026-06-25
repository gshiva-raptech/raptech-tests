// TC-CON-000 — Admin → Contracts — all 3 grid sub-tabs reachable + columns — Track B (structure).
// Sub-tabs: contract-type, services, do-categories. Each is an AG-Grid with a rows JSON endpoint.
export default {
  id: 'TC-CON-000', title: 'Contracts grids reachable + columns (3 sub-tabs)', track: 'B', role: 'regular',
  urlPath: '/admin/contracts/contract-type', module: 'Admin Settings', subModule: 'Contracts → grids',
  hints: '- ContractsController: contract-type / services / do-categories grids + /rows.',
  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const probe = async (tab) => {
      await page.goto(`${MIG}/admin/contracts/${tab}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.ag-header-cell-text', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
      const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/contracts/${tab}/rows`);
      return { columns, rowCount: rows ? rows.length : null };
    };

    const contractType = await probe('contract-type');
    const services     = await probe('services');
    const doCategories = await probe('do-categories');
    return { contractType, services, doCategories };
  },
  check(m) {
    const out = [];
    // Each grid's primary label column: Contract Type → "Contract Type", Services → "Service Name", D & O → "Category Name".
    const labelRe = { 'Contract Type': /contract type/, 'Services': /service name/, 'D & O Categories': /category name/ };
    for (const [label, r] of [['Contract Type', m.contractType], ['Services', m.services], ['D & O Categories', m.doCategories]]) {
      const cols = (r.columns || []).map(c => c.toLowerCase());
      const re = labelRe[label];
      out.push({ aspect: `${label}: grid reachable (rows endpoint)`, migrated: r.rowCount, expected: 'non-null', ok: r.rowCount !== null });
      out.push({ aspect: `${label}: columns render`, migrated: (r.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (r.columns || []).length >= 1 });
      out.push({ aspect: `${label}: has primary label column`, migrated: cols.some(c => re.test(c)), expected: true, ok: cols.some(c => re.test(c)) });
    }
    return out;
  },
};
