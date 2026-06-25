// TC-UIP-17 — Manual issue #17: the "Pricing" menu item under "Main" does nothing
// when clicked; it should navigate to the Pricing page. Migrated
// layout/sidebar.html renders the Pricing link as href="#" with no th:href target
// (sidebar.html ~lines 64-71), and there is no /pricing route in raptech-web — so
// clicking it stays on the same page. Legacy side-menu.jsp pointed it at
// /pricing/pricingDetail.action (the plan/subscription page).
//
// EXPECTED: the Pricing link has a real navigation target and clicking it lands on a
// distinct Pricing page (URL changes, real content renders). Fails now (href="#"),
// goes green once the link is wired to a working route.
export default {
  id: 'TC-UIP-17',
  title: 'Manual #17 — "Pricing" menu under Main navigates to a Pricing page',
  track: 'B',
  role: 'superadmin',
  urlPath: '/home',
  module: 'Navigation',
  subModule: 'Main → Pricing',
  hints: '- Manual issue #17: Pricing menu under Main does nothing on click.\n'
       + '- Migrated layout/sidebar.html: <a href="#" data-label="Pricing"> — dead link, no th:href.\n'
       + '- Legacy side-menu.jsp: Pricing -> /pricing/pricingDetail.action.\n'
       + '- No /pricing controller mapping exists in raptech-web (only /admin/org-pricing).',

  data() { return {}; },

  async runMigrated({ page, base, creds, forms, shot }) {
    const shots = {};
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    const MIG = base.replace(/\/+$/, '');

    await page.goto(`${MIG}/home`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const link = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(x =>
        x.getAttribute('data-label') === 'Pricing' || /^pricing$/i.test(x.textContent.trim()));
      return a ? { href: a.getAttribute('href'), text: a.textContent.trim() } : null;
    });
    if (!link) throw new Error('Pricing menu link not found in sidebar');

    const startUrl = page.url();
    shots.before = shot('before'); await page.screenshot({ path: shots.before, fullPage: true }).catch(() => {});

    // Click it and see whether navigation happens.
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(x =>
        x.getAttribute('data-label') === 'Pricing' || /^pricing$/i.test(x.textContent.trim()));
      a && a.click();
    });
    await page.waitForTimeout(1200);
    const afterUrl = page.url();
    shots.after = shot('after'); await page.screenshot({ path: shots.after, fullPage: true }).catch(() => {});

    const isDeadHref = !link.href || link.href === '#' || /^javascript:/i.test(link.href);
    const navigated = afterUrl !== startUrl && !/#$/.test(afterUrl.replace(startUrl, ''));

    return { link, isDeadHref, startUrl, afterUrl, navigated, shots };
  },

  check(m) {
    return [
      { aspect: 'Pricing link has a real target (not href="#")',
        migrated: `href=${JSON.stringify(m.link.href)}`,
        expected: 'a real route (th:href), not "#"/javascript:void',
        ok: m.isDeadHref === false },
      { aspect: 'Clicking Pricing navigates to a Pricing page',
        migrated: m.navigated ? `navigated to ${m.afterUrl}` : `stayed on ${m.afterUrl}`,
        expected: 'URL changes to the Pricing page',
        ok: m.navigated === true },
    ];
  },
};
