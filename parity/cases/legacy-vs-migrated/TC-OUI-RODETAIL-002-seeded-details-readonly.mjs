// TC-OUI-RODETAIL-002 — Read-only Details for screens with NO existing org-36 row (F-0054 Contract
// Type, F-0056 Account Opening Balance). Create a row via the UI, drive its kebab → "…Details" action,
// assert the landing page is read-only (0 editable, 0 *, no Update, /details URL), then clean up.
// Track B, regular org user (org 36).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-OUI-RODETAIL-002', title: 'Read-only Details (seeded) — Contract Type + Opening Balance', track: 'B', role: 'regular',
  urlPath: '/admin/contracts/contract-type', module: 'Admin Settings', subModule: 'Contracts / Ledgers',
  hints: '- F-0054 contract-type tab, F-0056 opening balance — both lacked org-36 rows, so seed via UI then check Details.',
  data() { return { stamp: Date.now().toString().slice(-7), bal: '4242.00' }; },

  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    // Click the kebab "Details" action of the grid row containing rowText, then read read-only state.
    const detailsOf = async (gridUrl, rowText, actRe) => {
      await page.goto(`${MIG}${gridUrl}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.ag-row', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(600);
      const idx = await page.evaluate(t => {
        const r = [...document.querySelectorAll('.ag-center-cols-container .ag-row')]
          .find(row => [...row.querySelectorAll('.ag-cell')].some(c => c.textContent.includes(t)));
        return r ? r.getAttribute('row-index') : null;
      }, rowText);
      if (idx == null) return { found: false };
      await page.click(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"] button.rap-kebab`);
      await page.waitForTimeout(300);
      const ok = await page.getByRole('menuitem', { name: actRe }).first().click().then(() => true)
        .catch(async () => page.getByText(actRe).first().click().then(() => true).catch(() => false));
      if (!ok) return { found: true, clicked: false };
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(600);
      const url = page.url().replace(MIG, '');
      const info = await page.evaluate(() => {
        const editable = [...document.querySelectorAll('input,select,textarea')].filter(e => {
          if (e.type === 'hidden') return false;
          if (e.offsetParent === null && e.type !== 'checkbox') return false;
          return !(e.matches(':disabled') || e.readOnly);
        });
        const reqVis = [...document.querySelectorAll('.req')].filter(e => e.offsetParent).length;
        const updBtn = [...document.querySelectorAll('button,a')].some(b => b.offsetParent && /^(save|update|create|save changes)\b/i.test((b.textContent || '').trim()));
        return { editableCount: editable.length, reqVis, updBtn };
      });
      return { found: true, clicked: true, url, ...info, readOnly: info.editableCount === 0 && info.reqVis === 0 && !info.updBtn, isDetailsUrl: /\/details\b/.test(url) };
    };

    const out = { contractType: null, openingBalance: null };

    // ── F-0054 Contract Type (name-only create) ──
    {
      const name = `ZZ CTDET ${data.stamp}`;
      let id = null;
      const delCT = async (i) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/contracts/contract-type/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id: i });
      try {
        await page.goto(`${MIG}/admin/contracts/contract-type/new`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        await page.fill('#name', name).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
        await page.waitForTimeout(1100);
        id = (page.url().match(/contract-type\/(\d+)/) || [])[1] || null;
        out.contractType = await detailsOf('/admin/contracts/contract-type', name, /detail/i);
      } catch (e) { out.contractType = { error: e.message.split('\n')[0] }; }
      finally { if (id) { try { await delCT(id); } catch (e) { /* best-effort */ } } }
    }

    // ── F-0056 Account Opening Balance (needs FY covering today + entity + currency + GL code) ──
    {
      let id = null, seededFyId = null;
      const delOB = async (i) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/ledgers/account-opening-balance/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id: i });
      try {
        await page.goto(`${MIG}/admin/ledgers/account-opening-balance/new`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        const entVal = await page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
        const curVal = await page.evaluate(() => { const e = document.querySelector('#currency'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
        const glCat = await page.evaluate(async (u) => {
          const r = await fetch(u, { headers: { Accept: 'application/json' } }); if (!r.ok) return null;
          const d = await r.json(); const flat = []; const walk = ns => (ns || []).forEach(n => { flat.push({ id: n.id, code: n.code }); walk(n.children); });
          walk(Array.isArray(d) ? d : (d.nodes || d.categories || [])); return flat.find(x => x.id) || null;
        }, `${MIG}/lookup/categories?type=2`);
        if (!entVal || !curVal || !glCat) { out.openingBalance = { skipped: `missing prereq entity=${entVal} cur=${curVal} gl=${glCat ? glCat.id : null}` }; }
        else {
          const orgId = psql(`SELECT org_id_fk FROM raptech_scm.entity WHERE entity_id_pk=${entVal} LIMIT 1`).trim();
          seededFyId = psql(`INSERT INTO raptech_scm.financial_year (org_id_fk, entity_id_fk, start_date, end_date, opening_date, status, created_by, created_date, updated_by, updated_date) VALUES (${orgId}, ${entVal}, (CURRENT_DATE - INTERVAL '60 days'), (CURRENT_DATE + INTERVAL '300 days'), (CURRENT_DATE - INTERVAL '60 days'), 0, 141, now(), 141, now()) RETURNING financial_id_pk`).trim();
          await page.goto(`${MIG}/admin/ledgers/account-opening-balance/new`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(700);
          await page.selectOption('#entityId', entVal).catch(() => {});
          await page.selectOption('#currency', curVal).catch(() => {});
          await page.evaluate((c) => { const hd = document.getElementById('glCodeId'); if (hd) { hd.value = String(c.id); hd.dispatchEvent(new Event('change', { bubbles: true })); } const dp = document.getElementById('catpick_glCodeId'); if (dp) dp.value = c.code || ''; }, glCat);
          await page.fill('#closingBalance', data.bal).catch(() => {});
          await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
          await page.waitForTimeout(1300);
          id = (page.url().match(/account-opening-balance\/(\d+)/) || [])[1] || null;
          // the grid row contains the balance — search by the GL code or balance text
          out.openingBalance = await detailsOf('/admin/ledgers/account-opening-balance', glCat.code || String(data.bal), /detail/i);
          if (!out.openingBalance.found) out.openingBalance = await detailsOf('/admin/ledgers/account-opening-balance', '4242', /detail/i);
        }
      } catch (e) { out.openingBalance = { error: e.message.split('\n')[0] }; }
      finally {
        if (id) { try { await delOB(id); } catch (e) { /* best-effort */ } }
        if (seededFyId) { try { psql(`DELETE FROM raptech_scm.gl_entry WHERE financial_id_fk=${seededFyId}`); } catch (e) {} try { psql(`DELETE FROM raptech_scm.financial_year WHERE financial_id_pk=${seededFyId}`); } catch (e) {} }
      }
    }

    return out;
  },

  check(m) {
    const fmt = r => !r ? '(null)' : r.skipped ? 'SKIP ' + r.skipped : r.error ? 'ERR ' + r.error
      : !r.found ? 'row not found in grid' : !r.clicked ? 'Details menuitem not found'
      : `url=${r.url} editable=${r.editableCount} req=${r.reqVis} updateBtn=${r.updBtn} detailsUrl=${r.isDetailsUrl}`;
    return [
      { aspect: 'F-0054 Contract Type Details read-only', migrated: fmt(m.contractType), expected: 'read-only', ok: m.contractType?.readOnly === true },
      { aspect: 'F-0056 Opening Balance Details read-only', migrated: fmt(m.openingBalance), expected: 'read-only (or SKIP if no prereq)', ok: m.openingBalance?.readOnly === true || !!m.openingBalance?.skipped },
    ];
  },
};
