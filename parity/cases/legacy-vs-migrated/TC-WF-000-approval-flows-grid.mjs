// TC-WF-000 — Workflows → Approval Flows grid (org admin, non-superadmin) — Track B (structure).
export default {
  id: 'TC-WF-000', title: 'Approval Flows grid reachable + columns', track: 'B', role: 'regular',
  urlPath: '/admin/workflows/approval-flows', module: 'Admin Settings', subModule: 'Workflows → Approval Flows',
  hints: '- WorkflowController.approvalFlowList + rows (wfTmId, approvalType, dates, status).',
  async runMigrated({ page, base, creds, forms, shot }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/workflows/approval-flows`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-header-cell-text', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const columns = await page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
    const rows = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : null; }, `${MIG}/admin/workflows/approval-flows/rows`);
    return { columns, rowCount: rows ? rows.length : null };
  },
  check(m) {
    const cols = (m.columns || []).map(c => c.toLowerCase());
    return [
      { aspect: 'Grid reachable', migrated: m.rowCount, expected: 'non-null', ok: m.rowCount !== null },
      { aspect: 'Columns render', migrated: (m.columns || []).join(', ') || '(none)', expected: '>= 1', ok: (m.columns || []).length >= 1 },
      { aspect: 'Has an Approval Type / Type column', migrated: cols.some(c => /type/.test(c)), expected: true, ok: cols.some(c => /type/.test(c)) },
    ];
  },
};
