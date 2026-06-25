// TC-GEN-FY-001 — Financial Year create / edit / delete — Track B.
// Create: entity + startDate + endDate + openingDate (no duplicate guard). Edit: ONLY status is
// editable (entity + dates read-only) → verify the update endpoint succeeds. Delete via endpoint.
export default {
  id: 'TC-GEN-FY-001', title: 'Financial Year create / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/general/financial-year', module: 'Admin Settings', subModule: 'General → Financial Year',
  hints: '- GeneralController financialYearCreate, {id} update (status only), {id}/delete.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/general/financial-year/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/general/financial-year/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    let id = null, inGrid = false, editMsg = null, deletedGone = false;
    try {
      // create
      await page.goto(`${MIG}/admin/general/financial-year/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const entVal = await page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await page.fill('#startDate', '2026-01-01').catch(() => {});
      await page.fill('#endDate', '2027-03-31').catch(() => {});
      await page.fill('#openingDate', '2026-01-01').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create financial year/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/financial-year\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.financialId) === String(id)) : false;

      // edit (status-only) → confirm the update endpoint succeeds
      if (id) {
        await page.goto(`${MIG}/admin/general/financial-year/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save changes/i }).click()]);
        await page.waitForTimeout(1000);
        editMsg = await page.evaluate(() => { const d = [...document.querySelectorAll('div')].filter(x => x.children.length === 0 && /updated successfully|failed/i.test(x.textContent || '')); d.sort((a, b) => a.textContent.length - b.textContent.length); return d.length ? d[0].textContent.trim() : null; });
      }

      // delete
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.financialId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
    }
    return { createdInGrid: inGrid, editMsg, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Edit (status-only) update succeeds', migrated: m.editMsg || '(none)', expected: 'Updated successfully', ok: /updated successfully/i.test(m.editMsg || '') },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
