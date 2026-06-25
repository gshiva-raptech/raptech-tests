// parity/lib/ui.mjs — UI-ONLY verification helpers (see parity/TESTING_RULES.md).
// Verify what the USER sees: grid DOM, on-screen validation/flash, field states, row actions.
// Do NOT use the /rows JSON endpoint or psql to decide pass/fail.

export async function gridReady(page, timeout = 12000) {
  await page.waitForSelector('.ag-row', { timeout }).catch(() => {});
  await page.waitForTimeout(800);
}

/** Visible data rows as { idx, cells[] } from the AG-Grid DOM (center columns). */
export async function gridRows(page) {
  return page.$$eval('.ag-center-cols-container .ag-row', rows =>
    rows.map(r => ({
      idx: r.getAttribute('row-index'),
      cells: [...r.querySelectorAll('.ag-cell')].map(c => c.textContent.trim()),
    })));
}

/** Does any visible grid row contain this text? (what the user would see/scroll to) */
export async function gridHasText(page, text) {
  const rows = await gridRows(page);
  return rows.some(r => r.cells.some(c => c.includes(text)));
}

/** Visible AG-Grid column header texts. */
export async function gridColumns(page) {
  return page.$$eval('.ag-header-cell-text', els => els.map(e => e.textContent.trim()).filter(Boolean));
}

/** Open a row's kebab (⋮) menu and click the action whose label matches actionRe. */
export async function clickRowAction(page, rowText, actionRe) {
  const idx = await page.evaluate(t => {
    const r = [...document.querySelectorAll('.ag-center-cols-container .ag-row')]
      .find(row => [...row.querySelectorAll('.ag-cell')].some(c => c.textContent.includes(t)));
    return r ? r.getAttribute('row-index') : null;
  }, rowText);
  if (idx == null) throw new Error(`grid row not found containing "${rowText}"`);
  await page.click(`.ag-pinned-right-cols-container .ag-row[row-index="${idx}"] button.rap-kebab`);
  await page.waitForTimeout(300);
  const re = actionRe instanceof RegExp ? actionRe : new RegExp(actionRe, 'i');
  await page.getByRole('menuitem', { name: re }).click()
    .catch(async () => { await page.getByText(re).first().click(); });
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** Click a RaptechForm submit button by visible label (e.g. /create/i, /save changes/i). */
export async function submit(page, labelRe) {
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.getByRole('button', { name: labelRe }).click(),
  ]);
  await page.waitForTimeout(800);
}

/** Visible inline validation errors the user sees after a blocked submit: [{label, msg}]. */
export async function visibleFieldErrors(page) {
  return page.evaluate(() => [...document.querySelectorAll('.field-error')]
    .filter(e => e.offsetParent)
    .map(e => {
      const f = e.closest('.field');
      const label = (f?.querySelector('.field-label,label')?.textContent || '').trim().split('\n')[0].trim();
      return { label, msg: e.textContent.trim() };
    }));
}

/** The visible success/error/validation banner or popup text the user would read. */
export async function flashText(page) {
  return page.evaluate(() => {
    const leaves = [...document.querySelectorAll('div,span,p,li')]
      .filter(d => d.children.length === 0 && d.offsetParent &&
        /success|saved|created|updated|deleted|fail|error|already exists|required|cannot|invalid|reset|not\s/i.test(d.textContent || ''));
    leaves.sort((a, b) => a.textContent.trim().length - b.textContent.trim().length);
    return leaves.length ? leaves[0].textContent.trim() : null;
  });
}

/** Is the field the user-editable on screen? (false = disabled/readonly/static) null = absent. */
export async function isEditable(page, sel) {
  const el = await page.$(sel);
  if (!el) return null;
  return el.isEditable().catch(() => false);
}

/** Count visible mandatory (*) markers on the page (should be 0 on a read-only detail). */
export async function reqMarkerCount(page) {
  return page.evaluate(() => [...document.querySelectorAll('.req')].filter(e => e.offsetParent).length);
}

/** Is a control/button/link with this visible label present? (for action-visibility checks) */
export async function hasControl(page, labelRe) {
  const re = labelRe instanceof RegExp ? labelRe : new RegExp(labelRe, 'i');
  return (await page.getByText(re).count()) > 0;
}
