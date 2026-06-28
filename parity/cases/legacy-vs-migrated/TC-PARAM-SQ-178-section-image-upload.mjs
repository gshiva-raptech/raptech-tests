// TC-PARAM-SQ-178 — Sales Quotes › "Quotation Section Image Upload" (org param 178).
// Spec (Section 8): ON → show a per-quotation-section IMAGE UPLOAD control on the Sales
// Quote create form (one or more images per section); OFF → that control is hidden.
//
// Method (UI-only, mirrors TC-PARAM-SO-069): superadmin toggles 178 on org 36 via the
// admin org-parameter page; a SEPARATE regular-user context renders the quote create
// form in both states and we diff the form signature + look for a per-section image
// upload control. Org 36 ("Zoom Inc") is the regular user's (shekar_N) own org.
// Snapshot+restore the param. LOCAL only; no rows created.
import { switchOrg, setOrgParam, readOrgParamState, formSignature } from '../../lib/fixtures.mjs';

const ORG = 36;
const QUOTE_NEW = '/sales-quotes/sales-quotes/new';

export default {
  id: 'TC-PARAM-SQ-178',
  title: 'Sales Quotes — Quotation Section Image Upload (178) shows per-section image upload ON, hides OFF',
  track: 'B',
  role: 'superadmin',
  urlPath: QUOTE_NEW,
  module: 'Admin Settings',
  subModule: 'Org Parameter (Sales Quotes) → per-section image upload on quote create form',
  hints: '- Param 178 "Quotation Section Image Upload". Migrated consumer: SalesQuotesController.newForm/prepareNewModel + templates/sales-quotes/form.html. Spec: ON shows per-section image upload control; OFF hides it.',

  data() { return { stamp: Date.now().toString().slice(-7) }; },

  async runMigrated({ page, base, creds, forms }) {
    const MIG = base.replace(/\/+$/, '');
    // admin context (superadmin) toggles the param
    await forms.loginMigrated(page, base, creds.user, creds.pass);
    await switchOrg(page, base, ORG);

    // regular-user context renders the quote create form
    const browser = page.context().browser();
    const uctx = await browser.newContext();
    const up = await uctx.newPage();
    await forms.loginMigrated(up, base, process.env.RAPTECH_USER, process.env.RAPTECH_PASSWORD);

    // Capture the quote-create form state: signature + a focused check for any
    // per-section image-upload control (file input that accepts images, or a
    // visible "image upload"/"section image" affordance inside a quote section).
    const snapForm = async () => {
      const r = await up.goto(`${MIG}${QUOTE_NEW}`, { waitUntil: 'networkidle' }).catch(() => null);
      const accessible = !!(r && r.ok()) && !/signin/i.test(up.url());
      if (!accessible) return { accessible, sig: '', imageUpload: false, fileInputs: [] };
      await up.waitForTimeout(500);
      const sig = await formSignature(up);
      const detail = await up.evaluate(() => {
        const fileInputs = [...document.querySelectorAll('input[type="file"]')]
          .map(i => ({ name: i.name || i.id || '', accept: i.accept || '' }));
        // per-section image upload = a file input that accepts images, OR an
        // image-upload affordance that sits inside a quote section (not the
        // generic global attachments block).
        const acceptsImage = fileInputs.some(f => /image/i.test(f.accept));
        const sectionScopedImage = [...document.querySelectorAll('.section')].some(sec => {
          const txt = (sec.innerText || '');
          const hasImgControl = sec.querySelector('input[type="file"][accept*="image" i]')
            || /section image|image upload|upload image|add image/i.test(txt);
          // exclude the global Attachments / Documents section
          const isAttachSection = /attachment|document/i.test(txt) && !/item|line/i.test(txt);
          return !!hasImgControl && !isAttachSection;
        });
        const textMentionsSectionImage = /section image|quotation section image|image upload per/i.test(document.body.innerText);
        return { fileInputs, imageUpload: acceptsImage || sectionScopedImage || textMentionsSectionImage };
      });
      return { accessible, sig, ...detail };
    };

    const orig = await readOrgParamState(page, base, ORG, 178);

    await setOrgParam(page, base, ORG, 178, false);
    const off = await snapForm();

    await setOrgParam(page, base, ORG, 178, true);
    const on = await snapForm();

    // restore
    await setOrgParam(page, base, ORG, 178, orig === null ? false : orig);
    await uctx.close();

    return {
      accessible: off.accessible && on.accessible,
      offImageUpload: off.imageUpload,
      onImageUpload: on.imageUpload,
      sigDiffers: off.sig !== on.sig,
      onFileInputs: JSON.stringify(on.fileInputs),
    };
  },

  check(m) {
    return [
      { aspect: 'quote create form reachable by regular user (both states)', migrated: m.accessible, expected: true, ok: m.accessible === true },
      { aspect: '178 OFF → no per-section image upload control', migrated: m.offImageUpload, expected: false, ok: m.offImageUpload === false },
      { aspect: '178 ON → per-section image upload control shown (spec)', migrated: m.onImageUpload, expected: true, ok: m.onImageUpload === true },
      { aspect: '178 ON vs OFF → quote form signature changes', migrated: m.sigDiffers, expected: true, ok: m.sigDiffers === true,
        note: `on-form file inputs: ${m.onFileInputs}` },
    ];
  },
};
