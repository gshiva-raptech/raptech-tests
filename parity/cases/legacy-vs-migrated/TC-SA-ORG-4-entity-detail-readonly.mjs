// TC-SA-ORG-4 — Business-Unit (Entity) DETAILS must be READ-ONLY (legacy ↔
// migrated, UI-only). Extends manual issues #5 (entity name editable) and #6
// (entity detail editable) / findings F-0033, F-0034.
//
// Golden master (live-verified on legacy detailEntity.action): the Entity Details
// screen is read-only — Entity Name is NOT editable, there are ~0 editable inputs,
// no Save/Update button, and no mandatory (*) markers.
//
// Migrated reuses the editable admin/org/entity-form.html for the "Entity Details"
// view path (OrganizationController.viewEntity) with NO th:disabled on the fields
// and the Update button shown whenever canEdit — so for a super-admin the Details
// screen is FULLY EDITABLE and SAVEABLE, identical to Edit Entity. That is the
// user-visible regression this case guards.
//
// EXPECTED (legacy parity) on migrated Entity Details:
//   • Entity Name is read-only,
//   • no editable data inputs,
//   • no Update/Save button,
//   • no mandatory (*) markers.
export default {
  id: 'TC-SA-ORG-4',
  title: 'Entity Details — read-only (name not editable, no Save, no *) (parity)',
  track: 'A',
  role: 'superadmin',
  urlPath: '/admin/organizations/{orgId}/entities/{entityId}',
  module: 'Admin Settings',
  subModule: 'Organization → Business Units (super-admin)',
  hints: '- Legacy detailEntity.action: read-only, no Save, 0 stars.\n'
       + '- Migrated viewEntity reuses entity-form.html with no th:disabled; Update shown when canEdit.\n'
       + '- Root: OrganizationController.viewEntity sets canEdit=perm.canEdit (no read-only mode);'
       + ' entity-form.html fields have no th:disabled and Update button shows when canEdit.',

  data() { return {}; },

  /* ── LEGACY (golden master) ── */
  async runLegacy({ page, base, signInUrl, creds, forms, shot }) {
    const shots = {};
    await forms.loginLegacy(page, signInUrl, creds.user, creds.pass);

    // Find an org that HAS a business unit, then open its Entity Details.
    const found = await findLegacyOrgWithEntity(page, base);
    if (!found) throw new Error('no legacy org with a business unit found in scan range');
    await runAnchor(page, found.detailHref);
    await page.waitForTimeout(1300);

    const info = await page.evaluate(() => {
      const nameEl = document.querySelector('#entityName, input[name="entityName"]');
      const nameEditable = nameEl ? !(nameEl.disabled || nameEl.readOnly) && nameEl.type !== 'hidden' : false;
      const stars = [...document.querySelectorAll('label,td,th,span')]
        .filter(e => /\*/.test(e.textContent || '') && e.children.length === 0).length;
      const editable = [...document.querySelectorAll('input[type=text],textarea,select')]
        .filter(i => i.offsetParent && !(i.disabled || i.readOnly)).length;
      const hasSave = [...document.querySelectorAll('input[type=submit],button')]
        .some(b => /save|update|create/i.test((b.value || b.textContent || '')));
      return { nameEditable, stars, editable, hasSave };
    });
    shots.detail = shot('detail'); await page.screenshot({ path: shots.detail, fullPage: true }).catch(() => {});
    return { app: 'legacy', orgId: found.orgId, entityId: found.entityId, ...info, shots };
  },

  /* ── MIGRATED ── */
  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    const found = await findMigratedOrgWithEntity(page, MIG);
    if (!found) throw new Error('no migrated org with a business unit found');
    await page.goto(`${MIG}/admin/organizations/${found.orgId}/entities/${found.entityId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const info = await page.evaluate(() => {
      const form = document.querySelector('form[data-raptech-form]') || document;
      const nameEl = form.querySelector('#entityName');
      const nameEditable = nameEl ? !(nameEl.disabled || nameEl.readOnly) && nameEl.type !== 'hidden' : false;
      const stars = form.querySelectorAll('.req').length;
      const editable = [...form.querySelectorAll('input,select,textarea')].filter(e => {
        if (e.type === 'hidden') return false;
        if (e.classList.contains('ms-search-input') || e.classList.contains('company-menu-search')) return false;
        return !(e.disabled || e.readOnly);
      }).length;
      const hasSave = [...document.querySelectorAll('button')]
        .some(b => /update|save|create/i.test((b.textContent || '')));
      return { nameEditable, stars, editable, hasSave };
    });
    shots.detail = shot('detail'); await page.screenshot({ path: shots.detail, fullPage: true }).catch(() => {});
    return { app: 'migrated', orgId: found.orgId, entityId: found.entityId, ...info, shots };
  },

  /* ── COMPARE ── */
  compare(legacy, migrated) {
    return [
      { aspect: 'Entity Details: Entity Name read-only', legacy: !legacy.nameEditable, migrated: !migrated.nameEditable,
        ok: migrated.nameEditable === false,
        note: migrated.nameEditable ? 'Entity Name editable on Details (legacy read-only) — issue #5' : '' },
      { aspect: 'Entity Details: no editable inputs', legacy: legacy.editable, migrated: migrated.editable,
        ok: migrated.editable === 0,
        note: migrated.editable > 0 ? `Details has ${migrated.editable} editable inputs (legacy read-only) — issue #6` : '' },
      { aspect: 'Entity Details: no Update/Save button', legacy: !legacy.hasSave, migrated: !migrated.hasSave,
        ok: migrated.hasSave === false,
        note: migrated.hasSave ? 'Details offers Update/Save (legacy has none) — issue #6' : '' },
      { aspect: 'Entity Details: no mandatory (*) markers', legacy: legacy.stars, migrated: migrated.stars,
        ok: migrated.stars === 0,
        note: migrated.stars > 0 ? `Details leaks ${migrated.stars} (*) (legacy=0)` : '' },
    ];
  },
};

/* ── helpers ── */
async function runAnchor(page, href) {
  const m = href.match(/anchorTagSubmit\('([^']+)','([^']+)',\s*(\d+)/);
  if (!m) throw new Error('bad anchorTagSubmit href: ' + href);
  await page.evaluate(({ f, u, i }) => window.anchorTagSubmit(f, u, i), { f: m[1], u: m[2], i: Number(m[3]) });
  await page.waitForLoadState('networkidle').catch(() => {});
}

// Scan legacy orgs for one whose Business-Unit list exposes Entity Details.
async function findLegacyOrgWithEntity(page, base) {
  await page.goto(`${base}/admin/viewOrganization.action`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const orgIds = await page.evaluate(() => {
    const ids = new Set();
    [...document.querySelectorAll('a[href*="anchorTagSubmit"]')].forEach(a => {
      const h = a.getAttribute('href') || '';
      if (/viewEntity/i.test(h)) { const m = h.match(/,\s*(\d+)\s*\)/); if (m) ids.add(Number(m[1])); }
    });
    return [...ids];
  });
  for (const orgId of orgIds) {
    await page.goto(`${base}/admin/viewOrganization.action`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.evaluate((id) => window.anchorTagSubmit('detailForm', '/SCM/admin/viewEntity.action', id), orgId);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(900);
    const detail = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a[href*="anchorTagSubmit"]')]
        .map(x => x.getAttribute('href')).find(h => /detailEntity|EntityDetail/i.test(h));
      const m = a && a.match(/,\s*(\d+)\s*\)/);
      return a ? { detailHref: a, entityId: m ? Number(m[1]) : null } : null;
    });
    if (detail) return { orgId, ...detail };
  }
  return null;
}

// Migrated: find an org with at least one entity (entity grid has a data row).
async function findMigratedOrgWithEntity(page, MIG) {
  const orgIds = await page.evaluate(async () => {
    const r = await fetch('/admin/organizations/rows', { headers: { Accept: 'application/json' } });
    const j = await r.json();
    return j.map(o => o.orgId);
  });
  for (const orgId of orgIds) {
    await page.goto(`${MIG}/admin/organizations/${orgId}/entities`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ag-row', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(400);
    // discover the entity id via the row kebab → Entity Details navigation
    const has = await page.$('.ag-center-cols-container .ag-row');
    if (!has) continue;
    await page.click('.ag-pinned-right-cols-container .ag-row[row-index="0"] button.rap-kebab').catch(() => {});
    await page.waitForTimeout(300);
    const item = page.getByText(/Entity Details/i).first();
    if (!(await item.count())) { await page.keyboard.press('Escape').catch(() => {}); continue; }
    await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), item.click().catch(() => {})]);
    await page.waitForTimeout(800);
    const m = page.url().match(/entities\/(\d+)/);
    if (m) return { orgId, entityId: Number(m[1]) };
  }
  return null;
}
