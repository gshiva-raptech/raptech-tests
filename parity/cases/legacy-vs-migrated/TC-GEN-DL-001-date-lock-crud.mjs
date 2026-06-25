// TC-GEN-DL-001 — Transaction Date Lock create / duplicate / edit / delete — Track B.
// Create: entity + lockDate + endLockDate. Guard: one lock per entity. Edit: lockDate/endLockDate
// editable (entity read-only). Delete via endpoint (grid surfaces Edit+View only).
export default {
  id: 'TC-GEN-DL-001', title: 'Transaction Date Lock create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/general/transaction-date-lock', module: 'Admin Settings', subModule: 'General → Transaction Date Lock',
  hints: '- GeneralController dateLockCreate (one-per-entity guard), {id} update, {id}/delete.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/general/transaction-date-lock/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/general/transaction-date-lock/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false, entVal = null;
    try {
      // create
      await page.goto(`${MIG}/admin/general/transaction-date-lock/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      entVal = await page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await page.fill('#lockDate', '2026-01-15').catch(() => {});
      await page.fill('#endLockDate', '2026-06-20').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create date lock/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/transaction-date-lock\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.dateLockerIdPk) === String(id)) : false;

      // duplicate (same entity)
      await page.goto(`${MIG}/admin/general/transaction-date-lock/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      if (entVal) await page.selectOption('#entityId', entVal).catch(() => {});
      await page.fill('#lockDate', '2026-02-15').catch(() => {});
      await page.fill('#endLockDate', '2026-05-20').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create date lock/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit (change lockDate)
      if (id) {
        await page.goto(`${MIG}/admin/general/transaction-date-lock/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await page.fill('#lockDate', '2026-06-22').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save changes/i }).click()]);
        await page.waitForTimeout(1000);
        await page.goto(`${MIG}/admin/general/transaction-date-lock/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        editPersisted = (await page.inputValue('#lockDate').catch(() => '')) === '2026-06-22';
      }

      // delete (endpoint)
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.dateLockerIdPk) === String(id));
        id = deletedGone ? null : id;   // avoid double-delete in finally
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
    }
    return { id: '(deleted)', createdInGrid: inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate blocked (one lock per entity)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (lockDate) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
