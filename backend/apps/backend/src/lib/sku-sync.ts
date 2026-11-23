import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateInventoryItemsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Item code = SKU. Medusa keeps a SKU on the product variant (Products ->
 * saree -> Variants) and a separate one on its inventory item (Inventory).
 * These helpers copy an edit from one to the other, so the item code can be
 * changed in either place. The website shows the variant SKU.
 *
 * Each helper only writes when the two differ, so the update events they cause
 * don't bounce back and forth.
 */

const clean = (sku: unknown) => (typeof sku === "string" ? sku.trim() : "")

/** Inventory item SKU -> its product variant(s). */
export async function syncSkuFromInventoryItem(container: MedusaContainer, inventoryItemId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "variants.id", "variants.sku"],
    filters: { id: inventoryItemId },
  })
  const item = data[0] as { sku?: string | null; variants?: { id: string; sku?: string | null }[] } | undefined
  const sku = clean(item?.sku)
  if (!item || !sku) {
    return 0
  }
  let changed = 0
  for (const variant of item.variants ?? []) {
    if (variant?.id && clean(variant.sku) !== sku) {
      await updateProductVariantsWorkflow(container).run({ input: { selector: { id: variant.id }, update: { sku } } })
      changed++
    }
  }
  return changed
}

/** Product variant SKU -> its inventory item(s). */
export async function syncSkuFromVariant(container: MedusaContainer, variantId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "inventory_items.inventory.id", "inventory_items.inventory.sku"],
    filters: { id: variantId },
  })
  const variant = data[0] as
    | { sku?: string | null; inventory_items?: { inventory?: { id: string; sku?: string | null } }[] }
    | undefined
  const sku = clean(variant?.sku)
  if (!variant || !sku) {
    return 0
  }
  const updates = (variant.inventory_items ?? [])
    .map((link) => link?.inventory)
    .filter((inv): inv is { id: string; sku?: string | null } => Boolean(inv?.id) && clean(inv?.sku) !== sku)
    .map((inv) => ({ id: inv.id, sku }))
  if (updates.length) {
    await updateInventoryItemsWorkflow(container).run({ input: { updates } })
  }
  return updates.length
}
