// Open the MIGRATED org list, find the create action, dump the create-org form.
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();
const E = process.env;
const MIG = (E.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(`${MIG}/signIn`, { waitUntil: 'domcontentloaded' });
await page.fill('#signin-username', E.RAPTECH_SUPERADMIN_USER);
await page.fill('#signin-password', E.RAPTECH_SUPERADMIN_PASSWORD);
await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('button.signin-submit[type="submit"]')]);
await page.waitForTimeout(800);

// org list
await page.goto(`${MIG}/admin/organization`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1000);
console.log('ORG LIST:', page.url());
await page.screenshot({ path: '/tmp/mig-org-list.png', fullPage: true }).catch(() => {});

const actions = await page.$$eval('a,button', els => els.map(e => ({
  tag: e.tagName.toLowerCase(), text: (e.textContent || '').trim().replace(/\s+/g, ' '),
  href: e.getAttribute('href') || '', id: e.id || '', onclick: e.getAttribute('onclick') || '',
})).filter(e => e.text || e.href));
const addRe = /add|new|create/i;
console.log('\n=== ADD/CREATE ACTIONS ===');
for (const a of actions.filter(a => addRe.test(a.text) || addRe.test(a.href) || addRe.test(a.id) || addRe.test(a.onclick))) console.log(JSON.stringify(a));

// open the create form via the New Organization button
let opened = false;
await page.click('#btnNew').catch(e => console.log('btnNew click failed', e.message.split('\n')[0]));
await page.waitForTimeout(1800);
opened = true;
console.log('CREATE FORM:', page.url(), 'opened=', opened);
await page.screenshot({ path: '/tmp/mig-org-create.png', fullPage: true }).catch(() => {});

const forms = await page.$$eval('form', fs => fs.map(f => ({
  id: f.id, action: f.getAttribute('action') || '', method: f.getAttribute('method') || '',
  fields: [...f.querySelectorAll('input,select,textarea')].map(el => {
    let lbl = '';
    if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) lbl = l.textContent.trim().replace(/\s+/g, ' '); }
    return {
      tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '',
      id: el.id || '', name: el.getAttribute('name') || '',
      required: el.required || el.getAttribute('required') != null || /\*/.test(lbl),
      label: lbl,
      options: el.tagName.toLowerCase() === 'select' ? [...el.options].slice(0, 6).map(o => o.textContent.trim()) : undefined,
    };
  }).filter(x => x.type !== 'hidden'),
})));
for (const f of forms) {
  if (!f.fields.length) continue;
  console.log(`\n=== FORM id=${f.id} action=${f.action} method=${f.method} ===`);
  for (const x of f.fields) console.log(JSON.stringify(x));
}
const subs = await page.$$eval('button,input[type=submit]', els => els.map(e => ({ text: (e.textContent || e.value || '').trim(), id: e.id || '' })).filter(e => e.text));
console.log('\n=== BUTTONS ==='); for (const s of subs) console.log(JSON.stringify(s));

await browser.close();
console.log('\nscreenshots: /tmp/mig-org-list.png /tmp/mig-org-create.png');
