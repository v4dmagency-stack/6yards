import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Checkbox, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Fabric = { id: string; name: string }

/**
 * "Fabric" box on the product page in Medusa Admin.
 *
 * - Fabric filter: ticks = the saree's sub-categories of the "Fabric" category,
 *   which is what the website's Fabric filter uses. New fabrics added under
 *   Products -> Categories -> Fabric appear here automatically.
 * - Fabric shown on the product page: the `fabric` metadata text.
 * Other categories and metadata of the product are kept as they are.
 */
const ProductFabricWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [fabrics, setFabrics] = useState<Fabric[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [otherCategoryIds, setOtherCategoryIds] = useState<string[]>([])
  const [metadata, setMetadata] = useState<Record<string, unknown>>({})
  const [fabricText, setFabricText] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch(
          "/admin/product-categories?handle=fabric&fields=id,category_children.id,category_children.name,category_children.rank",
          { credentials: "include" }
        ),
        fetch(`/admin/products/${product.id}?fields=id,metadata,categories.id`, { credentials: "include" }),
      ])
      if (!catRes.ok || !prodRes.ok) {
        throw new Error("Could not load fabrics")
      }
      const parent = (await catRes.json()).product_categories?.[0]
      const children: Fabric[] = (parent?.category_children ?? [])
        .slice()
        .sort((a: { rank?: number }, b: { rank?: number }) => (a.rank ?? 0) - (b.rank ?? 0))
        .map((c: Fabric) => ({ id: c.id, name: c.name }))
      const prod = (await prodRes.json()).product
      const productCategoryIds: string[] = (prod.categories ?? []).map((c: { id: string }) => c.id)
      const fabricIds = new Set(children.map((c) => c.id))

      setFabrics(children)
      setSelected(new Set(productCategoryIds.filter((id) => fabricIds.has(id))))
      setOtherCategoryIds(productCategoryIds.filter((id) => !fabricIds.has(id)))
      setMetadata(prod.metadata ?? {})
      setFabricText(typeof prod.metadata?.fabric === "string" ? prod.metadata.fabric : "")
      setError(parent ? null : "There is no \"Fabric\" category yet (Products -> Categories).")
    } catch (err) {
      setError((err as Error).message)
    }
  }, [product.id])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categories: [...otherCategoryIds, ...selected].map((id) => ({ id })),
          metadata: { ...metadata, fabric: fabricText.trim() },
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.message || "Could not save the fabric")
      }
      toast.success("Fabric saved. The website shows it on the next page load.")
      await load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Fabric</Heading>
      </div>

      <div className="flex flex-col gap-y-4 px-6 py-4">
        {error ? (
          <Text size="small" className="text-ui-fg-subtle">{error}</Text>
        ) : !fabrics ? (
          <Text size="small" className="text-ui-fg-subtle">Loading…</Text>
        ) : (
          <>
            <div className="flex flex-col gap-y-2">
              <Text size="small" weight="plus">Website Fabric filter</Text>
              {fabrics.map((f) => (
                <div key={f.id} className="flex items-center gap-x-2">
                  <Checkbox
                    id={`fabric-${f.id}`}
                    checked={selected.has(f.id)}
                    onCheckedChange={(v) => toggle(f.id, v === true)}
                  />
                  <Label size="small" htmlFor={`fabric-${f.id}`}>{f.name}</Label>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus" htmlFor="fabric-text">Fabric shown on the product page</Label>
              <Input
                id="fabric-text"
                size="small"
                placeholder="e.g. Kanjivaram Silk"
                value={fabricText}
                onChange={(e) => setFabricText(e.target.value)}
              />
            </div>

            <Button size="small" variant="secondary" isLoading={saving} onClick={save}>
              Save fabric
            </Button>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side",
})

export default ProductFabricWidget
