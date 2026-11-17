import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"
import { AvailabilityBody } from "./validators"

/**
 * Sold out / back in stock for one saree (used by the "Availability" widget
 * on the product page in Medusa Admin).
 *
 * Stock in Medusa's inventory is the single source of truth: the storefront
 * shows a saree as sold out when its available quantity is 0, and Medusa
 * itself refuses to add it to a cart. This route only sets those quantities.
 *
 *   GET  /admin/products/:id/availability
 *   POST /admin/products/:id/availability  { sold_out: true }
 *   POST /admin/products/:id/availability  { sold_out: false, quantity: 1 }
 */

type Level = { id: string; location_id: string; stocked_quantity: number; reserved_quantity: number }
type VariantStock = {
  id: string
  title: string
  manage_inventory: boolean
  inventory_item_id: string | null
  levels: Level[]
}

async function loadVariants(req: MedusaRequest, productId: string): Promise<VariantStock[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "manage_inventory",
      "inventory_items.inventory_item_id",
      "inventory_items.inventory.location_levels.id",
      "inventory_items.inventory.location_levels.location_id",
      "inventory_items.inventory.location_levels.stocked_quantity",
      "inventory_items.inventory.location_levels.reserved_quantity",
    ],
    filters: { product_id: productId },
  })
  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Product ${productId} has no variants`)
  }
  return data.map((v: any) => {
    const link = (v.inventory_items ?? [])[0]
    return {
      id: v.id,
      title: v.title,
      manage_inventory: Boolean(v.manage_inventory),
      inventory_item_id: link?.inventory_item_id ?? null,
      levels: (link?.inventory?.location_levels ?? []).map((l: any) => ({
        id: l.id,
        location_id: l.location_id,
        stocked_quantity: Number(l.stocked_quantity) || 0,
        reserved_quantity: Number(l.reserved_quantity) || 0,
      })),
    }
  })
}

function summarize(variants: VariantStock[]) {
  const rows = variants.map((v) => {
    const available = v.levels.reduce((sum, l) => sum + Math.max(0, l.stocked_quantity - l.reserved_quantity), 0)
    return {
      id: v.id,
      title: v.title,
      manage_inventory: v.manage_inventory,
      tracked: v.manage_inventory && Boolean(v.inventory_item_id),
      available,
      reserved: v.levels.reduce((sum, l) => sum + l.reserved_quantity, 0),
    }
  })
  const tracked = rows.filter((r) => r.tracked)
  return {
    variants: rows,
    // Variants that don't track inventory can always be bought.
    sold_out: tracked.length > 0 && tracked.length === rows.length && tracked.every((r) => r.available <= 0),
    can_toggle: tracked.length === rows.length,
  }
}

/** The stock location used by the storefront sales channel (fallback: the first one). */
async function storefrontLocationId(req: MedusaRequest, productId: string): Promise<string | undefined> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
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

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const variants = await loadVariants(req, req.params.id)
  res.json(summarize(variants))
}

export async function POST(req: MedusaRequest<AvailabilityBody>, res: MedusaResponse) {
  const { sold_out, quantity = 1 } = req.validatedBody
  const productId = req.params.id
  const variants = await loadVariants(req, productId)

  const untracked = variants.filter((v) => !v.manage_inventory || !v.inventory_item_id)
  if (untracked.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Turn on \"Manage inventory\" for every variant of this product (Edit variant) before using Sold out."
    )
  }

  const updates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
  const creates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []

  if (sold_out) {
    // Nothing left to sell anywhere. Pieces already reserved by placed orders stay reserved.
    for (const v of variants) {
      for (const l of v.levels) {
        updates.push({ inventory_item_id: v.inventory_item_id!, location_id: l.location_id, stocked_quantity: l.reserved_quantity })
      }
    }
  } else {
    const locationId = await storefrontLocationId(req, productId)
    if (!locationId) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "No stock location exists. Create one in Settings -> Locations.")
    }
    for (const v of variants) {
      const level = v.levels.find((l) => l.location_id === locationId)
      const row = { inventory_item_id: v.inventory_item_id!, location_id: locationId, stocked_quantity: (level?.reserved_quantity ?? 0) + quantity }
      ;(level ? updates : creates).push(row)
    }
  }

  if (creates.length) {
    await createInventoryLevelsWorkflow(req.scope).run({ input: { inventory_levels: creates } })
  }
  if (updates.length) {
    await updateInventoryLevelsWorkflow(req.scope).run({ input: { updates } })
  }

  res.json(summarize(await loadVariants(req, productId)))
}
