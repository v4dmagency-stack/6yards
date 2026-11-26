import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/saree-options
 * Choices for the Sarees editor: collections, the category tree, and the
 * fabrics and colours already used (so the client can pick instead of typing).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: collections }, { data: categories }, { data: products }] = await Promise.all([
    query.graph({ entity: "product_collection", fields: ["id", "title"] }),
    query.graph({ entity: "product_category", fields: ["id", "name", "rank", "parent_category_id", "is_active"] }),
    query.graph({ entity: "product", fields: ["material", "metadata"] }),
  ])

  const distinct = (values: unknown[]) => {
    const seen = new Map<string, string>()
    for (const v of values) {
      const name = typeof v === "string" ? v.trim() : ""
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }

  res.json({
    collections: (collections as any[]).map((c) => ({ id: c.id, title: c.title })).sort((a, b) => a.title.localeCompare(b.title)),
    categories: (categories as any[]).map((c) => ({
      id: c.id,
      name: c.name,
      rank: c.rank ?? 0,
      parent_id: c.parent_category_id ?? null,
      is_active: c.is_active !== false,
    })),
    fabrics: distinct((products as any[]).map((p) => p.material)),
    colors: distinct((products as any[]).flatMap((p) => (Array.isArray(p.metadata?.colors) ? p.metadata.colors : []))),
    occasions: ["Wedding", "Festive", "Casual", "Comfort"],
  })
}
