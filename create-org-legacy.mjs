// Create an organization in the LEGACY app as super admin, then verify it
// persisted. Writes the shared dataset + result to /tmp/parity-org.json.
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
const E = process.env;

const stamp = Date.now().toString().slice(-7);
const org = {
  name: `ZZ Parity Org ${stamp}`,
  displayName: `Parity ${stamp}`,
  firstName: 'Parity',
  lastName: 'Tester',
  address1: '1 Test Street',
  phoneNo: '5551234567',
  emailId: `parity${stamp}@example.com`,
  country: 'India',
  state: 'Karnataka',
  city: 'Bangalore',
  postalCode: '560001',
  entityAlias: `PAR${stamp}`,
  viewAlias: `VW${stamp}`,
  enterprisePlan: 'Ipact Enterprise',   // select label
  currency: 'INR',                        // multiselect label
  dateFormat: 'MM/dd/yyyy',               // select label
  product: 'Contract',                    // productList-1
  allowPriceChange: 'Yes',                // poPaymentType-2
};
fs.writeFileSync('/tmp/parity-org.json', JSON.stringify({ org }, null, 2));
console.log('DATASET:', org.name);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// login (super admin)
await page.goto(E.LEGACY_BASE_URL, { waitUntil: 'domcontentloaded' });
await page.fill('#userName', E.LEGACY_SUPERADMIN_USER);
await page.fill('#password', E.LEGACY_SUPERADMIN_PASSWORD);
await Promise.all([
  page.waitForLoadState('networkidle').catch(() => {}),
  page.locator('input[type="submit"][value="Sign In"]').click(),
]);
await page.waitForTimeout(800);

// open create form
await page.goto('https://staging.ipactsolutions.com/SCM/admin/addOrganization.action',
  { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// fill text fields
const fill = async (id, v) => { await page.fill(`#${id}`, v).catch(e => console.log(`  fill ${id} FAILED: ${e.message.split('\n')[0]}`)); };
await fill('name', org.name);
await fill('displayName', org.displayName);
await fill('firstName', org.firstName);
await fill('lastName', org.lastName);
await fill('address1', org.address1);
await fill('phoneNo', org.phoneNo);
await fill('emailId', org.emailId);
await fill('city', org.city);
await fill('postalCode', org.postalCode);
await fill('entityAlias', org.entityAlias);
await fill('viewAlias', org.viewAlias);

// country & state are jQuery-UI autocompletes backed by hidden id fields -> must pick a suggestion
async function autocomplete(id, value) {
  await page.click(`#${id}`);
  await page.fill(`#${id}`, '');
  await page.type(`#${id}`, value, { delay: 60 });
  await page.waitForTimeout(1400);
  const item = page.locator('ul.ui-autocomplete:visible li.ui-menu-item').first();
  if (await item.isVisible().catch(() => false)) {
    const txt = (await item.textContent().catch(() => '')).trim();
    await item.click();
    console.log(`  autocomplete ${id}: picked "${txt}"`);
  } else {
    console.log(`  autocomplete ${id}: NO suggestion for "${value}"`);
  }
}
await autocomplete('country', org.country);
await autocomplete('state', org.state);

// selects
await page.selectOption('#enterprisePlanId', { label: org.enterprisePlan }).catch(e => console.log('  enterprisePlan FAILED', e.message.split('\n')[0]));
await page.selectOption('#dateFormat', { label: org.dateFormat }).catch(e => console.log('  dateFormat FAILED', e.message.split('\n')[0]));

// currency: hidden <select multiple> behind a widget -> select option + dispatch change via DOM
const curOk = await page.evaluate((label) => {
  const s = document.querySelector('#currencyId'); if (!s) return false;
  let hit = false;
  for (const o of s.options) if (o.textContent.trim() === label) { o.selected = true; hit = true; }
  s.dispatchEvent(new Event('change', { bubbles: true }));
  return hit;
}, org.currency);
console.log('  currency set:', curOk);

// checkboxes are styled -> click the <label for=...>
await page.click('label[for="poPaymentType-2"]').catch(e => console.log('  allowPriceChange FAILED', e.message.split('\n')[0])); // "Yes"
await page.click('label[for="productList-1"]').catch(e => console.log('  product FAILED', e.message.split('\n')[0]));     // "Contract"

await page.screenshot({ path: '/tmp/legacy-org-filled.png', fullPage: true }).catch(() => {});

// submit
const beforeUrl = page.url();
await Promise.all([
  page.waitForLoadState('networkidle').catch(() => {}),
  page.locator('input[type="submit"][value="Create"], input[value="Create"]').first().click(),
]);
await page.waitForTimeout(2500);
const afterUrl = page.url();
await page.screenshot({ path: '/tmp/legacy-org-result.png', fullPage: true }).catch(() => {});

// collect validation errors / messages
const errs = await page.$$eval('.field-error,.error,.text-danger,.alert,[id*=error],label.error',
  els => [...new Set(els.map(e => (e.textContent || '').trim()).filter(Boolean))]).catch(() => []);
const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 0);

console.log('\nBEFORE:', beforeUrl);
console.log('AFTER :', afterUrl);
console.log('MESSAGES:', JSON.stringify(errs.slice(0, 10)));

// verify persistence: search the org list for the new name
let persisted = false;
await page.goto('https://staging.ipactsolutions.com/SCM/admin/viewOrganization.action', { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(800);
await page.fill('input[placeholder*="Search" i]', org.name).catch(() => {});
await page.waitForTimeout(1500);
persisted = await page.locator(`text=${org.name}`).first().isVisible().catch(() => false);
await page.screenshot({ path: '/tmp/legacy-org-verify.png', fullPage: true }).catch(() => {});
console.log('PERSISTED IN LIST:', persisted);

const result = { app: 'legacy', org, beforeUrl, afterUrl, messages: errs.slice(0, 10), persisted };
const saved = JSON.parse(fs.readFileSync('/tmp/parity-org.json'));
saved.legacy = result;
fs.writeFileSync('/tmp/parity-org.json', JSON.stringify(saved, null, 2));

await browser.close();
console.log('\nscreenshots: /tmp/legacy-org-filled.png /tmp/legacy-org-result.png /tmp/legacy-org-verify.png');
