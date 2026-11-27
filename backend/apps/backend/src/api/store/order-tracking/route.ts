import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { refreshTracking, shiprocketInfo, STAGE_LABEL, Stage, trackingLink } from "../../../lib/order-shipping"
import { isShiprocketConfigured } from "../../../lib/shiprocket"

const NOT_FOUND = { found: false, message: "We couldn't find an order with that number and email. Check both and try again." }
const STALE_MS = 30 * 60 * 1000

/**
 * GET /store/order-tracking?order=1001&email=you@example.com
 * The "Track your order" page. Needs both the order number and the email used
 * for the order, and shows no address or phone number.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const displayId = Number(String(req.query.order ?? "").replace(/[^\d]/g, ""))
  const email = String(req.query.email ?? "").trim().toLowerCase()
  if (!displayId || !email) {
    return res.status(400).json({ message: "Enter your order number and email." })
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "status", "created_at", "canceled_at", "metadata", "items.title", "items.product_title", "items.quantity", "fulfillments.shipped_at", "fulfillments.delivered_at", "fulfillments.canceled_at"],
    filters: { display_id: displayId } as any,
  })
  let order = (data as any[]).find((o) => String(o.email ?? "").toLowerCase() === email)
  if (!order) {
    return res.json(NOT_FOUND)
  }

  // Ask Shiprocket again when the last update is old (webhooks can be missed).
  let info = shiprocketInfo(order)
  const stale = !info.updated_at || Date.now() - new Date(info.updated_at).getTime() > STALE_MS
  const open = info.sr_order_id && !["delivered", "cancelled", "returned"].includes(info.stage ?? "")
  if (open && stale && isShiprocketConfigured()) {
    try {
      info = await refreshTracking(req.scope, order.id)
    } catch (err) {
      req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn(`[shiprocket] Tracking refresh for order ${displayId} failed: ${(err as Error).message}`)
    }
  }

  const fulfillments = (order.fulfillments ?? []).filter((f: any) => !f.canceled_at)
  let stage: Stage = info.stage ?? (info.sr_order_id ? "processing" : "not_sent")
  if (order.status === "canceled" || order.canceled_at) stage = "cancelled"
  else if (stage === "not_sent" && fulfillments.some((f: any) => f.delivered_at)) stage = "delivered"
  else if (stage === "not_sent" && fulfillments.some((f: any) => f.shipped_at)) stage = "shipped"

  res.json({
    found: true,
    order: {
      number: order.display_id,
      placed_at: order.created_at,
      items: (order.items ?? []).map((i: any) => ({ title: i.product_title || i.title, quantity: Number(i.quantity) })),
      stage,
      stage_label: STAGE_LABEL[stage],
      courier: info.courier ?? null,
      awb: info.awb ?? null,
      tracking_link: trackingLink(info),
      expected_by: info.etd ?? null,
      updated_at: info.last_event_at ?? info.updated_at ?? null,
      events: [...(info.scans ?? [])].reverse().slice(0, 15),
    },
  })
}
