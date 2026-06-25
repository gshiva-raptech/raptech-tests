// TC-GEN-CE-001 — Currency Exchange create / duplicate / edit / delete — Track B.
// Create: from + to currency (org's enrolled) + date + rate. Guard: duplicate pair+date.
// Edit: only the rate is editable. Delete via endpoint.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-GEN-CE-001', title: 'Currency Exchange create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/general/currency-exchanges', module: 'Admin Settings', subModule: 'General → Currency Exchanges',
  hints: '- GeneralController exchangeRateCreate (dup pair+date guard), {id} update (rate only), {id}/delete.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms, shot }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rateDate = '2026-06-18';   // <= today (date input max=today)
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/general/currency-exchanges/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/general/currency-exchanges/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false, pair = null;
    const fillNew = async (rate) => {
      await page.goto(`${MIG}/admin/general/currency-exchanges/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const fromVals = await page.evaluate(() => [...(document.querySelector('#fromCurrency')?.options || [])].map(o => o.value).filter(Boolean));
      const toVals = await page.evaluate(() => [...(document.querySelector('#currency')?.options || [])].map(o => o.value).filter(Boolean));
      const from = fromVals[0], to = toVals.find(v => v !== from) || toVals[0];
      pair = `${from}->${to}`;
      if (from) await page.selectOption('#fromCurrency', from).catch(() => {});
      if (to) await page.selectOption('#currency', to).catch(() => {});
      await page.fill('#exchangeRateDate', rateDate).catch(() => {});
      await page.fill('#exchangeRateVal', String(rate)).catch(() => {});
    };
    try {
      // create
      await fillNew(2.5);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create exchange rate/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/currency-exchanges\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.exchangeRateId) === String(id)) : false;

      // duplicate (same pair + date)
      await fillNew(3.0);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /create exchange rate/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,60}/i); return m ? m[0].trim() : null; });

      // edit (change rate)
      if (id) {
        await page.goto(`${MIG}/admin/general/currency-exchanges/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await page.fill('#exchangeRateVal', '9.99').catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save changes/i }).click()]);
        await page.waitForTimeout(1000);
        await page.goto(`${MIG}/admin/general/currency-exchanges/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        const got = await page.inputValue('#exchangeRateVal').catch(() => '');
        editPersisted = parseFloat(got) === 9.99;
      }

      // delete
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.exchangeRateId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      // belt-and-braces: the fixed test date is test-only — remove any leftover rows on it
      try { psql(`DELETE FROM raptech_scm.exchange_rates WHERE exchange_rate_date::date='${rateDate}'`); } catch (e) { /* best-effort */ }
    }
    return { createdInGrid: inGrid, dupMsg, editPersisted, deletedGone, pair };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.createdInGrid, expected: true, ok: m.createdInGrid === true },
      { aspect: 'Duplicate blocked (same pair + date)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (rate) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
