import { test } from '@playwright/test';
import { LoginPage } from './support/login.page';
import { ItemMasterPage } from './support/item-master.page';
import {
  ENTITY,
  UOM,
  SCRAP_ITEM_QUERY,
  ITEM_NO_PREFIX,
  ITEM_TYPES,
} from '../test-data/item-master';

const USER = process.env.RAPTECH_USER ?? '';
const PASSWORD = process.env.RAPTECH_PASSWORD ?? '';

// One unique token per run so Item No values don't collide across runs.
const RUN = Date.now().toString().slice(-8);

test.beforeEach(async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(USER, PASSWORD);
});

test.describe('Item Master - New Item', () => {
  test('HSN hidden until Entity selected; Scrap Item uses a search popup', async ({ page }) => {
    const im = new ItemMasterPage(page);
    await im.open();
    await im.newItem();

    // Behavior #1: HSN hidden before an Entity is chosen...
    await im.expectHsnHiddenBeforeEntity();
    await im.selectEntity(ENTITY);
    // ...and shown after.
    await im.expectHsnVisibleAfterEntity();

    // Behavior #2: Scrap Item opens a search popup (modal), not a plain dropdown.
    await im.expectScrapItemSearchPopup(SCRAP_ITEM_QUERY);
  });

  // Parameterized creation across every item type.
  ITEM_TYPES.forEach((tc, i) => {
    test(`create item - type: ${tc.itemType}`, async ({ page }) => {
      const im = new ItemMasterPage(page);
      await im.open();
      await im.newItem();

      // Item Type first (it reloads the form and clears Entity), then Entity, then core fields.
      await im.selectItemType(tc.itemType);
      await im.selectEntity(ENTITY);

      const itemNo = `${ITEM_NO_PREFIX}-${RUN}-${i}`;
      await im.fillCore(itemNo, `${itemNo} (${tc.itemType})`, UOM);

      await im.save();
      await im.expectSaved();
    });
  });
});
