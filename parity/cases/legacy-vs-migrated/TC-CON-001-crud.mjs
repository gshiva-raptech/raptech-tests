// TC-CON-001 — Admin → Contracts — CRUD for all 3 sub-tabs — Track B.
// contract-type / do-categories: name only. services: function + name (org-scoped dup guard).
// Each: create→in grid, duplicate→"already exists", edit→persists, delete(endpoint)→gone from grid.
// Grid action menu surfaces Edit+View only (no Delete) → delete via POST {id}/delete endpoint.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-CON-001', title: 'Contracts CRUD (contract-type, services, do-categories)', track: 'B', role: 'regular',
  urlPath: '/admin/contracts/contract-type', module: 'Admin Settings', subModule: 'Contracts → CRUD',
  hints: '- ContractsController create (dup guard), {id} update, {id}/delete (soft). Tables: contract_type, services, bussiness_unit.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const rows = async (tab) => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/contracts/${tab}/rows`);
    const del = async (tab, id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/contracts/${a.tab}/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, tab, id });
    const errMsg = async () => page.evaluate(() => { const m = document.body.innerText.match(/already exists[^<"]{0,40}/i); return m ? m[0].trim() : null; });

    // Generic CRUD driver for the single-name sub-tabs (contract-type, do-categories).
    // idKey = the rows-JSON id field; idRe = url id capture; editKey = field re-checked after edit (name).
    async function nameOnlyCrud(tab, idKey, idRe) {
      const name = `ZZ ${tab} ${data.stamp}`;
      const editName = `ZZ ${tab} ${data.stamp} E`;
      let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false;
      try {
        // create
        await page.goto(`${MIG}/admin/contracts/${tab}/new`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        await page.fill('#name', name).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
        await page.waitForTimeout(1100);
        id = (page.url().match(idRe) || [])[1] || null;
        inGrid = id ? (await rows(tab)).some(r => String(r[idKey]) === String(id)) : false;

        // duplicate
        await page.goto(`${MIG}/admin/contracts/${tab}/new`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        await page.fill('#name', name).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
        await page.waitForTimeout(900);
        dupMsg = await errMsg();

        // edit (change name)
        if (id) {
          await page.goto(`${MIG}/admin/contracts/${tab}/${id}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(400);
          await page.fill('#name', editName).catch(() => {});
          await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
          await page.waitForTimeout(900);
          editPersisted = (await rows(tab)).some(r => String(r[idKey]) === String(id) && String(r.name) === editName);
        }

        // delete (endpoint)
        if (id) {
          await del(tab, id);
          await page.waitForTimeout(700);
          deletedGone = !(await rows(tab)).some(r => String(r[idKey]) === String(id));
          if (deletedGone) id = null;
        }
      } finally {
        if (id) { try { await del(tab, id); } catch (e) { /* best-effort */ } }
      }
      return { inGrid, dupMsg, editPersisted, deletedGone };
    }

    // Services CRUD — requires a function selection; dup guard is (org+function+name) scoped.
    // The regular test user's org (36) has NO functions (master data), so we seed one ZZ
    // function for that org first (cleaned up FK-ordered in the finally), then drive the form.
    async function servicesCrud() {
      const name = `ZZ services ${data.stamp}`;
      const editName = `ZZ services ${data.stamp} E`;
      let id = null, inGrid = false, dupMsg = null, editPersisted = false, deletedGone = false, fnVal = null, noFunctions = false;
      try {
        // Resolve the logged-in user's current org, then seed a function if none exist.
        let orgId = null;
        try { orgId = psql(`SELECT org_id_fk FROM raptech_scm.org_user_mapping WHERE user_id_fk=(SELECT user_id_pk FROM raptech_scm.users WHERE username ILIKE '${creds.user.trim()}' LIMIT 1) AND (del_flag IS NULL OR del_flag='N') LIMIT 1`).split('\n')[0].trim(); } catch (e) { /* ignore */ }
        if (orgId) {
          const existing = psql(`SELECT count(*) FROM raptech_scm.functions WHERE org_id_fk=${orgId} AND (del_flag IS NULL OR del_flag='N')`).trim();
          if (existing === '0') {
            try { psql(`INSERT INTO raptech_scm.functions (value_, del_flag, created_by, updated_by, org_id_fk) VALUES ('ZZ Func ${data.stamp}', 'N', 1, 1, ${orgId})`); } catch (e) { /* best-effort */ }
          }
        }

        await page.goto(`${MIG}/admin/contracts/services/new`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        fnVal = await page.evaluate(() => { const e = document.querySelector('#functionId'); const o = [...(e?.options || [])].find(x => x.value); return o ? o.value : null; });
        if (!fnVal) { noFunctions = true; return { inGrid, dupMsg, editPersisted, deletedGone, noFunctions }; }
        await page.selectOption('#functionId', fnVal).catch(() => {});
        await page.fill('#name', name).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
        await page.waitForTimeout(1100);
        id = (page.url().match(/services\/(\d+)/) || [])[1] || null;
        inGrid = id ? (await rows('services')).some(r => String(r.serviceId) === String(id)) : false;

        // duplicate (same function + name)
        await page.goto(`${MIG}/admin/contracts/services/new`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        await page.selectOption('#functionId', fnVal).catch(() => {});
        await page.fill('#name', name).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
        await page.waitForTimeout(900);
        dupMsg = await errMsg();

        // edit (change name)
        if (id) {
          await page.goto(`${MIG}/admin/contracts/services/${id}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(400);
          await page.fill('#name', editName).catch(() => {});
          await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
          await page.waitForTimeout(900);
          editPersisted = (await rows('services')).some(r => String(r.serviceId) === String(id) && String(r.name) === editName);
        }

        if (id) {
          await del('services', id);
          await page.waitForTimeout(700);
          deletedGone = !(await rows('services')).some(r => String(r.serviceId) === String(id));
          if (deletedGone) id = null;
        }
      } finally {
        if (id) { try { await del('services', id); } catch (e) { /* best-effort */ } }
      }
      return { inGrid, dupMsg, editPersisted, deletedGone, noFunctions };
    }

    let contractType, services, doCategories;
    try {
      contractType = await nameOnlyCrud('contract-type', 'contractTypeId', /contract-type\/(\d+)/);
      services     = await servicesCrud();
      doCategories = await nameOnlyCrud('do-categories', 'businessUnitId', /do-categories\/(\d+)/);
    } finally {
      // Hard-delete any leftover ZZ rows (UI delete is soft). FK-ordered: services (child of
      // functions) first, then the seeded ZZ function, then the standalone masters.
      try { psql(`DELETE FROM raptech_scm.services WHERE value_ LIKE 'ZZ services %'`); } catch (e) { /* best-effort */ }
      try { psql(`DELETE FROM raptech_scm.functions WHERE value_ LIKE 'ZZ Func %'`); } catch (e) { /* best-effort */ }
      try { psql(`DELETE FROM raptech_scm.contract_type WHERE value_ LIKE 'ZZ contract-type %'`); } catch (e) { /* best-effort */ }
      try { psql(`DELETE FROM raptech_scm.bussiness_unit WHERE name LIKE 'ZZ do-categories %'`); } catch (e) { /* best-effort */ }
    }
    return { contractType, services, doCategories };
  },
  check(m) {
    const out = [];
    const block = (label, r) => {
      if (r.noFunctions) {
        out.push({ aspect: `${label}: SKIPPED (no functions/master data for org)`, migrated: 'no functions', expected: 'n/a', ok: true });
        return;
      }
      out.push({ aspect: `${label}: create + in grid`, migrated: r.inGrid, expected: true, ok: r.inGrid === true });
      out.push({ aspect: `${label}: duplicate blocked`, migrated: r.dupMsg || '(none)', expected: 'already exists', ok: /already exists/i.test(r.dupMsg || '') });
      out.push({ aspect: `${label}: edit persisted`, migrated: r.editPersisted, expected: true, ok: r.editPersisted === true });
      out.push({ aspect: `${label}: delete removed from grid`, migrated: r.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: r.deletedGone === true });
    };
    block('Contract Type', m.contractType);
    block('Services', m.services);
    block('D & O Categories', m.doCategories);
    return out;
  },
};
