// Create the SAME organization in the MIGRATED app as super admin, using the
// dataset captured from legacy (/tmp/parity-org.json). Records result back.
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
const E = process.env;
const MIG = (E.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

const saved = JSON.parse(fs.readFileSync('/tmp/parity-org.json'));
const org = saved.org;
console.log('DATASET:', org.name);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(`${MIG}/signIn`, { waitUntil: 'domcontentloaded' });
await page.fill('#signin-username', E.RAPTECH_SUPERADMIN_USER);
await page.fill('#signin-password', E.RAPTECH_SUPERADMIN_PASSWORD);
await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('button.signin-submit[type="submit"]')]);
await page.waitForTimeout(800);

await page.goto(`${MIG}/admin/organizations`, { waitUntil: 'networkidle' });
await page.click('#btnNew');
await page.waitForTimeout(1800);
console.log('CREATE FORM:', page.url());

const fill = async (id, v) => { await page.fill(`#${id}`, v).catch(e => console.log(`  fill ${id} FAILED: ${e.message.split('\n')[0]}`)); };
await fill('name', org.name);
await fill('displayName', org.displayName);
await fill('firstName', org.firstName);
await fill('lastName', org.lastName);
await fill('address1', org.address1);
await fill('phoneNo', org.phoneNo);
await fill('email', org.emailId);           // legacy emailId -> migrated email
await fill('city', org.city);
await fill('postalCode', org.postalCode);
await fill('entityAlias', org.entityAlias);
await fill('viewAlias', org.viewAlias);

// country/state/currency are custom widgets (.ms-wrap) over a hidden native <select>.
// Drive the widget: open -> search -> click the .ms-option.
async function chooseMs(selectId, value, { startsWith = false } = {}) {
  const wrap = page.locator(`#${selectId} + .ms-wrap`);
  await wrap.locator('.multiselect').click();
  await page.waitForTimeout(250);
  await wrap.locator('.ms-search-input').fill(value).catch(() => {});
  await page.waitForTimeout(500);
  const opt = startsWith
    ? wrap.locator(`.ms-option[data-text^="${value}"]`).first()
    : wrap.locator(`.ms-option[data-text="${value}"]`).first();
  const ok = await opt.click({ timeout: 4000 }).then(() => true).catch(() => false);
  console.log(`  ${selectId}: ${ok ? 'picked ' + value : 'NOT FOUND ' + value}`);
  await page.keyboard.press('Escape').catch(() => {});
  return ok;
}
await chooseMs('country', org.country);
await page.waitForTimeout(1500);             // wait for cascading state options
await chooseMs('state', org.state);

await page.selectOption('#enterprisePlanId', { label: org.enterprisePlan }).catch(e => console.log('  enterprisePlan FAILED', e.message.split('\n')[0]));
await page.selectOption('#dateFormat', { label: org.dateFormat }).catch(e => console.log('  dateFormat FAILED', e.message.split('\n')[0]));

// currency: multiselect widget; option label is "INR — Rupees" -> match by prefix
await chooseMs('currencyId', org.currency, { startsWith: true });

// optional (required in legacy, not in migrated): product + allow price change
async function tickLabel(id) {
  const ok = await page.click(`label[for="${id}"]`).then(() => true).catch(() => false);
  if (!ok) await page.evaluate((i) => { const el = document.getElementById(i); if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); } }, id);
}
await tickLabel('contracts1');         // "Contract" product
await tickLabel('poVariablePrice1');   // allow price change = Yes

await page.screenshot({ path: '/tmp/mig-org-filled.png', fullPage: true }).catch(() => {});

const beforeUrl = page.url();
await Promise.all([
  page.waitForLoadState('networkidle').catch(() => {}),
  page.getByRole('button', { name: /create organization/i }).click(),
]);
await page.waitForTimeout(2500);
const afterUrl = page.url();
await page.screenshot({ path: '/tmp/mig-org-result.png', fullPage: true }).catch(() => {});

const errs = await page.$$eval('.field-error,.error,.text-danger,.invalid-feedback,.alert,[class*=error]',
  els => [...new Set(els.map(e => (e.textContent || '').trim()).filter(Boolean))]).catch(() => []);
console.log('\nBEFORE:', beforeUrl);
console.log('AFTER :', afterUrl);
console.log('MESSAGES:', JSON.stringify(errs.slice(0, 12)));

// verify persistence in list
await page.goto(`${MIG}/admin/organizations`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(800);
await page.fill('input[placeholder*="Search" i]', org.name).catch(() => {});
await page.waitForTimeout(1500);
const persisted = await page.locator(`text=${org.name}`).first().isVisible().catch(() => false);
await page.screenshot({ path: '/tmp/mig-org-verify.png', fullPage: true }).catch(() => {});
console.log('PERSISTED IN LIST:', persisted);

saved.migrated = { app: 'migrated', org, beforeUrl, afterUrl, messages: errs.slice(0, 12), persisted };
fs.writeFileSync('/tmp/parity-org.json', JSON.stringify(saved, null, 2));

await browser.close();
console.log('\nscreenshots: /tmp/mig-org-filled.png /tmp/mig-org-result.png /tmp/mig-org-verify.png');
