// One-off: verify every configured account can log in to both apps.
// Throwaway diagnostic (gitignored project). Run: node login-check.mjs
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const E = process.env;
const MIG = (E.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
// LEGACY_BASE_URL may be the full /signIn URL; derive an origin for navigation.
const LEG_SIGNIN = E.LEGACY_BASE_URL || '';

const accounts = [
  { app: 'migrated', role: 'regular',    user: E.RAPTECH_USER,            pass: E.RAPTECH_PASSWORD },
  { app: 'migrated', role: 'superadmin', user: E.RAPTECH_SUPERADMIN_USER, pass: E.RAPTECH_SUPERADMIN_PASSWORD },
  { app: 'legacy',   role: 'regular',    user: E.LEGACY_USER,             pass: E.LEGACY_PASSWORD },
  { app: 'legacy',   role: 'superadmin', user: E.LEGACY_SUPERADMIN_USER,  pass: E.LEGACY_SUPERADMIN_PASSWORD },
];

async function loginMigrated(page, user, pass) {
  await page.goto(`${MIG}/signIn`, { waitUntil: 'domcontentloaded' });
  await page.fill('#signin-username', user);
  await page.fill('#signin-password', pass);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.click('button.signin-submit[type="submit"]'),
  ]);
  await page.waitForTimeout(1000);
  return assertLeftSignIn(page);
}

async function loginLegacy(page, user, pass) {
  await page.goto(LEG_SIGNIN, { waitUntil: 'domcontentloaded' });
  await page.fill('#userName', user);
  await page.fill('#password', pass);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.locator('input[type="submit"][value="Sign In"]').click(),
  ]);
  await page.waitForTimeout(1500);
  return assertLeftSignIn(page);
}

// success = we left the signIn page and there is no visible error banner.
async function assertLeftSignIn(page) {
  const url = page.url();
  const stillOnSignIn = /signin/i.test(url);
  const errText = (await page.locator(
    'text=/invalid|incorrect|failed|bad credentials|wrong|denied|locked/i'
  ).first().textContent({ timeout: 1500 }).catch(() => null)) || '';
  const hasItemsNav = await page.locator('a[href="/items"]').first().isVisible().catch(() => false);
  if (stillOnSignIn || errText.trim()) {
    throw new Error(`still on signIn (url=${url})${errText ? ' err="' + errText.trim().slice(0, 80) + '"' : ''}`);
  }
  return { url, hasItemsNav };
}

const browser = await chromium.launch();
const results = [];
for (const a of accounts) {
  const label = `${a.app}/${a.role} (${a.user || '<empty>'})`;
  if (!a.user || !a.pass) {
    results.push({ label, ok: false, msg: 'missing user/pass in .env' });
    continue;
  }
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    const r = a.app === 'migrated' ? await loginMigrated(page, a.user, a.pass)
                                   : await loginLegacy(page, a.user, a.pass);
    results.push({ label, ok: true, msg: `landed on ${r.url}${r.hasItemsNav ? '' : ' (no Items nav)'}` });
  } catch (e) {
    results.push({ label, ok: false, msg: String(e.message || e).split('\n')[0] });
  } finally {
    await ctx.close();
  }
}
await browser.close();

console.log('\n================ LOGIN CHECK ================');
for (const r of results) console.log(`${r.ok ? 'PASS ✅' : 'FAIL ❌'}  ${r.label}\n        ${r.msg}`);
console.log('============================================');
const failed = results.filter(r => !r.ok).length;
console.log(failed ? `${failed} login(s) FAILED` : 'All logins OK');
process.exit(failed ? 1 : 0);
