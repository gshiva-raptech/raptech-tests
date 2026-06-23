// Exploratory: open the LEGACY create-organization form and dump its fields.
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();
const E = process.env;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(E.LEGACY_BASE_URL, { waitUntil: 'domcontentloaded' });
await page.fill('#userName', E.LEGACY_SUPERADMIN_USER);
await page.fill('#password', E.LEGACY_SUPERADMIN_PASSWORD);
await Promise.all([
  page.waitForLoadState('networkidle').catch(() => {}),
  page.locator('input[type="submit"][value="Sign In"]').click(),
]);
await page.waitForTimeout(1000);

await page.goto('https://staging.ipactsolutions.com/SCM/admin/addOrganization.action',
  { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1500);
console.log('CREATE FORM PAGE:', page.url());
await page.screenshot({ path: '/tmp/legacy-org-create.png', fullPage: true }).catch(() => {});

const forms = await page.$$eval('form', fs => fs.map(f => ({
  id: f.id, action: f.getAttribute('action') || '', method: f.getAttribute('method') || '',
  fields: [...f.querySelectorAll('input,select,textarea')].map(el => {
    // try to find an associated label
    let lbl = '';
    if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) lbl = l.textContent.trim(); }
    return {
      tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '',
      id: el.id || '', name: el.getAttribute('name') || '',
      required: el.required || el.getAttribute('required') != null || /\*/.test(lbl),
      label: lbl || el.getAttribute('placeholder') || '',
      visible: !!(el.offsetParent !== null || el.type === 'hidden'),
      options: el.tagName.toLowerCase() === 'select'
        ? [...el.options].slice(0, 6).map(o => o.textContent.trim()) : undefined,
    };
  }).filter(x => x.type !== 'hidden'),
})));

for (const f of forms) {
  if (!f.fields.length) continue;
  console.log(`\n=== FORM id=${f.id} action=${f.action} method=${f.method} ===`);
  for (const x of f.fields) console.log(JSON.stringify(x));
}

// submit buttons
const subs = await page.$$eval('button,input[type="submit"],input[type="button"],a.btn', els =>
  els.map(e => ({ tag: e.tagName.toLowerCase(), text: (e.textContent || e.value || '').trim(),
    id: e.id || '', onclick: e.getAttribute('onclick') || '' }))
    .filter(e => e.text));
console.log('\n=== BUTTONS ===');
for (const s of subs) console.log(JSON.stringify(s));

await browser.close();
console.log('\nscreenshot: /tmp/legacy-org-create.png');
