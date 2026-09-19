import db from "./db.server";

export type ProductActivitySource = "app" | "webhook";

interface RecordProductActivityInput {
  shop: string;
  productId: string;
  action: string;
  source: ProductActivitySource;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Writes a row to the app's ProductActivity table.
 *
 * Shopify stays the source of truth for product data — this table only stores
 * application-specific information (what the app changed and which webhook
 * events it observed).
 */
export async function recordProductActivity({
  shop,
  productId,
  action,
  source,
  oldValue,
  newValue,
}: RecordProductActivityInput) {
  return db.productActivity.create({
    data: {
      shop,
      productId,
      action,
      source,
      oldValue: oldValue === undefined ? null : JSON.stringify(oldValue),
      newValue: newValue === undefined ? null : JSON.stringify(newValue),
    },
  });
}
