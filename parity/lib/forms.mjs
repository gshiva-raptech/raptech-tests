// parity/lib/forms.mjs
// Shared Playwright helpers for driving the migrated (Spring Boot) and legacy
// (Struts) apps. Extracted from the proven login-check / create-org scripts so
// every case reuses the same widget handling instead of reinventing it.

/* ─────────────────────────── MIGRATED ─────────────────────────── */

export async function loginMigrated(page, base, user, pass) {
  const MIG = base.replace(/\/+$/, '');
  await page.goto(`${MIG}/signIn`, { waitUntil: 'domcontentloaded' });
  await page.fill('#signin-username', user);
  await page.fill('#signin-password', pass);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.click('button.signin-submit[type="submit"]'),
  ]);
  await page.waitForTimeout(1000);
  if (/signin/i.test(page.url())) throw new Error(`migrated login failed (still on ${page.url()})`);
}

// Migrated custom multiselect / searchable widget (.ms-wrap over a hidden native
// <select>). Open → search → click the .ms-option.
export async function migratedChooseMs(page, selectId, value, { startsWith = false } = {}) {
  const wrap = page.locator(`#${selectId} + .ms-wrap`);
  await wrap.locator('.multiselect').click();
  await page.waitForTimeout(250);
  await wrap.locator('.ms-search-input').fill(value).catch(() => {});
  await page.waitForTimeout(500);
  const opt = startsWith
    ? wrap.locator(`.ms-option[data-text^="${value}"]`).first()
    : wrap.locator(`.ms-option[data-text="${value}"]`).first();
  const ok = await opt.click({ timeout: 4000 }).then(() => true).catch(() => false);
  await page.keyboard.press('Escape').catch(() => {});
  return ok;
}

// Migrated styled checkbox — click the <label for=id>, fall back to DOM.
export async function migratedTickLabel(page, id) {
  const ok = await page.click(`label[for="${id}"]`).then(() => true).catch(() => false);
  if (!ok) {
    await page.evaluate((i) => {
      const el = document.getElementById(i);
      if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, id);
  }
}

/* ─────────────────────────── LEGACY ─────────────────────────── */

export async function loginLegacy(page, signInUrl, user, pass) {
  await page.goto(signInUrl, { waitUntil: 'domcontentloaded' });
  await page.fill('#userName', user);
  await page.fill('#password', pass);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.locator('input[type="submit"][value="Sign In"]').click(),
  ]);
  await page.waitForTimeout(1200);
  if (/signin/i.test(page.url())) throw new Error(`legacy login failed (still on ${page.url()})`);
}

// Legacy jQuery-UI autocomplete backed by a hidden id field — type then pick a
// suggestion (filling the visible field alone leaves the hidden id at 0).
export async function legacyAutocomplete(page, id, value) {
  await page.click(`#${id}`);
  await page.fill(`#${id}`, '');
  await page.type(`#${id}`, value, { delay: 60 });
  await page.waitForTimeout(1400);
  const item = page.locator('ul.ui-autocomplete:visible li.ui-menu-item').first();
  if (await item.isVisible().catch(() => false)) { await item.click(); return true; }
  return false;
}

// Legacy hidden <select multiple> behind a widget — set option + dispatch change.
export async function legacySelectMultiByLabel(page, selectId, label) {
  return page.evaluate(({ selectId, label }) => {
    const s = document.querySelector(`#${selectId}`); if (!s) return false;
    let hit = false;
    for (const o of s.options) if (o.textContent.trim() === label) { o.selected = true; hit = true; }
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return hit;
  }, { selectId, label });
}

export async function legacyClickLabelFor(page, id) {
  return page.click(`label[for="${id}"]`).then(() => true).catch(() => false);
}

/* ─────────────────────────── SHARED ─────────────────────────── */

export async function fillById(page, id, v) {
  await page.fill(`#${id}`, v).catch(() => {});
}

// Read the "TOTAL n" / "ACTIVE n" KPI counters off a list page body.
export async function readCounters(page) {
  return page.evaluate(() => {
    const t = document.body.innerText;
    const num = (re) => { const m = t.match(re); return m ? Number(m[1]) : null; };
    return { total: num(/TOTAL\s+(\d+)/i), active: num(/ACTIVE\s+(\d+)/i) };
  });
}
