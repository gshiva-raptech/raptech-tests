// TC-LOB-001 — Line of Business create / duplicate / edit (org admin, non-superadmin) — Track B.
// Name-only entity; grid offers Edit + View (no delete). Dup-name guard ("already exists").
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-LOB-001',
  title: 'Line of Business create / duplicate / edit',
  track: 'B',
  role: 'regular',
  urlPath: '/admin/organization/line-of-business',
  module: 'Admin Settings',
  subModule: 'Organization → Line of Business',
  hints: '- OrgSettingsController lineOfBusinessCreate (isDuplicateFunctionName), /{functionId} update. Table functions.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ LOB ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/organization/line-of-business/rows`);
    const fillCreate = async (nm) => { await page.goto(`${MIG}/admin/organization/line-of-business/new`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600); await page.fill('#name', nm).catch(() => {}); };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false;
    try {
      // create
      await fillCreate(name);
      shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1200);
      id = (page.url().match(/line-of-business\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.functionId) === String(id)) : false;

      // duplicate
      await fillCreate(name);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit
      if (id) {
        const nn = `ZZ LOB Edit ${data.stamp}`;
        await page.goto(`${MIG}/admin/organization/line-of-business/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await page.fill('#name', nn).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        await page.goto(`${MIG}/admin/organization/line-of-business/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        editPersisted = (await page.inputValue('#name').catch(() => '')) === nn;
      }
    } finally {
      try { psql(`DELETE FROM raptech_scm.functions WHERE value_ LIKE 'ZZ LOB %'`); } catch (e) { /* best-effort */ }
    }
    return { id, inGrid, dupMsg, editPersisted, shots };
  },

  check(m) {
    return [
      { aspect: 'Create succeeded', migrated: m.id ? `id ${m.id}` : 'no id', expected: 'created', ok: !!m.id },
      { aspect: 'Appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked ("already exists")', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (name) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
    ];
  },
};
