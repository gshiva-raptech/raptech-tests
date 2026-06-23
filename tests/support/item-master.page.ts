import { Page, Locator, expect } from '@playwright/test';
import { sel } from './selectors';

/**
 * Page object for the Item Master "New Item" form (/items/new).
 *
 * Confirmed app behaviours this models:
 *  - HSN (#hsnSacCode) is HIDDEN until an Entity is selected.
 *  - Scrap Item opens a search MODAL (#scrapItemModal), not a plain dropdown.
 *  - Changing Item Type RELOADS the form and CLEARS the Entity, so for creation
 *    the order must be: select Item Type -> select Entity -> fill core fields.
 *  - On a successful save the app redirects to /items/{numericId}.
 */
export class ItemMasterPage {
  constructor(private readonly page: Page) {}

  /** Open the Items list. */
  async open() {
    await this.page.goto(sel.itemMaster.itemsUrl, { waitUntil: 'networkidle' });
  }

  /** Open the New Item form. The list's "New" button is JS-driven; navigating to
   *  the form route directly is the reliable, deterministic path. */
  async newItem() {
    await this.page.goto(sel.itemMaster.newItemUrl, { waitUntil: 'networkidle' });
  }

  hsnField(): Locator {
    return this.page.locator(sel.itemMaster.hsnField).first();
  }

  /** HSN must be hidden before an Entity is chosen. */
  async expectHsnHiddenBeforeEntity() {
    await expect(this.hsnField()).toBeHidden();
  }

  /** After an Entity is chosen, HSN must appear. */
  async expectHsnVisibleAfterEntity() {
    await expect(this.hsnField()).toBeVisible();
  }

  async selectEntity(entity: string) {
    await this.page.selectOption(sel.itemMaster.entitySelect, { label: entity });
  }

  /** Selecting an Item Type reloads the form; wait for it to settle. */
  async selectItemType(itemType: string) {
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      this.page.selectOption(sel.itemMaster.itemTypeSelect, { label: itemType }),
    ]);
  }

  async fillCore(itemNo: string, description: string, uom: string) {
    await this.page.fill(sel.itemMaster.itemNo, itemNo);
    await this.page.fill(sel.itemMaster.description, description);
    await this.page.selectOption(sel.itemMaster.uom, { label: uom });
  }

  /** Scrap Item should open a search popup (modal), not behave like a free dropdown. */
  async expectScrapItemSearchPopup(query: string) {
    await this.page.click(sel.itemMaster.scrapItemSearchTrigger);
    const popup = this.page.locator(sel.itemMaster.searchPopup);
    await expect(popup).toBeVisible();
    if (query) {
      await this.page.fill(sel.itemMaster.scrapSearchInput, query);
    }
    return popup;
  }

  async save() {
    await this.page.click(sel.itemMaster.saveButton);
  }

  /** A successful create redirects from /items/new to /items/{numericId}.
   *  (A validation failure keeps the form on /items/new, so the redirect alone
   *  is a reliable success signal; the form keeps empty .field-error placeholders
   *  in the DOM regardless, so they are not a useful assertion.) */
  async expectSaved() {
    await this.page.waitForURL(/\/items\/\d+(?:[/?#]|$)/, { timeout: 15_000 });
  }
}
