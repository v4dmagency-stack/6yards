import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createPromotionsWorkflow,
  linkProductsToSalesChannelWorkflow,
  updateProductsWorkflow,
  updateShippingOptionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import SEED_DATA from "./products-data.json"

const STOREFRONT_CHANNEL = "6 Yards Storefront"
const FREE_SHIPPING_THRESHOLD = 5000
const DEFAULT_STOCK = Number(process.env.DEFAULT_STOCK_QUANTITY || 5)

/**
 * Makes a 6 Yards database ready to sell. Safe to run any number of times:
 * every step only fills in what is missing.
 *
 *   npx medusa exec ./src/scripts/prepare-store.ts
 *
 * 1. Store uses INR as its default currency and the storefront sales channel.
 * 2. Every product is in the "6 Yards Storefront" sales channel.
 * 3. Every product has `metadata.storefront_id` (matches js/products.js ids).
 * 4. Every inventory item has stock at the warehouse (DEFAULT_STOCK_QUANTITY,
 *    default 5) so variants can be added to carts. Adjust real stock in
 *    Admin -> Inventory afterwards.
 * 5. Shipping options are free for orders of INR 5,000 or more.
 * 6. The WELCOME10 promotion (10% off) advertised on the site exists.
 */
export default async function prepareStore({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // 1. Store currency + default sales channel
  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: STOREFRONT_CHANNEL },
  })
  const salesChannel = channels[0]
  if (!salesChannel) {
    throw new Error(`Sales channel "${STOREFRONT_CHANNEL}" not found. Run seed-6yards.ts first.`)
  }

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_sales_channel_id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  })
  for (const store of stores) {
    const currencies = (store.supported_currencies ?? []) as { currency_code: string; is_default?: boolean }[]
    const inrIsDefault = currencies.some((c) => c.currency_code === "inr" && c.is_default)
    if (inrIsDefault && store.default_sales_channel_id === salesChannel.id && store.name === "6 Yards Sarees") {
      continue
    }
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          name: "6 Yards Sarees",
          default_sales_channel_id: salesChannel.id,
          supported_currencies: [
            { currency_code: "inr", is_default: true },
            ...currencies
              .filter((c) => c.currency_code !== "inr")
              .map((c) => ({ currency_code: c.currency_code, is_default: false })),
          ],
        },
      },
    })
    logger.info(`Store "${store.name}" now defaults to INR and the storefront sales channel.`)
  }

  // 2 + 3. Sales channel links and storefront ids
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "metadata", "sales_channels.id"],
  })

  const unlinked = products
    .filter((p) => !(p.sales_channels ?? []).some((sc) => sc?.id === salesChannel.id))
    .map((p) => p.id)
  if (unlinked.length) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: { id: salesChannel.id, add: unlinked },
    })
    logger.info(`Linked ${unlinked.length} products to "${STOREFRONT_CHANNEL}".`)
  }

  const catalog = SEED_DATA.products
  const metadataUpdates = products.flatMap((p) => {
    const metadata = (p.metadata ?? {}) as Record<string, unknown>
    if (metadata.storefront_id) {
      return []
    }
    const match =
      catalog.find((c) => c.id === p.handle) ||
      catalog.find((c) => c.name.toLowerCase() === p.title.toLowerCase())
    if (!match) {
      return []
    }
    return [{
      id: p.id,
      metadata: {
        ...metadata,
        storefront_id: match.id,
        occasion: metadata.occasion ?? match.occasion,
        thumbnail: metadata.thumbnail ?? match.thumbnail,
        prod_code: metadata.prod_code ?? match.prod_code,
        originalPrice: metadata.originalPrice ?? match.originalPrice,
        tag: metadata.tag ?? match.tag,
        color: metadata.color ?? match.color,
        fabric: metadata.fabric ?? match.fabric,
        weave: metadata.weave ?? match.weave,
        length: metadata.length ?? match.length,
        origin: metadata.origin ?? match.origin,
        details: metadata.details ?? match.details,
      },
    }]
  })
  if (metadataUpdates.length) {
    await updateProductsWorkflow(container).run({
      input: { products: metadataUpdates },
    })
    logger.info(`Added storefront metadata to ${metadataUpdates.length} products.`)
  }

  // 3b. Root-relative image paths, so images also load inside Medusa Admin (/app)
  const toSitePath = (url: string) => (/^(https?:)?\/\//.test(url) || url.startsWith("/") ? url : `/${url}`)
  const { data: imageRows } = await query.graph({
    entity: "product",
    fields: ["id", "thumbnail", "images.url"],
  })
  const imageUpdates = imageRows.flatMap((p) => {
    const urls = (p.images ?? []).map((img) => img?.url).filter((u): u is string => Boolean(u))
    const needsFix = urls.some((u) => toSitePath(u) !== u) || (p.thumbnail && toSitePath(p.thumbnail) !== p.thumbnail)
    if (!needsFix) {
      return []
    }
    return [{
      id: p.id,
      thumbnail: p.thumbnail ? toSitePath(p.thumbnail) : p.thumbnail,
      images: urls.map((url) => ({ url: toSitePath(url) })),
    }]
  })
  if (imageUpdates.length) {
    await updateProductsWorkflow(container).run({
      input: { products: imageUpdates },
    })
    logger.info(`Made image paths root-relative on ${imageUpdates.length} products.`)
  }

  // 4. Inventory levels
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "sales_channels.id"],
  })
  const location =
    locations.find((l) => (l.sales_channels ?? []).some((sc) => sc?.id === salesChannel.id)) ?? locations[0]
  if (!location) {
    throw new Error("No stock location found. Run seed-6yards.ts first.")
  }

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.location_id"],
  })
  const missingLevels = inventoryItems
    .filter((item) => !(item.location_levels ?? []).some((lvl) => lvl?.location_id === location.id))
    .map((item) => ({
      inventory_item_id: item.id,
      location_id: location.id,
      stocked_quantity: DEFAULT_STOCK,
    }))
  if (missingLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: missingLevels },
    })
    logger.info(`Stocked ${missingLevels.length} inventory items at "${location.name}" (qty ${DEFAULT_STOCK} each).`)
  }

  // 5. Free shipping over the threshold
  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "prices.id", "prices.amount", "prices.currency_code", "prices.price_rules.attribute"],
  })
  for (const option of shippingOptions) {
    // `prices` comes through the shipping option <-> price set link, which the
    // generated entity types don't include.
    const prices = ((option as unknown as { prices?: unknown[] }).prices ?? []) as {
      id: string
      amount: number
      currency_code: string
      price_rules?: { attribute: string }[]
    }[]
    const hasThresholdRule = prices.some((p) => (p.price_rules ?? []).some((r) => r.attribute === "item_total"))
    const base = prices.find((p) => p.currency_code === "inr" && !(p.price_rules ?? []).length)
    // Only standard delivery becomes free; express stays a paid upgrade.
    if (hasThresholdRule || !base || /express/i.test(option.name)) {
      continue
    }
    await updateShippingOptionsWorkflow(container).run({
      input: [{
        id: option.id,
        prices: [
          ...prices.map((p) => ({ id: p.id, amount: p.amount })),
          {
            currency_code: "inr",
            amount: 0,
            rules: [{ attribute: "item_total", operator: "gte", value: FREE_SHIPPING_THRESHOLD }],
          },
        ],
      }],
    })
    logger.info(`Shipping option "${option.name}" is now free from INR ${FREE_SHIPPING_THRESHOLD}.`)
  }

  // 6. WELCOME10 promotion
  const { data: promotions } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
    filters: { code: "WELCOME10" },
  })
  if (!promotions.length) {
    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [{
          code: "WELCOME10",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "order",
            allocation: "across",
            value: 10,
            currency_code: "inr",
          },
        }],
      },
    })
    logger.info("Created the WELCOME10 promotion (10% off the order).")
  }

  logger.info("6 Yards store is ready to sell.")
}
