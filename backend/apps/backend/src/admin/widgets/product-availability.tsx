import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Label, StatusBadge, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Availability = {
  sold_out: boolean
  can_toggle: boolean
  variants: { id: string; title: string; tracked: boolean; available: number; reserved: number }[]
}

/**
 * "Availability" box on the product page in Medusa Admin.
 *
 * Mark as sold out sets the saree's stock to 0; Back in stock sets it to the
 * quantity entered. The website reads this stock on every page load, so it
 * shows "Sold Out" (and blocks Add to bag) as soon as the change is saved.
 */
const ProductAvailabilityWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [state, setState] = useState<Availability | null>(null)
  const [quantity, setQuantity] = useState("1")
  const [saving, setSaving] = useState(false)
  const url = `/admin/products/${product.id}/availability`

  const load = useCallback(async () => {
    const res = await fetch(url, { credentials: "include" })
    if (res.ok) {
      setState(await res.json())
    }
  }, [url])

  useEffect(() => {
    load()
  }, [load])

  const save = async (soldOut: boolean) => {
    const qty = Number(quantity)
    if (!soldOut && (!Number.isInteger(qty) || qty < 1)) {
      toast.error("Enter how many pieces are available (1 or more).")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(soldOut ? { sold_out: true } : { sold_out: false, quantity: qty }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.message || "Could not update availability")
      }
      setState(body)
      toast.success(soldOut ? "Marked as sold out. The website now shows Sold Out." : `Back in stock (${qty} available).`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const available = state?.variants.reduce((sum, v) => sum + v.available, 0) ?? 0
  const reserved = state?.variants.reduce((sum, v) => sum + v.reserved, 0) ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Availability</Heading>
        {state && (
          <StatusBadge color={state.sold_out ? "red" : "green"}>
            {state.sold_out ? "Sold out" : "In stock"}
          </StatusBadge>
        )}
      </div>

      <div className="flex flex-col gap-y-3 px-6 py-4">
        {!state ? (
          <Text size="small" className="text-ui-fg-subtle">Loading…</Text>
        ) : !state.can_toggle ? (
          <Text size="small" className="text-ui-fg-subtle">
            Turn on "Manage inventory" for this product's variant to use Sold out.
          </Text>
        ) : (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              {available} available on the website{reserved ? `, ${reserved} reserved by orders` : ""}.
            </Text>
            {state.sold_out ? (
              <div className="flex items-end gap-x-2">
                <div className="flex flex-col gap-y-1">
                  <Label size="xsmall" htmlFor="availability-qty">Pieces available</Label>
                  <Input
                    id="availability-qty"
                    type="number"
                    min={1}
                    size="small"
                    className="w-24"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <Button size="small" variant="secondary" isLoading={saving} onClick={() => save(false)}>
                  Back in stock
                </Button>
              </div>
            ) : (
              <Button size="small" variant="danger" isLoading={saving} onClick={() => save(true)}>
                Mark as sold out
              </Button>
            )}
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side",
})

export default ProductAvailabilityWidget
