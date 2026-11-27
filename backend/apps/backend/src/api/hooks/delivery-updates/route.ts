import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { timingSafeEqual } from "node:crypto"
import { applyTrackingUpdate, findOrderForUpdate, parseShiprocketTime } from "../../../lib/order-shipping"
import { shiprocketConfig } from "../../../lib/shiprocket"

/**
 * Shiprocket tracking webhook: POST /hooks/delivery-updates
 *
 * Set up in Shiprocket -> Settings -> API -> Webhooks with this URL and the
 * SHIPROCKET_WEBHOOK_TOKEN as the security token (sent as "x-api-key").
 * Shiprocket's rules: the URL must not contain "shiprocket", "kartrocket",
 * "sr" or "kr", and the reply must be HTTP 200.
 */
export const AUTHENTICATE = false

function sameToken(given: string, expected: string) {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const expected = shiprocketConfig().webhookToken
  const given = String(req.headers["x-api-key"] ?? "")
  if (!expected) {
    logger.warn("[shiprocket] Webhook received but SHIPROCKET_WEBHOOK_TOKEN is not set; ignored.")
    return res.status(200).json({ ok: false, reason: "not configured" })
  }
  if (!given || !sameToken(given, expected)) {
    return res.status(401).json({ ok: false })
  }

  const body = (req.body ?? {}) as Record<string, any>
  const status = String(body.current_status ?? body.shipment_status ?? "").trim()
  if (!status) {
    // Shiprocket's "test webhook" call: just say OK.
    return res.status(200).json({ ok: true })
  }

  try {
    const orderId = await findOrderForUpdate(req.scope, {
      channel_order_id: body.order_id,
      sr_order_id: body.sr_order_id,
      awb: body.awb,
    })
    if (!orderId) {
      logger.info(`[shiprocket] Update for an order this shop doesn't know (order ${body.order_id}, AWB ${body.awb}); ignored.`)
      return res.status(200).json({ ok: true, matched: false })
    }
    const scans = Array.isArray(body.scans)
      ? body.scans.map((s: any) => ({
          date: String(s?.date ?? ""),
          activity: String(s?.activity ?? s?.["sr-status-label"] ?? ""),
          location: String(s?.location ?? ""),
        }))
      : []
    await applyTrackingUpdate(req.scope, orderId, {
      status,
      awb: body.awb ? String(body.awb) : null,
      courier: body.courier_name ? String(body.courier_name) : null,
      etd: parseShiprocketTime(body.etd),
      event_at: parseShiprocketTime(body.current_timestamp),
      scans,
    })
    return res.status(200).json({ ok: true, matched: true })
  } catch (err) {
    // Still answer 200 so Shiprocket keeps the webhook switched on; the error is logged.
    logger.error(`[shiprocket] Could not apply webhook update for order ${body.order_id}: ${(err as Error).message}`)
    return res.status(200).json({ ok: false })
  }
}
