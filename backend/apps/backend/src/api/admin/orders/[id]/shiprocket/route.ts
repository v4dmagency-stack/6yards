import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  cancelInShiprocket,
  loadOrder,
  paidOnline,
  refreshTracking,
  sendOrderToShiprocket,
  shiprocketInfo,
  STAGE_LABEL,
  trackingLink,
} from "../../../../../lib/order-shipping"
import { isShiprocketConfigured, ShiprocketError } from "../../../../../lib/shiprocket"

async function view(req: MedusaRequest, id: string) {
  const order = await loadOrder(req.scope, id)
  const info = shiprocketInfo(order)
  return {
    configured: isShiprocketConfigured(),
    order: {
      id: order.id,
      display_id: order.display_id,
      total: Number(order.total?.numeric ?? order.total ?? 0),
      canceled: order.status === "canceled" || Boolean(order.canceled_at),
      paid_online: paidOnline(order),
    },
    shiprocket: {
      ...info,
      stage: info.stage ?? (info.sr_order_id ? "processing" : "not_sent"),
      stage_label: STAGE_LABEL[info.stage ?? (info.sr_order_id ? "processing" : "not_sent")],
      tracking_link: trackingLink(info),
    },
  }
}

/** GET /admin/orders/:id/shiprocket — the Shiprocket box on the order page. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json(await view(req, req.params.id))
}

/**
 * POST /admin/orders/:id/shiprocket
 *   { "action": "send", "payment_method": "Prepaid" | "COD" }
 *   { "action": "refresh" }
 *   { "action": "cancel" }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = req.params.id
  const body = (req.body ?? {}) as { action?: string; payment_method?: string }
  try {
    await run(req, id, body)
  } catch (err) {
    if (err instanceof ShiprocketError) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, err.message)
    }
    throw err
  }
  res.json(await view(req, id))
}

async function run(req: MedusaRequest, id: string, body: { action?: string; payment_method?: string }) {
  switch (body.action) {
    case "send": {
      if (body.payment_method !== "Prepaid" && body.payment_method !== "COD") {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Choose "Paid" or "Cash on delivery".')
      }
      await sendOrderToShiprocket(req.scope, id, body.payment_method)
      break
    }
    case "refresh":
      await refreshTracking(req.scope, id)
      break
    case "cancel":
      await cancelInShiprocket(req.scope, id)
      break
    default:
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Unknown action.")
  }
}
