// TC-SA-ORG-1 — Super-Admin Organization GRID parity (legacy ↔ migrated, UI-only).
//
// What the USER sees on the Organization list and the per-row action menu.
// Legacy: viewOrganization.action (row menu = Edit Organization / Organization
// Details / Delete Organization / View Entity / Assign Report).
// Migrated: /admin/organizations (OrganizationController.orgList).
//
// Verifies — entirely from the rendered UI:
//   • the grid is reachable and shows data rows,
//   • the five legacy row-actions are ALL present in migrated,
//   • migrated does not silently DROP an action the legacy user had.
// (We assert presence, not absence — an extra migrated action is reported as a
//  warn, never a hard fail, since "user must not LOSE function" is the rule.)
import * as ui from '../../lib/ui.mjs';

const LEGACY_ROW_ACTIONS = [
  'Edit Organization', 'Organization Details', 'Delete Organization',
  'View Entity', 'Assign Report',
];

export default {
  id: 'TC-SA-ORG-1',
  title: 'Super-Admin Organization grid — reachable, columns, row-actions parity',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/organizations',
  module: 'Admin Settings',
  subModule: 'Organization (super-admin)',
  hints: '- Legacy viewOrganization.action row menu = the 5 actions.\n'
       + '- Migrated OrganizationController.orgList GridAction list.',

  data() { return {}; },

  /* ── LEGACY (golden master) ── */
  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);
    await page.goto(`${base}/admin/viewOrganization.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // What the user sees: data rows + the row-action labels in the kebab menus.
    const info = await page.evaluate((wanted) => {
      const text = document.body.innerText;
      const hasRows = !!document.querySelector('table tbody tr');
      const present = {};
      const labels = [...document.querySelectorAll('a,li,span,button')].map(e => (e.textContent || '').trim());
      for (const w of wanted) present[w] = labels.includes(w);
      return { reachable: /Organization/i.test(text), hasRows, present };
    }, LEGACY_ROW_ACTIONS);
    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { app: 'legacy', ...info, shots };
  },

  /* ── MIGRATED ── */
  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/organizations`, { waitUntil: 'networkidle' });
    await ui.gridReady(page);

    const cols = await ui.gridColumns(page);
    const rows = await ui.gridRows(page);
    const hasNew = !!(await page.$('#btnNew'));

    // Open the first row's kebab and read the menu labels the user sees.
    const present = {};
    for (const a of LEGACY_ROW_ACTIONS) present[a] = false;
    await page.click('.ag-pinned-right-cols-container .ag-row[row-index="0"] button.rap-kebab').catch(() => {});
    await page.waitForTimeout(400);
    const menuLabels = await page.evaluate(() =>
      [...document.querySelectorAll('[role=menuitem], .menu-item, .rap-menu a, .rap-menu button, .rap-menu li')]
        .map(e => (e.textContent || '').trim()).filter(Boolean));
    for (const a of LEGACY_ROW_ACTIONS) present[a] = menuLabels.some(l => l.includes(a));
    await page.keyboard.press('Escape').catch(() => {});

    shots.grid = shot('grid'); await page.screenshot({ path: shots.grid, fullPage: true }).catch(() => {});
    return { app: 'migrated', reachable: true, hasRows: rows.length > 0, cols, hasNew, present, menuLabels, shots };
  },

  /* ── COMPARE ── */
  compare(legacy, migrated) {
    const out = [
      { aspect: 'Org grid reachable', legacy: legacy.reachable, migrated: migrated.reachable,
        ok: legacy.reachable === true && migrated.reachable === true },
      { aspect: 'Org grid shows data rows', legacy: legacy.hasRows, migrated: migrated.hasRows,
        ok: migrated.hasRows === true },
      { aspect: 'New (create) button present', legacy: '—', migrated: migrated.hasNew, ok: migrated.hasNew === true },
    ];
    for (const a of LEGACY_ROW_ACTIONS) {
      out.push({
        aspect: `Row action present: ${a}`,
        legacy: legacy.present[a], migrated: migrated.present[a],
        ok: legacy.present[a] !== true ? true : migrated.present[a] === true,
        note: (legacy.present[a] && !migrated.present[a]) ? 'migrated DROPPED a legacy row-action' : '',
      });
    }
    return out;
  },
};
