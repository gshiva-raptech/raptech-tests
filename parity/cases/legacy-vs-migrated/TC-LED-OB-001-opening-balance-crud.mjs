// TC-LED-OB-001 — Ledgers → Account Opening Balance create / edit / delete — Track B.
// Create requires Entity (#entityId), Currency (#currency, org currencies), GL Code (category-picker
// hidden #glCodeId) and Account Opening Balance (#closingBalance). The create flow derives
// opening_date / opening_balance_year / end_date from the entity's financial year COVERING TODAY —
// so this case SEEDS a ZZ financial year for the chosen entity (DB prerequisite, like TC-EMP-001),
// runs create/edit/delete, then cleans up FK-ordered (gl_entry + bank_statement children, the balance,
// and the seeded financial year). Edit: closingBalance editable (entity/currency/GL code locked).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-LED-OB-001', title: 'Account Opening Balance create / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/ledgers/account-opening-balance', module: 'Admin Settings', subModule: 'Ledgers → Account Opening Balance',
  hints: '- LedgersController openingBalanceCreate (needs FY covering today; synchronous GL posting), {id} update (closingBalance), {id}/delete.',
  data() { return { stamp: Date.now().toString().slice(-7), bal: '1234.50', edited: '7777.25' }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/ledgers/account-opening-balance/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/ledgers/account-opening-balance/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    let id = null, createdId = null, inGrid = false, editPersisted = false, deletedGone = false;
    let seededFyId = null, entVal = null, glCat = null;
    try {
      // ── discover the entity the form offers + a type-2 GL code (org-scoped) ──
      await page.goto(`${MIG}/admin/ledgers/account-opening-balance/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      entVal = await page.evaluate(() => { const e = document.querySelector('#entityId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      const curVal = await page.evaluate(() => { const e = document.querySelector('#currency'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
      glCat = await page.evaluate(async (u) => {
        const r = await fetch(u, { headers: { Accept: 'application/json' } });
        if (!r.ok) return null;
        const dataR = await r.json();
        const flat = [];
        const walk = (ns) => (ns || []).forEach(n => { flat.push({ id: n.id, code: n.code }); walk(n.children); });
        walk(Array.isArray(dataR) ? dataR : (dataR.nodes || dataR.categories || []));
        return flat.find(x => x.id) || null;
      }, `${MIG}/lookup/categories?type=2`);

      if (!entVal || !curVal || !glCat) {
        return { id: null, inGrid, editPersisted, deletedGone, skipped: `missing prerequisite (entity=${entVal} currency=${curVal} glCat=${glCat ? glCat.id : null})` };
      }

      // ── SEED a financial year covering today for this entity (create flow needs it) ──
      const orgId = psql(`SELECT org_id_fk FROM raptech_scm.entity WHERE entity_id_pk=${entVal} LIMIT 1`).trim();
      seededFyId = psql(`INSERT INTO raptech_scm.financial_year
          (org_id_fk, entity_id_fk, start_date, end_date, opening_date, status, created_by, created_date, updated_by, updated_date)
          VALUES (${orgId}, ${entVal}, (CURRENT_DATE - INTERVAL '60 days'), (CURRENT_DATE + INTERVAL '300 days'),
                  (CURRENT_DATE - INTERVAL '60 days'), 0, 141, now(), 141, now())
          RETURNING financial_id_pk`).trim();

      // ── create ──
      await page.goto(`${MIG}/admin/ledgers/account-opening-balance/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await page.selectOption('#entityId', entVal).catch(() => {});
      await page.selectOption('#currency', curVal).catch(() => {});
      await page.evaluate((c) => {
        const hidden = document.getElementById('glCodeId');
        if (hidden) { hidden.value = String(c.id); hidden.dispatchEvent(new Event('change', { bubbles: true })); }
        const disp = document.getElementById('catpick_glCodeId');
        if (disp) disp.value = c.code || '';
      }, glCat);
      await page.fill('#closingBalance', data.bal).catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/account-opening-balance\/(\d+)/) || [])[1] || null;
      createdId = id;   // remember even after delete (gl_entry posting survives the balance delete)
      inGrid = id ? (await rows()).some(r => String(r.glBalanceId) === String(id)) : false;

      // ── edit (change opening balance) ──
      if (id) {
        await page.goto(`${MIG}/admin/ledgers/account-opening-balance/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.fill('#closingBalance', data.edited).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1100);
        editPersisted = (await rows()).some(r => String(r.glBalanceId) === String(id) && Number(r.closingBalance) === Number(data.edited));
      }

      // ── delete (grid Delete action endpoint) ──
      if (id) {
        await del(id);
        await page.waitForTimeout(900);
        deletedGone = !(await rows()).some(r => String(r.glBalanceId) === String(id));
        if (deletedGone) id = null;
      }
    } finally {
      // FK-ordered cleanup of any balance left + its synchronous GL postings.
      // Note: the UI delete only removes gl_closing_balance — the synchronous
      // gl_entry / bank_statement postings survive it, so we sweep by created id too.
      const ids = [];
      if (id) ids.push(id);
      if (createdId && !ids.includes(createdId)) ids.push(createdId);
      try {
        const leftover = psql(`SELECT gl_balance_id_pk FROM raptech_scm.gl_closing_balance WHERE created_date::date=CURRENT_DATE AND created_by=141`).split('\n').map(s => s.trim()).filter(Boolean);
        leftover.forEach(x => { if (!ids.includes(x)) ids.push(x); });
      } catch (e) { /* best-effort */ }
      for (const bid of ids) {
        try { psql(`DELETE FROM raptech_scm.gl_entry WHERE process_type='Opening Balance' AND process_id=${bid}`); } catch (e) { /* best-effort */ }
        try { psql(`DELETE FROM raptech_scm.bank_statement WHERE bank_statement_id_pk IN (SELECT bank_statement_id FROM raptech_scm.gl_closing_balance WHERE gl_balance_id_pk=${bid} AND bank_statement_id IS NOT NULL)`); } catch (e) { /* best-effort */ }
        try { psql(`DELETE FROM raptech_scm.gl_closing_balance WHERE gl_balance_id_pk=${bid}`); } catch (e) { /* best-effort */ }
      }
      if (seededFyId) { try { psql(`DELETE FROM raptech_scm.financial_year WHERE financial_id_pk=${seededFyId}`); } catch (e) { /* best-effort */ } }
    }
    return { id, inGrid, editPersisted, deletedGone, entVal, glCode: glCat ? glCat.code : null };
  },
  check(m) {
    if (m.skipped) return [{ aspect: 'Prerequisite available', migrated: m.skipped, expected: 'entity+currency+GL code', ok: false }];
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Edit (opening balance) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
