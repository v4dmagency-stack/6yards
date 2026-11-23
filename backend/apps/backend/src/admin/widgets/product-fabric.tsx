import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

/**
 * "Fabric" box on the product page in Medusa Admin.
 *
 * Fabric is its own attribute, separate from categories: it is the product's
 * Material (also shown under Attributes). The website's Fabric filter lists
 * every fabric used by a saree, so typing a new one adds a new filter option.
 * The second field is the longer fabric text shown on the product page
 * (metadata `fabric`). Categories (Fancy, Designer...) are not touched here.
 */
const ProductFabricWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [fabric, setFabric] = useState("")
  const [details, setDetails] = useState("")
  const [metadata, setMetadata] = useState<Record<string, unknown>>({})
  const [known, setKnown] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [prodRes, allRes] = await Promise.all([
      fetch(`/admin/products/${product.id}?fields=id,material,metadata`, { credentials: "include" }),
      fetch("/admin/products?fields=material&limit=1000", { credentials: "include" }),
    ])
    if (prodRes.ok) {
      const prod = (await prodRes.json()).product
      setFabric(prod.material ?? "")
      setMetadata(prod.metadata ?? {})
      setDetails(typeof prod.metadata?.fabric === "string" ? prod.metadata.fabric : "")
    }
    if (allRes.ok) {
      const names = new Map<string, string>()
      for (const p of (await allRes.json()).products ?? []) {
        const name = String(p.material ?? "").trim()
        if (name && !names.has(name.toLowerCase())) {
          names.set(name.toLowerCase(), name)
        }
      }
      setKnown([...names.values()].sort((a, b) => a.localeCompare(b)))
    }
    setLoaded(true)
  }, [product.id])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    // Reuse the existing spelling when the same fabric is typed in another case.
    const typed = fabric.trim()
    const material = known.find((k) => k.toLowerCase() === typed.toLowerCase()) ?? typed
    setSaving(true)
    try {
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          material: material || null,
          metadata: { ...metadata, fabric: details.trim() },
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
        {!loaded ? (
          <Text size="small" className="text-ui-fg-subtle">Loading…</Text>
        ) : (
          <>
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus" htmlFor="fabric-material">Fabric (website filter)</Label>
              <Input
                id="fabric-material"
                size="small"
                list="fabric-material-options"
                placeholder="Choose or type a fabric"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
              />
              <datalist id="fabric-material-options">
                {known.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
              {known.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {known.map((k) => (
                    <button key={k} type="button" onClick={() => setFabric(k)}>
                      <Badge size="2xsmall" color={k.toLowerCase() === fabric.trim().toLowerCase() ? "blue" : "grey"}>{k}</Badge>
                    </button>
                  ))}
                </div>
              )}
              <Text size="xsmall" className="text-ui-fg-subtle">
                Pick one, or type a new fabric to add it to the website filter.
              </Text>
            </div>

            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus" htmlFor="fabric-details">Fabric shown on the product page</Label>
              <Input
                id="fabric-details"
                size="small"
                placeholder="e.g. Pure Mulberry Katan Silk"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
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
