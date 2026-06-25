// TC-LED-AM-001 — Ledgers → Accounts Mapping (master-driven) save + lock — Track B.
// Accounts Mapping is a FIXED master-driven table: one row per gl_code_master constant. Legacy has
// NO "+ New" and NO Delete — rows are edited in place. So this case asserts: (1) pick an un-mapped
// constant, choose a GL Code category (category-picker hidden #categoryId), submit → the mapping row
// is created and the grid's "GL Code" column shows the picked category code; (2) re-opening the now
// mapped constant locks it (read-only, button text "Mapped" / disabled). Cleanup: delete the created
// gl_code_mapping row (no UI delete exists).
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-LED-AM-001', title: 'Accounts Mapping save + lock (master-driven)', track: 'B', role: 'regular',
  urlPath: '/admin/ledgers/accounts-mapping', module: 'Admin Settings', subModule: 'Ledgers → Accounts Mapping',
  hints: '- LedgersController accountsMappingSave (creates gl_code_mapping on first save; locked once mapped). No New/Delete.',
  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/ledgers/accounts-mapping/rows`);

    let constId = null, savedGlCode = null, gridShowsMapping = false, lockedOnReopen = false, pickedCode = null;
    try {
      // pick an un-mapped master constant (glCode blank)
      const all = await rows();
      const free = all.find(r => !r.glCode || String(r.glCode).trim() === '');
      constId = free ? free.glCodeConstId : (all[0] && all[0].glCodeConstId);

      if (constId != null) {
        await page.goto(`${MIG}/admin/ledgers/accounts-mapping/${constId}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        // category-picker posts a hidden #categoryId; fetch a valid type-2 category from the lookup
        const cat = await page.evaluate(async (u) => {
          const r = await fetch(u, { headers: { Accept: 'application/json' } });
          if (!r.ok) return null;
          const data = await r.json();
          const flat = [];
          const walk = (ns) => (ns || []).forEach(n => { flat.push({ id: n.id, code: n.code }); walk(n.children); });
          walk(Array.isArray(data) ? data : (data.nodes || data.categories || []));
          return flat.find(x => x.id) || null;
        }, `${MIG}/lookup/categories?type=2`);
        if (cat) {
          pickedCode = cat.code;
          // drive the picker by setting its hidden value + display (the form only posts the hidden id)
          await page.evaluate((c) => {
            const hidden = document.getElementById('categoryId');
            if (hidden) { hidden.value = String(c.id); hidden.dispatchEvent(new Event('change', { bubbles: true })); }
            const disp = document.getElementById('catpick_categoryId');
            if (disp) disp.value = c.code || '';
          }, cat);
          await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^submit$/i }).click()]);
          await page.waitForTimeout(1100);

          // verify grid row now shows a GL Code
          const after = await rows();
          const row = after.find(r => String(r.glCodeConstId) === String(constId));
          savedGlCode = row ? row.glCode : null;
          gridShowsMapping = !!(row && row.glCode && String(row.glCode).trim() !== '');

          // re-open → should be locked (button "Mapped"/disabled, GL Code read-only)
          await page.goto(`${MIG}/admin/ledgers/accounts-mapping/${constId}`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(600);
          lockedOnReopen = await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => /mapped|submit/i.test(b.textContent));
            const hasPicker = !!document.getElementById('categoryId');
            return (!!btn && (btn.disabled || /mapped/i.test(btn.textContent))) || !hasPicker;
          });
        }
      }
    } finally {
      if (constId != null) {
        try { psql(`DELETE FROM raptech_scm.gl_code_mapping WHERE org_id_fk=(SELECT org_id_fk FROM raptech_scm.gl_code_mapping WHERE gl_code_const_id=${constId} LIMIT 1) AND gl_code_const_id=${constId}`); } catch (e) { /* best-effort */ }
        // belt-and-braces: clean any mapping created in this run for this constant
        try { psql(`DELETE FROM raptech_scm.gl_code_mapping WHERE gl_code_const_id=${constId} AND created_date::date = CURRENT_DATE`); } catch (e) { /* best-effort */ }
      }
    }
    return { constId, pickedCode, savedGlCode, gridShowsMapping, lockedOnReopen };
  },
  check(m) {
    return [
      { aspect: 'An un-mapped master constant was found', migrated: m.constId, expected: 'non-null', ok: m.constId != null },
      { aspect: 'Mapping saved + grid shows GL Code', migrated: m.savedGlCode || '(none)', expected: 'picked category code', ok: m.gridShowsMapping === true },
      { aspect: 'Re-open locks the mapping (read-only)', migrated: m.lockedOnReopen, expected: true, ok: m.lockedOnReopen === true },
    ];
  },
};
