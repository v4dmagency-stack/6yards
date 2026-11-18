import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Checkbox, Container, Heading, Label, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Category = { id: string; name: string; handle: string; rank?: number }

/**
 * "Fabric" box on the product page in Medusa Admin.
 *
 * Lists the sub-categories of the "Fabric" category (the options of the
 * website's Fabric filter). Ticking/unticking and saving moves the saree
 * between fabrics; its other categories are kept. Optionally the "Fabric"
 * line shown on the product page (metadata `fabric`) is updated too.
 */
const ProductFabricWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [fabrics, setFabrics] = useState<Category[] | null>(null)
  const [otherCategoryIds, setOtherCategoryIds] = useState<string[]>([])
  const [initial, setInitial] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [currentText, setCurrentText] = useState("")
  const [updateText, setUpdateText] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const parentRes = await fetch("/admin/product-categories?handle=fabric&fields=id", { credentials: "include" })
      const parentId = (await parentRes.json()).product_categories?.[0]?.id
      if (!parentId) {
        setError('No "Fabric" category exists yet. Create it in Products -> Categories.')
        return
      }
      const [childrenRes, productRes] = await Promise.all([
        fetch(`/admin/product-categories?parent_category_id=${parentId}&fields=id,name,handle,rank&limit=100`, { credentials: "include" }),
        fetch(`/admin/products/${product.id}?fields=categories.id,metadata`, { credentials: "include" }),
      ])
      const children: Category[] = ((await childrenRes.json()).product_categories ?? [])
        .sort((a: Category, b: Category) => (a.rank ?? 0) - (b.rank ?? 0))
      const p = (await productRes.json()).product
      const productCategoryIds: string[] = (p?.categories ?? []).map((c: { id: string }) => c.id)
      const fabricIds = new Set(children.map((c) => c.id))
      const current = productCategoryIds.filter((id) => fabricIds.has(id))

      setFabrics(children)
      setOtherCategoryIds(productCategoryIds.filter((id) => !fabricIds.has(id)))
      setInitial(current)
      setSelected(current)
      setCurrentText(String(p?.metadata?.fabric ?? ""))
    } catch {
      setError("Could not load fabrics.")
    }
  }, [product.id])

  useEffect(() => {
    load()
  }, [load])

  const changed = useMemo(
    () => selected.length !== initial.length || selected.some((id) => !initial.includes(id)),
    [selected, initial]
  )
  const selectedNames = (fabrics ?? []).filter((f) => selected.includes(f.id)).map((f) => f.name)
  // "Cotton Sarees" -> "Cotton" for the product page's Fabric line.
  const newText = selectedNames.map((n) => n.replace(/\s+Sarees?$/i, "")).join(" & ")
  const textChange = updateText && Boolean(newText) && newText !== currentText

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)))

  const save = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        categories: [...otherCategoryIds, ...selected].map((id) => ({ id })),
      }
      if (textChange) {
        body.metadata = { fabric: newText }
      }
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error((await res.json())?.message || "Could not save the fabric")
      }
      toast.success(selectedNames.length ? `Fabric saved: ${selectedNames.join(", ")}. The website shows it on the next page load.` : "Removed from all fabrics.")
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
        <Text size="small" className="text-ui-fg-subtle">
          Which Fabric filter options this saree appears under on the website.
        </Text>
      </div>

      <div className="flex flex-col gap-y-3 px-6 py-4">
        {error ? (
          <Text size="small" className="text-ui-fg-subtle">{error}</Text>
        ) : !fabrics ? (
          <Text size="small" className="text-ui-fg-subtle">Loading…</Text>
        ) : (
          <>
            {fabrics.map((f) => (
              <div key={f.id} className="flex items-center gap-x-2">
                <Checkbox
                  id={`fabric-${f.id}`}
                  checked={selected.includes(f.id)}
                  onCheckedChange={(v) => toggle(f.id, v === true)}
                />
                <Label size="small" htmlFor={`fabric-${f.id}`}>{f.name}</Label>
              </div>
            ))}

            <div className="flex items-start gap-x-2 border-t pt-3">
              <Checkbox
                id="fabric-update-text"
                checked={updateText}
                onCheckedChange={(v) => setUpdateText(v === true)}
              />
              <Label size="xsmall" htmlFor="fabric-update-text" className="text-ui-fg-subtle">
                Also update the "Fabric" line on the product page
                {currentText ? ` (now: "${currentText}")` : ""}
                {updateText && newText ? ` to "${newText}"` : ""}
              </Label>
            </div>

            <div className="flex justify-end">
              <Button size="small" variant="primary" isLoading={saving} disabled={!changed && !textChange} onClick={save}>
                Save fabric
              </Button>
            </div>
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
