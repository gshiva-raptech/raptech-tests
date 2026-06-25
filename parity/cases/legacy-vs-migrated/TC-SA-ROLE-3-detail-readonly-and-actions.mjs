// TC-SA-ROLE-3 — Role Details (mode=view) is read-only; Edit/New are editable;
// grid exposes exactly Edit Role + Role Details (NO delete) — legacy parity.
//
// EXPECTED (legacy detailRole.jsp vs addOrEditRole.jsp, viewRoles.jsp):
//  • Role Details = read-only view: Name not editable, Status read-only, NO Save,
//    NO Delete, a "Back to Roles" link (F-0004).
//  • Edit Role = editable: Group LOCKED (legacy pointer-events:none, tabindex -1),
//    Name editable, Status editable, Save + Delete present.
//  • Grid row actions = Edit Role + Role Details only (legacy has no grid delete).
//
// RESULT: PASSES on the current build (F-0004 fixed: mode=view renders read-only).
// This case regression-guards that the read-only Details view stays read-only and
// that the Edit screen keeps Group locked.
//
// UI-only: inspects rendered field readonly/disabled states and the form action-bar
// controls (NOT the topbar org switcher), and the grid kebab menu items.
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';
import { psql } from '../../lib/db.mjs';

function cleanup() {
  try {
    const ids = psql(`SELECT role_id_pk FROM raptech_scm.roles_ WHERE name_ LIKE 'ZZ SAR3Role%';`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length) {
      const list = ids.join(',');
      psql(`DELETE FROM raptech_scm.role_permissions WHERE role_id_fk IN (${list});`);
      psql(`DELETE FROM raptech_scm.roles_ WHERE role_id_pk IN (${list});`);
    }
  } catch (e) { /* best-effort */ }
}

export default {
  id: 'TC-SA-ROLE-3',
  title: 'Role Details read-only + Edit editable (Group locked) — legacy parity',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/roles/{id}?mode=view',
  module: 'Super Admin',
  subModule: 'Roles',
  hints: '- F-0004. detailRole.jsp = read-only (no Save). addOrEditRole.jsp = editable, Group locked on edit.\n- mode=view → canEdit=false → name readonly, status disabled, no Save/Delete, back link.\n- Grid actions: Edit Role + Role Details only (no delete) per viewRoles.jsp.',

  data() { return { name: makeRoleName('ZZ SAR3Role'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    try {
      await forms.loginMigrated(page, base, creds.user, creds.pass);
      const MIG = base.replace(/\/+$/, '');
      const { roleId } = await createMigratedRole(page, base, data.name, data.group);

      // ── Role Details (read-only) ──
      await page.goto(`${MIG}/admin/roles/${roleId}?mode=view`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const view = await page.evaluate(() => {
        const nm = document.querySelector('#name');
        const st = document.querySelector('#status');
        const bar = document.querySelector('.action-bar');
        const barBtns = bar ? [...bar.querySelectorAll('button')].map(b => b.textContent.trim()) : [];
        const barLinks = bar ? [...bar.querySelectorAll('a')].map(a => a.textContent.trim()) : [];
        return {
          nameReadonly: nm ? nm.readOnly : null,
          statusDisabled: st ? st.disabled : null,
          hasSave: !!(bar && bar.querySelector('.btn-primary')),
          hasDelete: barBtns.some(t => /delete/i.test(t)),
          hasBack: barLinks.some(t => /roles/i.test(t)),
        };
      });
      shots.view = shot('view'); await page.screenshot({ path: shots.view, fullPage: true }).catch(() => {});

      // ── Edit (editable, Group locked) ──
      await page.goto(`${MIG}/admin/roles/${roleId}?mode=edit`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const edit = await page.evaluate(() => {
        const g = document.querySelector('#roleGroup');
        const nm = document.querySelector('#name');
        const st = document.querySelector('#status');
        const bar = document.querySelector('.action-bar');
        return {
          groupLocked: g ? (getComputedStyle(g).pointerEvents === 'none' && g.getAttribute('tabindex') === '-1') : null,
          nameEditable: nm ? !nm.readOnly : null,
          statusEditable: st ? !st.disabled : null,
          hasSave: !!(bar && bar.querySelector('.btn-primary')),
          hasDelete: bar ? [...bar.querySelectorAll('button')].some(b => /delete/i.test(b.textContent)) : null,
        };
      });
      shots.edit = shot('edit'); await page.screenshot({ path: shots.edit, fullPage: true }).catch(() => {});

      // ── Grid row actions (kebab) ──
      await page.goto(`${MIG}/admin/roles`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.ag-row', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(800);
      const search = await page.$('#quickSearch');
      if (search) { await search.fill(data.name); await page.waitForTimeout(1000); }
      let actions = [];
      try {
        const idx = await page.evaluate((nm) => {
          const r = [...document.querySelectorAll('.ag-center-cols-container .ag-row')]
            .find(row => [...row.querySelectorAll('.ag-cell')].some(c => c.textContent.includes(nm)));
          return r ? r.getAttribute('row-index') : null;
        }, data.name);
        if (idx != null) {
          // Open the row kebab; items render into a .menu-pop.open popover (raptech-grid.js).
          await page.click(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"] button.rap-kebab`);
          await page.waitForTimeout(400);
          actions = await page.evaluate(() =>
            [...document.querySelectorAll('.menu-pop.open .menu-item')].map(e => e.textContent.trim()).filter(Boolean));
          // Fallback: any open menu-pop if the .open class isn't applied yet.
          if (!actions.length) {
            actions = await page.evaluate(() =>
              [...document.querySelectorAll('.menu-pop .menu-item')].map(e => e.textContent.trim())
                .filter(t => /edit role|role details|delete/i.test(t)));
          }
        }
      } catch (e) { /* menu read best-effort */ }

      return { roleId, view, edit, actions, shots };
    } finally {
      cleanup();
    }
  },

  check(m) {
    const v = m.view || {}, e = m.edit || {}, acts = m.actions || [];
    const hasEdit = acts.some(a => /edit/i.test(a));
    const hasDetails = acts.some(a => /detail|view/i.test(a));
    const hasGridDelete = acts.some(a => /delete/i.test(a));
    return [
      // Read-only Details
      { aspect: 'Details: Name read-only', migrated: String(v.nameReadonly), expected: 'true', ok: v.nameReadonly === true },
      { aspect: 'Details: Status read-only', migrated: String(v.statusDisabled), expected: 'true', ok: v.statusDisabled === true },
      { aspect: 'Details: no Save button', migrated: v.hasSave ? 'has Save' : 'no Save', expected: 'no Save', ok: v.hasSave === false },
      { aspect: 'Details: no Delete button', migrated: v.hasDelete ? 'has Delete' : 'no Delete', expected: 'no Delete', ok: v.hasDelete === false },
      { aspect: 'Details: Back-to-Roles link present', migrated: String(v.hasBack), expected: 'true', ok: v.hasBack === true },
      // Edit
      { aspect: 'Edit: Group locked', migrated: String(e.groupLocked), expected: 'true', ok: e.groupLocked === true },
      { aspect: 'Edit: Name editable', migrated: String(e.nameEditable), expected: 'true', ok: e.nameEditable === true },
      { aspect: 'Edit: Status editable', migrated: String(e.statusEditable), expected: 'true', ok: e.statusEditable === true },
      { aspect: 'Edit: Save present', migrated: String(e.hasSave), expected: 'true', ok: e.hasSave === true },
      { aspect: 'Edit: Delete present', migrated: String(e.hasDelete), expected: 'true', ok: e.hasDelete === true },
      // Grid actions
      { aspect: 'Grid action: Edit Role', migrated: hasEdit ? 'present' : 'MISSING', expected: 'present', ok: hasEdit === true },
      { aspect: 'Grid action: Role Details', migrated: hasDetails ? 'present' : 'MISSING', expected: 'present', ok: hasDetails === true },
      { aspect: 'Grid action: NO Delete (legacy parity)', migrated: hasGridDelete ? 'has Delete' : 'no Delete', expected: 'no Delete', ok: hasGridDelete === false },
    ];
  },
};
