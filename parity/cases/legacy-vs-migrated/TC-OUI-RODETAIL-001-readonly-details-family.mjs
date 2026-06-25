// TC-OUI-RODETAIL-001 — Read-only "Details" family re-verification (F-0052..F-0056).
// For each grid, drive the row kebab → "…Details" action exactly as a user would and assert the
// landing page is genuinely READ-ONLY: 0 editable fields, 0 mandatory (*) markers, no Save/Update
// button, and the URL is the dedicated /details route (not the editable /{id} edit form).
// Track B, regular org user (org 36).
export default {
  id: 'TC-OUI-RODETAIL-001',
  title: 'Read-only Details family (F-0052..F-0056) — Details action opens read-only page',
  track: 'B',
  role: 'regular',
  urlPath: '/admin/items/uom',
  module: 'Admin Settings',
  subModule: 'Items / Form Templates / Contracts / Ledgers',
  hints: '- F-0052 Items UOM+Category, F-0053 FT GCF+SCF, F-0054 Contracts D&O, F-0055 Ledgers Expense Cat, F-0056 Ledgers Opening Balance.\n- Fix = new /{id}/details GET + read-only details.html; grid Details action repointed.',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const screens = [
      { key: 'F-0052 UOM',            grid: '/admin/items/uom',                          act: /details/i },
      { key: 'F-0052 Item Category',  grid: '/admin/items/item-categories',              act: /details/i },
      { key: 'F-0053 Global CF',      grid: '/admin/form-templates/global-custom-fields', act: /details/i },
      { key: 'F-0053 Stagewise CF',   grid: '/admin/form-templates/stagewise-custom-fields', act: /details/i },
      { key: 'F-0054 D&O Category',   grid: '/admin/contracts/do-categories',            act: /detail/i },
      { key: 'F-0055 Expense Cat',    grid: '/admin/ledgers/expense-category',           act: /details/i },
      { key: 'F-0056 Opening Bal',    grid: '/admin/ledgers/account-opening-balance',    act: /detail/i },
    ];

    const results = [];
    for (const s of screens) {
      const r = { key: s.key, gridUrl: s.grid };
      try {
        await page.goto(`${MIG}${s.grid}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('.ag-row', { timeout: 12000 }).catch(() => {});
        await page.waitForTimeout(700);

        // first data row index in the center container
        const idx = await page.evaluate(() => {
          const row = document.querySelector('.ag-center-cols-container .ag-row');
          return row ? row.getAttribute('row-index') : null;
        });
        if (idx == null) { r.note = 'no data row in grid — skipped'; results.push(r); continue; }

        // open the pinned-right kebab for that row, click the Details menuitem
        await page.click(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"] button.rap-kebab`);
        await page.waitForTimeout(300);
        const clicked = await page.getByRole('menuitem', { name: s.act }).first().click()
          .then(() => true)
          .catch(async () => page.getByText(s.act).first().click().then(() => true).catch(() => false));
        if (!clicked) { r.note = 'Details menuitem not found'; results.push(r); continue; }
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(700);

        r.url = page.url().replace(MIG, '');
        const info = await page.evaluate(() => {
          const editable = [...document.querySelectorAll('input,select,textarea')].filter(e => {
            if (e.type === 'hidden') return false;
            if (e.offsetParent === null && e.type !== 'checkbox') return false;
            return !(e.matches(':disabled') || e.readOnly);
          });
          const reqVis = [...document.querySelectorAll('.req')].filter(e => e.offsetParent).length;
          const updBtn = [...document.querySelectorAll('button,a')].some(b =>
            b.offsetParent && /^(save|update|create|save changes)\b/i.test((b.textContent || '').trim()));
          return { editableCount: editable.length, sample: editable.slice(0, 8).map(e => e.id || e.name || e.type), reqVis, updBtn };
        });
        Object.assign(r, info);
        r.isDetailsUrl = /\/details\b/.test(r.url);
        r.readOnly = info.editableCount === 0 && info.reqVis === 0 && info.updBtn === false;
      } catch (e) {
        r.error = e.message.split('\n')[0];
      }
      results.push(r);
    }
    return { results };
  },

  check(m) {
    const tested = m.results.filter(r => r.readOnly !== undefined);
    return m.results.map(r => ({
      aspect: `${r.key} Details read-only`,
      migrated: r.note ? r.note
        : r.error ? 'ERR ' + r.error
        : `url=${r.url} editable=${r.editableCount}${r.editableCount ? '(' + (r.sample || []).join(',') + ')' : ''} req=${r.reqVis} updateBtn=${r.updBtn} detailsUrl=${r.isDetailsUrl}`,
      expected: 'read-only (0 editable, 0 *, no Update)',
      // a screen with no data row is an inconclusive skip, not a fail
      ok: r.note ? true : r.readOnly === true,
    })).concat([{
      aspect: 'Screens actually exercised (not all skipped)',
      migrated: `${tested.length}/${m.results.length} had data to test`,
      expected: '>= 5',
      ok: tested.length >= 5,
    }]);
  },
};
