// TC-SA-USER-4 — New User: duplicate User ID is rejected with an on-screen message — UI only.
//
// Legacy parity (addUser.jsp validateUserName AJAX): entering an existing login
// User ID is rejected; the user cannot create a duplicate. Migrated mirrors this
// server-side: UserServiceImpl.createInternal → userNameExists() →
// IllegalArgumentException "User ID \"x\" already exists." surfaced as the red
// errorMsg flash on the New User form after the redirect back.
//
// What the USER does/sees: fill a valid form but reuse the well-known existing
// login "admin", click Create → an error banner containing "already exists" is
// shown and NO new user is created (we end back on the New User form, not on a
// new /admin/users/{id} detail).
//
// UI-ONLY: read the visible error banner text + the resulting URL. No DB.
import { submit } from '../../lib/ui.mjs';

export default {
  id: 'TC-SA-USER-4',
  title: 'New User duplicate User ID rejected with "already exists" message',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/new',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only. Legacy validateUserName AJAX blocks dup login. Migrated: '
       + 'UserServiceImpl.userNameExists → "User ID already exists" errorMsg flash. '
       + 'Reuses the existing login "admin" (always present). No row is created.',

  async runMigrated({ page, base, creds, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.fill('#userName', 'admin').catch(() => {});       // existing login
    await page.fill('#newPassword', 'Raptech@12345').catch(() => {});
    await page.fill('#confirmPassword', 'Raptech@12345').catch(() => {});
    await page.fill('#firstName', 'ZZ').catch(() => {});
    await page.fill('#email', 'zzdup@example.com').catch(() => {});
    await page.fill('#phoneNo', '9999999999').catch(() => {});
    await page.click('.ms-wrap .multiselect').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('.ms-wrap .ms-option').catch(() => {});
    await page.waitForTimeout(200);

    await submit(page, /^create$/i);
    await page.waitForTimeout(900);

    const url = page.url();
    // Read the visible error banner the user sees (the red errorMsg flash). Match
    // any on-screen text node mentioning "already exists" so we read the actual
    // message, not the form's progress counter.
    const banner = await page.evaluate(() => {
      const node = [...document.querySelectorAll('div,span,p,li')]
        .filter(e => e.offsetParent && /already exists|failed to create/i.test(e.textContent || ''))
        .sort((a, b) => a.textContent.length - b.textContent.length)[0];
      return node ? node.textContent.replace(/\s+/g, ' ').trim() : null;
    });
    // Did we land on a brand-new user detail page? (would mean dup was allowed)
    const landedOnNewDetail = /\/admin\/users\/\d+$/.test(url);

    return { url, banner, landedOnNewDetail };
  },

  check(m) {
    return [
      { aspect: 'Duplicate User ID NOT created (no new detail page)',
        migrated: m.landedOnNewDetail ? `created → ${m.url}` : 'blocked',
        expected: 'blocked (no new user)', ok: m.landedOnNewDetail === false },
      { aspect: 'On-screen message says the User ID already exists',
        migrated: m.banner || '(no banner)',
        expected: 'message containing "already exists"',
        ok: /already exists/i.test(m.banner || '') },
    ];
  },
};
