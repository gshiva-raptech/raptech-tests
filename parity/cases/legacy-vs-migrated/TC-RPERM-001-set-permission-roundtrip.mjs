// TC-RPERM-001 — Role Permissions save roundtrip (super admin) — Track B.
// The "create role then role permission" pair, end-to-end. Drives the real save
// endpoint with one clean permission item (the matrix UI cascades a whole subtree,
// which is fragile and can trip client-side validation), then verifies the
// permission persisted via the modules JSON the matrix itself uses.
import { makeRoleName, createMigratedRole } from '../../lib/fixtures.mjs';

export default {
  id: 'TC-RPERM-001',
  title: 'Role Permissions — set + save persists',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/role-permissions',
  module: 'Admin Settings',
  subModule: 'Role Permissions',
  hints: '- Legacy saveRoleResource.\n- Migrated: RolePermissionController.savePermissions() + RolePermissionService; tree via /role-permissions/modules.',

  data() { return { name: makeRoleName('ZZ PermRole'), group: 'Company' }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const { roleId } = await createMigratedRole(page, base, data.name, data.group);

    // open the matrix for this role (loads the tree + CSRF; gives a real menu moduleId)
    await page.goto(`${MIG}/admin/role-permissions`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.selectOption('#roleSelect', String(roleId));
    await page.waitForSelector('#permMatrix .perm-menu-cb', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(500);
    const ctx = await page.evaluate(() => {
      const cb = document.querySelector('#permMatrix .perm-menu-cb');
      return {
        moduleId: cb ? parseInt(cb.dataset.moduleId, 10) : null,
        mainId: cb ? parseInt(cb.dataset.mainId, 10) : null,
        csrfH: window._csrfHeader || (document.querySelector('meta[name=_csrf_header]') || {}).content,
        csrfT: window._csrfToken || (document.querySelector('meta[name=_csrf]') || {}).content,
      };
    });
    shots.matrix = shot('matrix'); await page.screenshot({ path: shots.matrix, fullPage: true }).catch(() => {});

    // grant view+add on one menu module (+ its main module) via the real endpoint
    const saveRes = await page.evaluate(async (a) => {
      const mk = id => ({ permissionId: 0, moduleId: id, add: true, edit: false, view: true, delete: false, export: false, hide: false });
      const items = [mk(a.moduleId)];
      if (a.mainId && a.mainId !== a.moduleId) items.push(mk(a.mainId));
      const r = await fetch('/admin/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', [a.csrfH]: a.csrfT },
        body: JSON.stringify({ roleId: parseInt(a.roleId, 10), items }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, { ...ctx, roleId });

    // verify persistence via the modules tree the matrix consumes
    const persisted = await page.evaluate(async (a) => {
      const r = await fetch('/admin/role-permissions/modules?roleId=' + a.roleId, { headers: { Accept: 'application/json' } });
      const tree = await r.json();
      const find = (nodes) => { for (const n of nodes || []) { if (n.moduleId === a.moduleId) return n; const f = find(n.children); if (f) return f; } return null; };
      const node = find(tree);
      return node ? { permissionId: node.permissionId, view: node.view, add: node.add } : null;
    }, { roleId, moduleId: ctx.moduleId });

    return {
      roleId, moduleId: ctx.moduleId,
      saveStatus: saveRes.status, saveSuccess: saveRes.body && saveRes.body.success, savedMsg: saveRes.body && saveRes.body.message,
      persisted, shots,
    };
  },

  check(m) {
    const p = m.persisted || {};
    const granted = (p.permissionId && p.permissionId > 0) || p.view === true || p.add === true;
    return [
      { aspect: 'Save endpoint reported success', migrated: `${m.saveStatus} ${m.savedMsg || ''}`.trim(), expected: 'success', ok: m.saveSuccess === true },
      { aspect: 'Permission persisted for the role', migrated: JSON.stringify(m.persisted), expected: 'permissionId>0 / view granted', ok: granted },
    ];
  },
};
