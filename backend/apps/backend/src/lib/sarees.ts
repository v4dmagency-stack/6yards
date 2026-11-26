import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, ProductStatus } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"
import { loadVariantStock, setAvailableStock, summarizeStock, VariantStock } from "./stock"
import { syncSkuFromVariant } from "./sku-sync"

/**
 * The "saree" shape used by the simple Sarees editor in Admin
 * (src/admin/routes/sarees) and the /admin/sarees API.
 *
 * It maps plain fields onto Medusa's product:
 * - title, description, status, material (= fabric), collection, categories, images
 * - the one variant: SKU (= item code) and INR price (= selling price)
 * - inventory: pieces available (0 = sold out)
 * - metadata: everything else the website's product page shows.
 * The handle (web address) is generated once from the name and never shown.
 */

export const CURRENCY = "inr"
const STOREFRONT_CHANNEL = "6 Yards Storefront"
const VARIANT_OPTION = "Drape Specification"
const VARIANT_VALUE = "Standard 6.3m (with Unstitched Blouse Piece)"

// Editor field -> product metadata key (existing keys kept so nothing breaks).
const TEXT_FIELDS = {
  fabric_details: "fabric",
  weave: "weave",
  color_description: "color",
  length: "length",
  blouse_piece: "blouse_piece",
  origin: "origin",
  care: "care",
  occasion: "occasion",
  badge: "tag",
} as const
const LIST_FIELDS = { colors: "colors", details: "details" } as const

export type SareeInput = {
  title?: string
  description?: string
  status?: "published" | "draft"
  images?: string[]
  price?: number
  regular_price?: number | null
  item_code?: string
  stock?: number
  collection_id?: string | null
  category_ids?: string[]
  fabric?: string
  fabric_details?: string
  weave?: string
  color_description?: string
  length?: string
  blouse_piece?: string
  origin?: string
  care?: string
  occasion?: string
  badge?: string
  colors?: string[]
  details?: string[]
  bestseller?: boolean
}

const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "status",
  "material",
  "thumbnail",
  "metadata",
  "collection_id",
  "collection.title",
  "images.url",
  "images.rank",
  "categories.id",
  "categories.name",
  "variants.id",
  "variants.sku",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "updated_at",
]

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v))
const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => text(x).trim()).filter(Boolean) : [])

function inrPrice(variant: any): number | null {
  const price = (variant?.prices ?? []).find((p: any) => p?.currency_code === CURRENCY)
  return price ? Number(price.amount) : null
}

export function toSaree(product: any, stock: ReturnType<typeof summarizeStock> | null) {
  const meta = (product.metadata ?? {}) as Record<string, unknown>
  const variant = (product.variants ?? [])[0]
  const images = [...(product.images ?? [])]
    .sort((a: any, b: any) => (a?.rank ?? 0) - (b?.rank ?? 0))
    .map((img: any) => img?.url)
    .filter(Boolean)
  if (!images.length && product.thumbnail) {
    images.push(product.thumbnail)
  }
  const price = inrPrice(variant)
  const regular = Number(meta.regular_price) || null
  return {
    id: product.id,
    title: text(product.title),
    description: text(product.description),
    status: product.status === ProductStatus.PUBLISHED ? "published" : "draft",
    images,
    price,
    regular_price: regular,
    discount_percent: price && regular && regular > price ? Math.round(((regular - price) / regular) * 100) : 0,
    item_code: text(variant?.sku),
    stock: stock?.available ?? null,
    reserved: stock?.reserved ?? 0,
    stock_tracked: stock?.can_toggle ?? false,
    collection_id: product.collection_id ?? null,
    collection: product.collection?.title ?? null,
    category_ids: (product.categories ?? []).map((c: any) => c.id),
    categories: (product.categories ?? []).map((c: any) => c.name),
    fabric: text(product.material),
    fabric_details: text(meta.fabric),
    weave: text(meta.weave),
    color_description: text(meta.color),
    length: text(meta.length),
    blouse_piece: text(meta.blouse_piece),
    origin: text(meta.origin),
    care: text(meta.care),
    occasion: text(meta.occasion),
    badge: text(meta.tag),
    colors: list(meta.colors),
    details: list(meta.details),
    bestseller: meta.isBestSeller === true || meta.isBestSeller === "true",
    variant_count: (product.variants ?? []).length,
    updated_at: product.updated_at,
  }
}

export async function getSaree(container: MedusaContainer, id: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "product", fields: PRODUCT_FIELDS, filters: { id } })
  if (!data[0]) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "This saree no longer exists.")
  }
  return toSaree(data[0], summarizeStock(await loadVariantStock(container, id)))
}

/** List for the Sarees page: newest first, optional search by name or item code. */
export async function listSarees(container: MedusaContainer, opts: { q?: string; limit: number; offset: number }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data, metadata } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: (opts.q ? { q: opts.q } : {}) as any,
    pagination: { skip: opts.offset, take: opts.limit, order: { created_at: "DESC" } },
  })
  const ids = data.map((p: any) => p.id)
  // Stock for all listed sarees in one query.
  const stockByProduct = new Map<string, VariantStock[]>()
  if (ids.length) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "title",
        "product_id",
        "manage_inventory",
        "inventory_items.inventory_item_id",
        "inventory_items.inventory.location_levels.location_id",
        "inventory_items.inventory.location_levels.stocked_quantity",
        "inventory_items.inventory.location_levels.reserved_quantity",
      ],
      filters: { product_id: ids },
    })
    for (const v of variants as any[]) {
      const link = (v.inventory_items ?? [])[0]
      const row: VariantStock = {
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
      stockByProduct.set(v.product_id, [...(stockByProduct.get(v.product_id) ?? []), row])
    }
  }
  return {
    sarees: data.map((p: any) => toSaree(p, summarizeStock(stockByProduct.get(p.id) ?? []))),
    count: (metadata as any)?.count ?? data.length,
  }
}

/** Metadata patch: empty values remove the key (Medusa merges metadata, "" deletes). */
function metadataPatch(input: SareeInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const [field, key] of Object.entries(TEXT_FIELDS)) {
    const value = (input as Record<string, unknown>)[field]
    if (value !== undefined) {
      patch[key] = text(value).trim() || ""
    }
  }
  for (const [field, key] of Object.entries(LIST_FIELDS)) {
    const value = (input as Record<string, unknown>)[field]
    if (value !== undefined) {
      const items = list(value)
      patch[key] = items.length ? items : ""
    }
  }
  if (input.regular_price !== undefined) {
    patch.regular_price = input.regular_price && input.regular_price > 0 ? Math.round(input.regular_price) : ""
  }
  if (input.bestseller !== undefined) {
    patch.isBestSeller = input.bestseller
  }
  return patch
}

function friendlyError(err: unknown, itemCode?: string): never {
  const message = (err as Error)?.message ?? String(err)
  if (itemCode && /sku/i.test(message) && /(exist|unique|duplicate|already)/i.test(message)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `The item code "${itemCode}" is already used by another saree.`)
  }
  throw err
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "saree"
}

async function uniqueHandle(container: MedusaContainer, title: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const base = slugify(title)
  const { data } = await query.graph({ entity: "product", fields: ["handle"], filters: { handle: { $like: `${base}%` } } as any })
  const taken = new Set((data as any[]).map((p) => p.handle))
  if (!taken.has(base)) {
    return base
  }
  let n = 2
  while (taken.has(`${base}-${n}`)) {
    n++
  }
  return `${base}-${n}`
}

async function setVariantPriceAndSku(container: MedusaContainer, variantId: string, input: SareeInput) {
  const update: Record<string, unknown> = {}
  if (input.price !== undefined) {
    update.prices = [{ amount: Math.round(input.price), currency_code: CURRENCY }]
  }
  if (input.item_code !== undefined) {
    update.sku = input.item_code.trim() || null
  }
  if (!Object.keys(update).length) {
    return
  }
  try {
    await updateProductVariantsWorkflow(container).run({ input: { selector: { id: variantId }, update } as any })
  } catch (err) {
    friendlyError(err, input.item_code)
  }
  if (input.item_code !== undefined) {
    await syncSkuFromVariant(container, variantId)
  }
}

export async function updateSaree(container: MedusaContainer, id: string, input: SareeInput) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "product", fields: ["id", "variants.id"], filters: { id } })
  const product = data[0] as any
  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "This saree no longer exists.")
  }
  if ((product.variants ?? []).length !== 1) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This saree has more than one variant, so it can only be edited on Medusa's own product page."
    )
  }

  const productUpdate: Record<string, unknown> = { id }
  if (input.title !== undefined) productUpdate.title = input.title.trim()
  if (input.description !== undefined) productUpdate.description = input.description.trim()
  if (input.status !== undefined) productUpdate.status = input.status === "published" ? ProductStatus.PUBLISHED : ProductStatus.DRAFT
  if (input.fabric !== undefined) productUpdate.material = input.fabric.trim() || null
  if (input.collection_id !== undefined) productUpdate.collection_id = input.collection_id || null
  if (input.category_ids !== undefined) productUpdate.category_ids = [...new Set(input.category_ids)]
  if (input.images !== undefined) {
    const urls = [...new Set(input.images.filter(Boolean))]
    productUpdate.images = urls.map((url) => ({ url }))
    productUpdate.thumbnail = urls[0] ?? null
  }
  const patch = metadataPatch(input)
  if (Object.keys(patch).length) productUpdate.metadata = patch

  if (Object.keys(productUpdate).length > 1) {
    await updateProductsWorkflow(container).run({ input: { products: [productUpdate] } as any })
  }
  await setVariantPriceAndSku(container, product.variants[0].id, input)
  if (input.stock !== undefined) {
    await setAvailableStock(container, id, input.stock)
  }
  return getSaree(container, id)
}

export async function createSaree(container: MedusaContainer, input: SareeInput) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const title = (input.title ?? "").trim()
  if (!title) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Give the saree a name.")
  }
  if (!input.price || input.price <= 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enter the selling price.")
  }

  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id", "name"] })
  const channel = (channels as any[]).find((c) => c.name === STOREFRONT_CHANNEL) ?? channels[0]
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id", "type"] })
  const profile = (profiles as any[]).find((p) => p.type === "default") ?? profiles[0]
  if (!channel || !profile) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The shop isn't set up yet (no sales channel or shipping profile).")
  }

  const handle = await uniqueHandle(container, title)
  const urls = [...new Set((input.images ?? []).filter(Boolean))]
  const metadata = Object.fromEntries(
    Object.entries({ ...metadataPatch(input), storefront_id: handle, isNew: true }).filter(([, v]) => v !== "")
  )
  const itemCode = input.item_code?.trim() || undefined

  let productId: string
  try {
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [{
          title,
          handle,
          description: input.description?.trim() || undefined,
          status: input.status === "draft" ? ProductStatus.DRAFT : ProductStatus.PUBLISHED,
          material: input.fabric?.trim() || undefined,
          collection_id: input.collection_id || undefined,
          category_ids: input.category_ids?.length ? [...new Set(input.category_ids)] : undefined,
          images: urls.map((url) => ({ url })),
          thumbnail: urls[0],
          shipping_profile_id: profile.id,
          sales_channels: [{ id: channel.id }],
          options: [{ title: VARIANT_OPTION, values: [VARIANT_VALUE] }],
          variants: [{
            title: "Standard Handloom Drape",
            sku: itemCode,
            manage_inventory: true,
            options: { [VARIANT_OPTION]: VARIANT_VALUE },
            prices: [{ amount: Math.round(input.price), currency_code: CURRENCY }],
          }],
          metadata,
        }],
      } as any,
    })
    productId = result[0].id
  } catch (err) {
    friendlyError(err, itemCode)
  }

  await setAvailableStock(container, productId!, input.stock ?? 1)
  return getSaree(container, productId!)
}
