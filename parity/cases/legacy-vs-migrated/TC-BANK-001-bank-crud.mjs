// TC-BANK-001 — Admin → Banks create / duplicate / edit / delete — Track B.
// Create: Entity (data-multiselect, single — multipleEntityWithAccount off), Currency*,
//   Account Type* (Debit), Bank Name*, Account No* (non-cash). Button "Submit".
// Dup guard: account_no unique within org → "A bank account with this account number already exists."
// Edit: Bank Name editable (currency/overdraft locked); button "Update".
// Delete: endpoint soft-deletes org_account_mapping then hard-deletes bank_details (grid has no Delete).
// Cleanup (FK-ordered): org_account_mapping by bank_detail_id_fk → bank_details by ZZ name.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-BANK-001', title: 'Bank create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/banks/banks', module: 'Admin Settings', subModule: 'Banks',
  hints: '- BanksController create (dup account no), {id} update, {id}/delete (soft mapping + hard bank).',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const name = `ZZ Bank ${data.stamp}`;
    const acctNo = `ZZ${data.stamp}`;
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/banks/banks/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/banks/banks/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });

    // fill the create form (drive the entity multiselect UI, not the native select)
    const fillNew = async (bankName, accNo) => {
      await page.goto(`${MIG}/admin/banks/banks/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);
      // Entity: open the multiselect and pick the first option (idempotent)
      const alreadySel = await page.evaluate(() => [...(document.querySelector('#entityIds')?.options || [])].some(o => o.selected && o.value));
      if (!alreadySel) {
        await page.click('.ms-wrap .multiselect').catch(() => {});
        await page.waitForTimeout(300);
        await page.click('.ms-wrap .ms-option').catch(() => {});
        await page.waitForTimeout(200);
        await page.click('.form-head').catch(() => {}); // close the dropdown
      }
      // Currency (plain select) — first real option
      const curVal = await page.evaluate(() => { const o = [...(document.querySelector('#currency')?.options || [])].find(x => x.value); return o ? o.value : null; });
      if (curVal) await page.selectOption('#currency', curVal).catch(() => {});
      // Account Type = Debit (bank-type → Account No required/visible)
      await page.selectOption('#accountType', 'Debit').catch(() => {});
      await page.waitForTimeout(200);
      await page.fill('#bankName', bankName).catch(() => {});
      await page.fill('#accountNo', accNo).catch(() => {});
    };

    let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false, entSelected = false;
    try {
      // create
      await fillNew(name, acctNo);
      entSelected = await page.evaluate(() => [...(document.querySelector('#entityIds')?.options || [])].some(o => o.selected && o.value));
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1300);
      id = (page.url().match(/banks\/banks\/(\d+)/) || [])[1] || null;
      inGrid = id ? (await rows()).some(r => String(r.bankId) === String(id)) : false;

      // duplicate (same account no, different bank name)
      await fillNew(`ZZ Dup ${data.stamp}`, acctNo);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
      await page.waitForTimeout(1000);
      dupMsg = await page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

      // edit (change bank name)
      if (id) {
        await page.goto(`${MIG}/admin/banks/banks/${id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(700);
        await page.fill('#bankName', `${name} EDITED`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(r => String(r.bankId) === String(id) && String(r.bankName) === `${name} EDITED`);
      }

      // delete (endpoint — grid surfaces Edit + Details only)
      if (id) {
        await del(id);
        await page.waitForTimeout(800);
        deletedGone = !(await rows()).some(r => String(r.bankId) === String(id));
        id = deletedGone ? null : id;
      }
    } finally {
      if (id) { try { await del(id); } catch (e) { /* best-effort */ } }
      // FK-ordered hard cleanup: mappings for any ZZ bank, then the ZZ banks
      try {
        psql(`DELETE FROM raptech_scm.org_account_mapping WHERE bank_detail_id_fk IN (SELECT bank_detail_id_pk FROM raptech_scm.bank_details WHERE bank_name LIKE 'ZZ %' OR account_no LIKE 'ZZ%')`);
        psql(`DELETE FROM raptech_scm.bank_details WHERE bank_name LIKE 'ZZ %' OR account_no LIKE 'ZZ%'`);
      } catch (e) { /* best-effort */ }
    }
    return { id: '(deleted)', entSelected, inGrid, dupMsg, editPersisted, deletedGone };
  },
  check(m) {
    return [
      { aspect: 'Entity selected via multiselect', migrated: m.entSelected, expected: true, ok: m.entSelected === true },
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate blocked (dup account no)', migrated: m.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(m.dupMsg || '') },
      { aspect: 'Edit (bank name) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
    ];
  },
};
