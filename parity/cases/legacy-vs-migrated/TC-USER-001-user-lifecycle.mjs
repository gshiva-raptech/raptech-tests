// TC-USER-001 — User full lifecycle (super admin) — Track B.
// create → in grid → edit (lastName persists) → reset password → assign views →
// delete (soft = userAccess flips to "Inactive"). Runs in the default session org
// (paybook OFF → manual first/last/email; the default org has an entity + roles; org 36
// has 0 assignable entities so it can't create). The created user is disposable; the
// final delete deactivates it.
//
// Entity is a data-multiselect widget (.ms-wrap): drive the widget UI (open .multiselect →
// click .ms-option), not the native <select> — the enhanced widget is authoritative at submit.
//
// F-0013 (confirmed bug): a SUPERADMIN-created user gets NO org_user_mapping. createUser only
// binds dto.orgId for non-superadmin and the form has no org field, so UserServiceImpl.create's
// `if (dto.getOrgId() != null)` guard skips the mapping → orphaned user (no org, no entity)
// despite the entity multiselect posting correctly. Asserted via the DB below.
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-USER-001',
  title: 'User create / edit / reset-password / assign-views / delete',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: '- UserController create/update/{id}/delete/{id}/reset-password/{id}/assign-views. Delete is soft (userAccess=Inactive).',

  data() { const stamp = Date.now().toString().slice(-7); return { stamp }; },

  async runMigrated({ page, base, creds, data, forms, shot }) {
    const shots = {};
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const userName = `zzuser${data.stamp}`;
    const pwd = 'Raptech@12345';
    const rows = async () => page.evaluate(async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : []; }, `${MIG}/admin/users/rows`);
    // Ensure exactly-something is selected in the data-multiselect (idempotent): if an
    // entity is already selected (e.g. pre-selected on edit once F-0013 is fixed), leave it
    // — toggling would DESELECT it and trip the "select at least one entity" validation.
    const ensureEntitySelected = async () => {
      const already = await page.evaluate(() => {
        const el = document.querySelector('#entityIds');
        const nativeSel = el ? [...el.selectedOptions].length > 0 : false;
        const lbl = document.querySelector('.ms-wrap .ms-label');
        const widgetSel = !!lbl && !lbl.classList.contains('placeholder') && !/select entity/i.test(lbl.textContent || '');
        const anyChecked = [...document.querySelectorAll('.ms-wrap .ms-option input')].some(i => i.checked);
        return nativeSel || widgetSel || anyChecked;
      });
      if (already) return;
      await page.click('.ms-wrap .multiselect').catch(() => {});
      await page.waitForTimeout(300);
      await page.click('.ms-wrap .ms-option').catch(() => {});
      await page.waitForTimeout(200);
    };
    const flash = () => page.evaluate(() => {
      const leaves = [...document.querySelectorAll('div')].filter(d => d.children.length === 0 && /successfully|saved|reset|updated|created|deactivated|failed|cannot/i.test(d.textContent || ''));
      leaves.sort((a, b) => a.textContent.trim().length - b.textContent.trim().length);
      return leaves.length ? leaves[0].textContent.trim() : null;
    });

    // ── create ──
    await page.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.fill('#userName', userName).catch(() => {});
    await page.fill('#newPassword', pwd).catch(() => {});
    await page.fill('#confirmPassword', pwd).catch(() => {});
    await page.fill('#firstName', 'ZZ').catch(() => {});
    await page.fill('#lastName', `User${data.stamp}`).catch(() => {});
    await page.fill('#email', `zz${data.stamp}@example.com`).catch(() => {});
    await page.fill('#phoneNo', '9999999999').catch(() => {});   // Contact Number — required
    await ensureEntitySelected();
    shots.form = shot('form'); await page.screenshot({ path: shots.form, fullPage: true }).catch(() => {});
    await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^create$/i }).click()]);
    await page.waitForTimeout(1800);
    const id = (page.url().match(/admin\/users\/(\d+)/) || [])[1] || null;
    const inGrid = id ? (await rows()).some(r => String(r.userId) === String(id)) : false;
    // F-0013: did the org/entity mapping actually persist? (superadmin → orgId null → none)
    let entityMapped = false;
    if (id) {
      const cnt = psql(`SELECT count(*) FROM raptech_scm.org_user_mapping WHERE user_id_fk=${id} AND entity_id_fk IS NOT NULL AND (del_flag IS NULL OR del_flag<>'Y')`);
      entityMapped = parseInt((cnt || '0').trim(), 10) > 0;
    }

    // ── edit (lastName) ──
    let editPersisted = false;
    if (id) {
      const newLast = `Edit${data.stamp}`;
      await page.goto(`${MIG}/admin/users/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      await page.fill('#lastName', newLast).catch(() => {});
      await ensureEntitySelected();   // entity isn't pre-selected (F-0013) → must pick to pass validation
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /^update$/i }).click()]);
      await page.waitForTimeout(1500);
      await page.goto(`${MIG}/admin/users/${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      editPersisted = (await page.inputValue('#lastName').catch(() => '')) === newLast;
    }

    // ── reset password ──
    let resetMsg = null;
    if (id) {
      await page.goto(`${MIG}/admin/users/${id}/reset-password`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await page.fill('#newPassword', 'Raptech@67890').catch(() => {});
      await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /reset password/i }).click()]);
      await page.waitForTimeout(1000);
      resetMsg = await flash();
    }

    // ── assign views ──
    let assignResult = 'no views in org (inconclusive)';
    if (id) {
      await page.goto(`${MIG}/admin/users/${id}/assign-views`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const viewVals = await page.$$eval('input[name=viewIds]', els => els.map(e => e.value));
      if (viewVals.length) {
        const pick = viewVals[0];
        await page.check(`input[name=viewIds][value="${pick}"]`).catch(() => {});
        await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.getByRole('button', { name: /save assignments/i }).click()]);
        await page.waitForTimeout(1000);
        await page.goto(`${MIG}/admin/users/${id}/assign-views`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        const nowChecked = await page.evaluate(v => { const el = document.querySelector(`input[name=viewIds][value="${v}"]`); return !!(el && el.checked); }, pick);
        assignResult = nowChecked ? 'assigned + persisted' : 'assign did not persist';
      }
    }

    // ── delete (soft → userAccess Inactive) ──
    let deleteStatus = null;
    if (id) {
      await page.goto(`${MIG}/admin/users/${id}`, { waitUntil: 'networkidle' });
      await page.evaluate(async (a) => {
        const h = (document.querySelector('meta[name=_csrf_header]') || {}).content;
        const t = (document.querySelector('meta[name=_csrf]') || {}).content;
        await fetch(`${a.MIG}/admin/users/${a.id}/delete`, { method: 'POST', headers: h ? { [h]: t } : {}, redirect: 'follow' });
      }, { MIG, id });
      await page.waitForTimeout(1000);
      const row = (await rows()).find(r => String(r.userId) === String(id));
      deleteStatus = row ? String(row.status || row.userAccess) : 'gone';
    }

    return { id, inGrid, entityMapped, editPersisted, resetMsg, assignResult, deleteStatus, shots };
  },

  check(m) {
    return [
      { aspect: 'Create succeeded', migrated: m.id ? `id ${m.id}` : 'no id', expected: 'created', ok: !!m.id },
      { aspect: 'Appears in grid', migrated: m.inGrid, expected: true, ok: m.inGrid === true },
      { aspect: 'Org/entity mapping persisted (F-0013)', migrated: m.entityMapped ? 'mapped' : 'ORPHAN (no org_user_mapping)', expected: 'mapped', ok: m.entityMapped === true },
      { aspect: 'Edit (lastName) persisted', migrated: m.editPersisted, expected: true, ok: m.editPersisted === true },
      { aspect: 'Reset password succeeded', migrated: m.resetMsg || '(none)', expected: 'Password reset successfully', ok: /reset successfully/i.test(m.resetMsg || '') },
      { aspect: 'Assign views persisted', migrated: m.assignResult, expected: 'assigned + persisted', ok: m.assignResult === 'assigned + persisted', severity: /inconclusive/.test(m.assignResult) ? 'warn' : undefined },
      { aspect: 'Delete soft-deactivates (userAccess→Inactive)', migrated: m.deleteStatus, expected: 'Inactive', ok: /inactive|gone/i.test(m.deleteStatus || '') },
    ];
  },
};
