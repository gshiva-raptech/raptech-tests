/**
 * Test data for Item Master — values confirmed against the live app (2026-06-21).
 *
 * The New Item form requires only four fields for every item type (verified
 * across all 15 types): Entity, Item No, Description, UOM. So creation is
 * parameterised purely over the Item Type label.
 */
export interface ItemTypeCase {
  itemType: string; // exact label shown in the Item Type (#assetOrConsumable) dropdown
}

export const ENTITY = 'Zoom Business Unit1'; // option in the Entity (#entityId) select
export const UOM = 'EA';                      // option in the UOM (#uom) select
export const SCRAP_ITEM_QUERY = 'AUTOTEST';   // typed into the Scrap Item search modal

// Unique-ish prefix so re-runs don't collide on Item No (the run timestamp is
// appended per-test in the spec).
export const ITEM_NO_PREFIX = 'AUTOTEST';

// Every Item Type offered by the form. Each creates a real item using the four
// core fields. Trim this list if you don't want a row per type on each run.
export const ITEM_TYPES: ItemTypeCase[] = [
  { itemType: 'Asset - Movable Item' },
  { itemType: 'Asset - Immovable Item' },
  { itemType: 'Asset - IT Item' },
  { itemType: 'Consumable Item' },
  { itemType: 'Service Item' },
  { itemType: 'Trading/Finished Goods Item' },
  { itemType: 'Trading Item - Batch' },
  { itemType: 'Expense Item' },
  { itemType: 'Trading Item - Serial No. Split' },
  { itemType: 'Trading Item - Serial No.' },
  { itemType: 'Resource' },
  { itemType: 'Travel Item' },
  { itemType: 'Raw Material Item' },
  { itemType: 'Trading/Semi Finished Goods Item' },
  { itemType: 'Scrap Item' },
];
