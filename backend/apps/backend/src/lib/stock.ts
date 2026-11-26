import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow, updateInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Saree stock, shared by the Availability box and the Sarees editor.
 *
 * Medusa's inventory is the single source of truth: the website shows a saree
 * as sold out when its available quantity (stocked minus reserved) is 0, and
 * Medusa refuses to add it to a cart. Pieces reserved by placed orders are
 * never touched.
 */

type Level = { location_id: string; stocked_quantity: number; reserved_quantity: number }
export type VariantStock = {
  id: string
  title: string
  manage_inventory: boolean
  inventory_item_id: string | null
  levels: Level[]
}

export async function loadVariantStock(container: MedusaContainer, productId: string): Promise<VariantStock[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "manage_inventory",
      "inventory_items.inventory_item_id",
      "inventory_items.inventory.location_levels.location_id",
      "inventory_items.inventory.location_levels.stocked_quantity",
      "inventory_items.inventory.location_levels.reserved_quantity",
    ],
    filters: { product_id: productId },
  })
  return data.map((v: any) => {
    const link = (v.inventory_items ?? [])[0]
    return {
      id: v.id,
      title: v.title,
      manage_inventory: Boolean(v.manage_inventory),
      inventory_item_id: link?.inventory_item_id ?? null,
      levels: (link?.inventory?.location_levels ?? []).map((l: any) => ({
        location_id: l.location_id,
        stocked_quantity: Number(l.stocked_quantity) || 0,
        reserved_quantity: Number(l.reserved_quantity) || 0,
      })),
    }
  })
}

export function summarizeStock(variants: VariantStock[]) {
  const rows = variants.map((v) => ({
    id: v.id,
    title: v.title,
    manage_inventory: v.manage_inventory,
    tracked: v.manage_inventory && Boolean(v.inventory_item_id),
    available: v.levels.reduce((sum, l) => sum + Math.max(0, l.stocked_quantity - l.reserved_quantity), 0),
    reserved: v.levels.reduce((sum, l) => sum + l.reserved_quantity, 0),
  }))
  const tracked = rows.filter((r) => r.tracked)
  return {
    variants: rows,
    available: tracked.reduce((sum, r) => sum + r.available, 0),
    reserved: tracked.reduce((sum, r) => sum + r.reserved, 0),
    // Variants that don't track inventory can always be bought.
    sold_out: tracked.length > 0 && tracked.length === rows.length && tracked.every((r) => r.available <= 0),
    can_toggle: rows.length > 0 && tracked.length === rows.length,
  }
}

/** The stock location used by the storefront sales channel (fallback: the first one). */
export async function storefrontLocationId(container: MedusaContainer, productId: string): Promise<string | undefined> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["sales_channels.stock_locations.id"],
    filters: { id: productId },
  })
  const fromChannel = (data[0] as any)?.sales_channels?.flatMap((sc: any) => sc?.stock_locations ?? [])?.[0]?.id
  if (fromChannel) {
    return fromChannel
  }
  const { data: locations } = await query.graph({ entity: "stock_location", fields: ["id"] })
  return locations[0]?.id
}

/**
 * Sets how many pieces are available on the website. 0 = sold out (stock at
 * every location drops to what is already reserved); more than 0 = that many
 * available at the storefront location, on top of reserved pieces.
 */
export async function setAvailableStock(container: MedusaContainer, productId: string, available: number) {
  const variants = await loadVariantStock(container, productId)
  if (!variants.length || variants.some((v) => !v.manage_inventory || !v.inventory_item_id)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This saree's stock isn't tracked. Turn on \"Manage inventory\" for its variant first."
    )
  }
  const qty = Math.max(0, Math.floor(available))
  const updates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
  const creates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []

  if (qty === 0) {
    for (const v of variants) {
      for (const l of v.levels) {
        updates.push({ inventory_item_id: v.inventory_item_id!, location_id: l.location_id, stocked_quantity: l.reserved_quantity })
      }
    }
  } else {
    const locationId = await storefrontLocationId(container, productId)
    if (!locationId) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "No stock location exists. Create one in Settings -> Locations.")
    }
    for (const v of variants) {
      const level = v.levels.find((l) => l.location_id === locationId)
      const row = { inventory_item_id: v.inventory_item_id!, location_id: locationId, stocked_quantity: (level?.reserved_quantity ?? 0) + qty }
      ;(level ? updates : creates).push(row)
      // Stock held at other locations would still count as available; clear it.
      for (const other of v.levels.filter((l) => l.location_id !== locationId)) {
        updates.push({ inventory_item_id: v.inventory_item_id!, location_id: other.location_id, stocked_quantity: other.reserved_quantity })
      }
    }
  }

  if (creates.length) {
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: creates } })
  }
  if (updates.length) {
    await updateInventoryLevelsWorkflow(container).run({ input: { updates } })
  }
  return summarizeStock(await loadVariantStock(container, productId))
}
