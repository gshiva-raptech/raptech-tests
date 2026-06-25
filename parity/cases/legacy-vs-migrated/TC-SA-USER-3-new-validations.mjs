// TC-SA-USER-3 — New User form: required markers + on-screen validations — UI only.
//
// Legacy parity (addUser.jsp): required = Entity*, User ID*, Password*, Confirm
// Password*, First Name*, Email*, Contact Number*. Client guards: entity must have
// a selection; Confirm Password must match Password. Submitting empty shows the
// per-field "Required"/"Select at least one entity" errors and BLOCKS the save
// (you stay on the form). A password mismatch shows "Passwords must match".
//
// What the USER sees / does here:
//   (a) Empty submit → inline field errors appear, still on /admin/users/new.
//   (b) Fill everything but mismatch the two passwords → blocked, confirm field
//       flagged, still on the form.
//
// UI-ONLY: click the real Create button; read .field-error visibility / .invalid
// field state / the URL (did navigation happen?). No backend calls.
import { submit, visibleFieldErrors } from '../../lib/ui.mjs';

export default {
  id: 'TC-SA-USER-3',
  title: 'New User required markers + empty-submit + password-mismatch validation',
  track: 'B',
  role: 'superadmin',
  urlPath: '/admin/users/new',
  module: 'Admin Settings',
  subModule: 'Users',
  hints: 'UI-only. Legacy required: Entity, User ID, Password, Confirm Password, '
       + 'First Name, Email, Contact Number. Confirm-password match + entity '
       + 'required are JS guards in form.html. Empty submit must stay on the form.',

  async runMigrated({ page, base, creds, forms }) {
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');
    await page.goto(`${MIG}/admin/users/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // (0) Required markers the user can see.
    const reqLabels = await page.evaluate(() =>
      [...document.querySelectorAll('.field')].filter(f => f.querySelector('.req'))
        .map(f => (f.querySelector('.field-label')?.textContent || '').replace(/\s+/g, ' ').replace(/\*/g, '').trim())
        .filter(Boolean));

    // (a) Empty submit → must NOT navigate; field errors visible.
    await submit(page, /^create$/i);
    await page.waitForTimeout(600);
    const stillOnFormEmpty = /\/admin\/users\/new/.test(page.url());
    const emptyErrors = await page.evaluate(() =>
      [...document.querySelectorAll('.field.invalid')].length
      || [...document.querySelectorAll('.field-error')].filter(e => e.offsetParent).length);

    // (b) Fill all required but mismatch the passwords → blocked at confirm.
    await page.fill('#userName', `zzval${Date.now().toString().slice(-6)}`).catch(() => {});
    await page.fill('#newPassword', 'Raptech@12345').catch(() => {});
    await page.fill('#confirmPassword', 'DIFFERENT@999').catch(() => {});
    await page.fill('#firstName', 'ZZ').catch(() => {});
    await page.fill('#email', 'zzval@example.com').catch(() => {});
    await page.fill('#phoneNo', '9999999999').catch(() => {});
    // select an entity in the data-multiselect so ONLY the mismatch blocks us
    await page.click('.ms-wrap .multiselect').catch(() => {});
    await page.waitForTimeout(300);
    await page.click('.ms-wrap .ms-option').catch(() => {});
    await page.waitForTimeout(200);
    await submit(page, /^create$/i);
    await page.waitForTimeout(600);
    const stillOnFormMismatch = /\/admin\/users\/new/.test(page.url());
    const confirmFlagged = await page.evaluate(() => {
      const c = document.querySelector('#confirmPassword');
      return !!(c && c.closest('.field') && c.closest('.field').classList.contains('invalid'));
    });

    return { reqLabels, stillOnFormEmpty, emptyErrors, stillOnFormMismatch, confirmFlagged };
  },

  check(m) {
    const want = ['Entity', 'User ID', 'Login Password', 'Confirm Password', 'First Name', 'Email ID', 'Contact Number'];
    const norm = s => s.toLowerCase();
    const have = m.reqLabels.map(norm);
    const missing = want.filter(w => !have.includes(norm(w)));
    return [
      { aspect: 'All legacy required-field markers (*) shown',
        migrated: m.reqLabels.join(', '), expected: want.join(', '),
        ok: missing.length === 0, note: missing.length ? `missing *: ${missing.join(', ')}` : '' },
      { aspect: 'Empty submit is BLOCKED (stays on New User form)',
        migrated: m.stillOnFormEmpty ? 'stayed on form' : 'navigated away',
        expected: 'stayed on form', ok: m.stillOnFormEmpty === true },
      { aspect: 'Empty submit shows visible field error(s)',
        migrated: `${m.emptyErrors} error markers`, expected: '> 0', ok: m.emptyErrors > 0 },
      { aspect: 'Password mismatch is BLOCKED (stays on form)',
        migrated: m.stillOnFormMismatch ? 'stayed on form' : 'navigated away',
        expected: 'stayed on form', ok: m.stillOnFormMismatch === true },
      { aspect: 'Confirm Password field flagged invalid on mismatch',
        migrated: m.confirmFlagged, expected: true, ok: m.confirmFlagged === true },
    ];
  },
};
