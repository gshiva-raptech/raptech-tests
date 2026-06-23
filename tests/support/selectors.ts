/**
 * Central selector map. All selectors below are CONFIRMED against the running
 * app (raptech-app Spring Boot on http://localhost:8080) by inspecting the live
 * DOM on 2026-06-21 — not guesses.
 *
 * If the app's markup changes, fix locators HERE only; the specs and page
 * objects read everything from this file.
 */
export const sel = {
  login: {
    // /signIn page (Spring Security formLogin; usernameParameter=username,
    // passwordParameter=password, action=/authenticate).
    username: '#signin-username',
    password: '#signin-password',
    submit: 'button.signin-submit[type="submit"]',
    // Present only once logged in — the left-nav "Items" link on /home.
    loggedInMarker: 'a[href="/items"]',
  },

  itemMaster: {
    // Navigation: Items list -> "New" navigates to /items/new (the New Item form).
    itemsUrl: '/items',
    newItemUrl: '/items/new',
    newItemButton: '#btnNew',

    // New Item form — native <select> / <input> with stable ids.
    entitySelect: '#entityId',          // required; options include "Zoom Business Unit1" etc.
    itemTypeSelect: '#assetOrConsumable', // changing this RELOADS the form and clears Entity
    itemNo: '#itemNo',                  // required
    description: '#description1',        // required
    uom: '#uom',                        // required

    // HSN is hidden until an Entity is selected (the "Finance Related Details" behaviour).
    hsnField: '#hsnSacCode',

    // Scrap Item — a read-only display + a Search button that opens a modal.
    scrapItemInput: '#scrapItemDisplay',
    scrapItemSearchTrigger: '#scrapItemSearchBtn',
    searchPopup: '#scrapItemModal',
    scrapSearchInput: '#scrapItemSearchInput',

    // Save -> on success the app redirects to /items/{numericId}.
    saveButton: '#itemSubmitBtn',
    fieldError: '.field-error',
  },
} as const;
