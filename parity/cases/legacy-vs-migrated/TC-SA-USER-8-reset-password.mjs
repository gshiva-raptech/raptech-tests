// TC-SA-USER-8 — Reset Password screen: validation + success message — UI only.
//
// Legacy parity (resetPassword.jsp): the admin-driven Reset Password screen shows
// the (read-only) Username and a required New Password field; submitting empty is
// rejected, and a valid reset shows a success confirmation. The reset is a SEPARATE
// screen from Edit (not inline on the form).
//
// What the USER does/sees here (migrated /admin/users/{id}/reset-password):
//   (a) Submit with the New Password blank → an on-screen error
//       "New password cannot be empty." (server guard in UserController.resetPassword)
//       and the password is NOT changed.
//   (b) Enter a valid password + submit → "Password reset successfully." banner.
//
// Target user: we create a disposable ZZ user via the UI first (so we never reset
// the real admin's password), then reset it. FK-ordered cleanup at the end.
// UI-ONLY for pass/fail: read the visible banner text. (psql is cleanup-only.)
import { submit, flashText } from '../../lib/ui.mjs';
import { psql } from '../../lib/db.mjs';

export default {
  id: 'TC-SA-USER-8',
  title: 'Reset Password: empty rejected + valid reset shows success',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/{id}/reset-password',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only pass/fail. Legacy resetPassword.jsp: required New Password, '
       + 'separate screen. Migrated UserController.resetPassword: empty → '
       + '"New password cannot be empty."; valid → "Password reset successfully." '
       + 'Creates a disposable ZZ user via UI; psql cleanup only.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, data, forms }) {
    page.on('dialog', d => d.accept().catch(() => {}));
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    const userName = `zzrp${data.stamp}`;
    let id = null;
    const out = { created: false, emptyMsg: null, emptyStayed: null, validMsg: null };

    try {
      // ── create a disposable user via the UI ──
      await page.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.fill('#userName', userName).catch(() => {});
      await page.fill('#newPassword', 'Raptech@12345').catch(() => {});
      await page.fill('#confirmPassword', 'Raptech@12345').catch(() => {});
      await page.fill('#firstName', 'ZZ').catch(() => {});
      await page.fill('#email', `zzrp${data.stamp}@example.com`).catch(() => {});
      await page.fill('#phoneNo', '9999999999').catch(() => {});
      await page.click('.ms-wrap .multiselect').catch(() => {});
      await page.waitForTimeout(300);
      await page.click('.ms-wrap .ms-option').catch(() => {});
      await page.waitForTimeout(200);
      await submit(page, /^create$/i);
      await page.waitForTimeout(1500);
      id = (page.url().match(/admin\/users\/(\d+)/) || [])[1] || null;
      out.created = !!id;

      if (id) {
        // ── (a) empty password ──
        await page.goto(`${MIG}/admin/users/${id}/reset-password`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.fill('#newPassword', '').catch(() => {});
        await Promise.all([
          page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /reset password/i }).click(),
        ]);
        await page.waitForTimeout(900);
        // Read the specific error banner the user sees (not the page heading).
        out.emptyMsg = await page.evaluate(() => {
          const node = [...document.querySelectorAll('div,span,p,li')]
            .filter(e => e.offsetParent && /cannot be empty|required|failed/i.test(e.textContent || ''))
            .sort((a, b) => a.textContent.length - b.textContent.length)[0];
          return node ? node.textContent.replace(/\s+/g, ' ').trim() : null;
        });
        // After an empty reject the controller redirects back to .../reset-password
        out.emptyStayed = /reset-password/.test(page.url());

        // ── (b) valid password ──
        await page.goto(`${MIG}/admin/users/${id}/reset-password`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await page.fill('#newPassword', 'Raptech@67890').catch(() => {});
        await Promise.all([
          page.waitForLoadState('networkidle').catch(() => {}),
          page.getByRole('button', { name: /reset password/i }).click(),
        ]);
        await page.waitForTimeout(1000);
        out.validMsg = await flashText(page);
      }
    } finally {
      // FK-ordered cleanup of the disposable user.
      if (id) {
        try {
          psql(`DELETE FROM raptech_scm.org_user_mapping WHERE user_id_fk=${id};`);
          psql(`DELETE FROM raptech_scm.user_roles WHERE user_id_fk=${id};`);
          psql(`DELETE FROM raptech_scm.users WHERE user_id_pk=${id};`);
        } catch (e) { out.cleanupErr = String(e).slice(0, 200); }
      }
    }

    return out;
  },

  check(m) {
    return [
      { aspect: 'Disposable test user created', migrated: m.created ? 'created' : 'failed',
        expected: 'created', ok: m.created === true, severity: m.created ? undefined : 'warn' },
      { aspect: 'Empty New Password is rejected with a message',
        migrated: m.emptyMsg || '(no message)',
        expected: 'message like "New password cannot be empty."',
        ok: /cannot be empty|required/i.test(m.emptyMsg || '') },
      { aspect: 'Empty reset stays on the Reset Password screen (not applied)',
        migrated: m.emptyStayed ? 'stayed' : 'navigated away',
        expected: 'stayed on reset screen', ok: m.emptyStayed === true },
      { aspect: 'Valid reset shows success message',
        migrated: m.validMsg || '(no message)',
        expected: '"Password reset successfully."',
        ok: /reset successfully/i.test(m.validMsg || '') },
    ];
  },
};
