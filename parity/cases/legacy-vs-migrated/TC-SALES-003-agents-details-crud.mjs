// TC-SALES-003 — Admin → Sales → Agents Details create / duplicate / edit / delete — Track B.
// agents_details table. Create REQUIRES: Agent Name*, Unique Id*, Profession* (custom_status
// type 'Agent Profession'), GL Code* (glCodeRequired org param ON → tree picker, parent from
// gl_code_mapping const 60 → auto-creates a child GL category named after the agent on save).
// Dup guards: agent name + unique id ("already exists"). Edit: description + status editable
// (name/uniqueId/GL locked). Delete via endpoint (no UI delete).
//
// Master data for the regular user's org (no Agent Profession / const-60 mapping exists) is
// SEEDED here as ZZ rows and FK-ordered cleaned up in finally.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-SALES-003', title: 'Agents Details create / duplicate / edit / delete', track: 'B', role: 'regular',
  urlPath: '/admin/sales/agents-details', module: 'Sales', subModule: 'Agents Details',
  hints: '- SalesController agentsCreate (dup name + unique id, auto GL child), agentsUpdate, delete.',
  data() { return { stamp: Date.now().toString().slice(-7) }; },
  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const S = data.stamp;
    const name = `ZZ Agent ${S}`;
    const uniq = `ZZUID${S}`;

    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/sales/agents-details/rows`);
    const del = async (id) => page.evaluate(async (a) => { const h = (document.querySelector('meta[name=_csrf_header]') || {}).content; const t = (document.querySelector('meta[name=_csrf]') || {}).content; await fetch(`${a.MIG}/admin/sales/agents-details/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' }); }, { MIG, id });
    // Drive the GL Code tree picker to a category id (user pick = set hidden + fire change).
    const pickGl = async (catId) => page.evaluate((cid) => {
      const h = document.querySelector('[name=parentGlCodeId]');
      if (h) { h.value = String(cid); h.dispatchEvent(new Event('change', { bubbles: true })); }
      // RaptechForm validation reads the .input display field, not the hidden — fill it too.
      const d = document.querySelector('#catpick_parentGlCodeId, .raptech-catpick-display');
      if (d) { d.value = 'ZZ GL'; d.dispatchEvent(new Event('input', { bubbles: true })); }
    }, catId);

    // ── Resolve the regular user's org from the profession dropdown's host page,
    //    then SEED master data (Agent Profession custom_status + parent GL category
    //    + const-60 gl_code_mapping) so the required Profession/GL fields are fillable.
    // Org is fixed by login; entity 26 belongs to it in this dataset.
    const org = psql(`SELECT org_id_fk FROM raptech_scm.entity WHERE entity_id_pk = 26`).trim();
    let profId = null, parentCatId = null, mappingId = null;
    let id = null, childCatId = null;
    let inGrid = false, dupNameMsg = null, dupUniqMsg = null, editPersisted = false, deletedGone = false, editBlockedByGlPicker = false;
    try {
      profId = psql(`INSERT INTO raptech_scm.custom_status (org_id, type, status_name, status, created_by, created_date, updated_by, updated_date) VALUES (${org}, $T$Agent Profession$T$, $T$ZZ Prof ${S}$T$, 0, 1, now(), 1, now()) RETURNING custom_status_id_pk`).trim();
      parentCatId = psql(`INSERT INTO raptech_scm.category (code, description, status, org_id_fk, created_by, created_date, updated_by, updated_date, type_, group_name) VALUES ($T$ZZGLPARENT ${S}$T$, $T$ZZ GL Parent ${S}$T$, 0, ${org}, 1, now(), 1, now(), 2, $T$Liability$T$) RETURNING category_id`).trim();
      mappingId = psql(`INSERT INTO raptech_scm.gl_code_mapping (gl_code_const_id, category_id, gl_code, org_id_fk, created_by, created_date, updated_by, updated_date) VALUES (60, ${parentCatId}, $T$ZZGL${S}$T$, ${org}, 1, now(), 1, now()) RETURNING gl_code_mapping_id_pk`).trim();

      // ── CREATE ──
      await page.goto(`${MIG}/admin/sales/agents-details/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await page.fill('#agentsName', name).catch(() => {});
      await page.fill('#description', '1234567890').catch(() => {});
      await page.fill('#uniqueId', uniq).catch(() => {});
      await page.selectOption('#professionIdSel', profId).catch(() => {});
      // GL Code is a required tree picker (glCodeRequired org param ON). Pick the
      // seeded parent category — user-equivalent: set the hidden value + fire change.
      await pickGl(parentCatId);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(1300);
      let r = await rows();
      const created = r.find(x => String(x.agentsName) === name);
      id = created ? String(created.agentsDetailsId) : null;
      inGrid = !!created;
      if (id) { try { childCatId = psql(`SELECT gl_code_id FROM raptech_scm.agents_details WHERE agents_details_id_pk=${id}`).trim() || null; } catch (e) { /* ignore */ } }

      // ── DUPLICATE name ──
      await page.goto(`${MIG}/admin/sales/agents-details/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.fill('#agentsName', name).catch(() => {});
      await page.fill('#uniqueId', `ZZUID2${S}`).catch(() => {});
      await page.selectOption('#professionIdSel', profId).catch(() => {});
      await pickGl(parentCatId);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(900);
      dupNameMsg = await page.evaluate(() => { const m = document.body.innerText.match(/name already exists[^<"]{0,30}/i); return m ? m[0].trim() : null; });

      // ── DUPLICATE unique id (different name, same uniq) ──
      await page.goto(`${MIG}/admin/sales/agents-details/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.fill('#agentsName', `ZZ Agent Two ${S}`).catch(() => {});
      await page.fill('#uniqueId', uniq).catch(() => {});
      await page.selectOption('#professionIdSel', profId).catch(() => {});
      await pickGl(parentCatId);
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
      await page.waitForTimeout(900);
      dupUniqMsg = await page.evaluate(() => { const m = document.body.innerText.match(/unique id already exists[^<"]{0,30}/i); return m ? m[0].trim() : null; });
      // if a stray second agent slipped through, capture for cleanup
      const stray = (await rows()).find(x => String(x.agentsName) === `ZZ Agent Two ${S}`);

      // ── EDIT (description editable) ──
      if (id) {
        await page.goto(`${MIG}/admin/sales/agents-details/${id}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        // BUG EVIDENCE: the create-only GL Code category-picker (required) leaks onto
        // the EDIT form because its <th:block> has BOTH th:if and th:replace — Thymeleaf
        // runs th:replace (prec 100) before th:if (prec 300), so the guard is discarded.
        // Its empty display input blocks RaptechForm.trySubmit() → Update silently no-ops.
        editBlockedByGlPicker = await page.evaluate(() => {
          const f = [...document.querySelectorAll('.field[data-req="1"]')]
            .find(x => /GL Code/i.test(x.querySelector('.field-label')?.textContent || ''));
          if (!f) return false;
          const d = f.querySelector('.input,.raptech-catpick-display');
          return !!f && !!d && d.value.trim() === '';
        });
        await page.fill('#description', '9998887776').catch(() => {});
        // Work around the leaked picker so the rest of the Edit path can be exercised.
        await page.evaluate(() => { const d = document.querySelector('#catpick_parentGlCodeId, .raptech-catpick-display'); if (d) { d.value = 'ZZ GL'; d.dispatchEvent(new Event('input', { bubbles: true })); } });
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
        await page.waitForTimeout(1000);
        editPersisted = (await rows()).some(x => String(x.agentsDetailsId) === id && String(x.description) === '9998887776');
      }

      // ── DELETE (endpoint) ──
      if (stray) { try { await del(String(stray.agentsDetailsId)); } catch (e) { /* best-effort */ } }
      if (id) { await del(id); await page.waitForTimeout(800); deletedGone = !(await rows()).some(x => String(x.agentsDetailsId) === id); if (deletedGone) id = null; }
    } finally {
      // FK-ordered hard cleanup: agents → its auto-created child GL category → seeded
      // mapping → seeded parent category → seeded profession. Plus belt-and-braces by name.
      try { psql(`DELETE FROM raptech_scm.agents_details WHERE org_id_fk=${org} AND agents_name LIKE $T$ZZ Agent%${S}$T$`); } catch (e) { /* best-effort */ }
      try { if (childCatId) psql(`DELETE FROM raptech_scm.category WHERE category_id=${childCatId}`); } catch (e) { /* best-effort */ }
      try { psql(`DELETE FROM raptech_scm.category WHERE org_id_fk=${org} AND code=$T$ZZ Agent ${S}$T$`); } catch (e) { /* best-effort */ }
      try { if (mappingId) psql(`DELETE FROM raptech_scm.gl_code_mapping WHERE gl_code_mapping_id_pk=${mappingId}`); } catch (e) { /* best-effort */ }
      try { if (parentCatId) psql(`DELETE FROM raptech_scm.category WHERE category_id=${parentCatId}`); } catch (e) { /* best-effort */ }
      try { if (profId) psql(`DELETE FROM raptech_scm.custom_status WHERE custom_status_id_pk=${profId}`); } catch (e) { /* best-effort */ }
    }
    return { inGrid, dupNameMsg, dupUniqMsg, editPersisted, deletedGone, editBlockedByGlPicker };
  },
  check(m) {
    return [
      { aspect: 'Create + appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Duplicate name blocked', migrated: m.dupNameMsg || '(none)', expected: 'name already exists', ok: /already exists/i.test(m.dupNameMsg || '') },
      { aspect: 'Duplicate unique id blocked', migrated: m.dupUniqMsg || '(none)', expected: 'unique id already exists', ok: /already exists/i.test(m.dupUniqMsg || '') },
      { aspect: 'Edit (telephone/description) persisted (after GL-picker workaround)', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Delete removed from grid', migrated: m.deletedGone ? 'gone' : 'still present', expected: 'gone', ok: m.deletedGone === true },
      // F-0028 FIXED: the create-only required GL picker must NOT leak onto Edit (the
      // th:if guard now lives on a separate wrapper from th:replace). Real regression guard.
      { aspect: 'GL picker does NOT leak onto Edit (F-0028)', migrated: m.editBlockedByGlPicker ? 'leaked+blocks Update' : 'not observed', expected: 'not observed', ok: m.editBlockedByGlPicker === false },
    ];
  },
};
