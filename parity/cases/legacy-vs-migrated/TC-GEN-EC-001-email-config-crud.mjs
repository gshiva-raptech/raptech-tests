// TC-GEN-EC-001 — Email Configuration create / duplicate / edit / delete — Track B.
// Create: name + subject + content (file uploads optional, skipped). Guard: duplicate name.
// Edit: name/subject/content editable. Delete via endpoint.
export default {
  id: 'TC-GEN-EC-001', title: 'Email Configuration create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/general/email-configuration', module: 'Admin Settings', subModule: 'General → Email Configuration',
  hints: '- GeneralController emailConfigCreate (dup-name guard), {id} update, {id}/delete.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ EmailCfg ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/general/email-configuration/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/general/email-configuration/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    const fillNew = async (nm) => {
      await page.goto(`${MIG}/admin/general/email-configuration/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.fill('#name', nm).catch(() => {});
      await page.fill('#emailSubject', 'Test Subject').catch(() => {});
      await page.fill('#emailContent', 'Test body content').catch(() => {});
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
    try {
      // create
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create email config/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/email-configuration\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.emailConfigId) === String(id)) : false;

      // duplicate (same name)
      await fillNew(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create email config/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit (change subject)
      if (id) {
        const newSubj = `Edited Subject ${data.stamp}`;
        await page.goto(`${MIG}/admin/general/email-configuration/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await page.fill('#emailSubject', newSubj).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save changes/i }).click()]);
        await page.waitForTimeout(1000);
        await page.goto(`${MIG}/admin/general/email-configuration/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        editPersisted = (await page.inputValue('#emailSubject').catch(() => '')) === newSubj;
      }

      // delete
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.emailConfigId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
    }
    return { createdInGrid: inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate blocked ("already exists")', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (subject) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
