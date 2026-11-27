// Orders <-> Shiprocket.
//
// - sendOrderToShiprocket: creates the order in Shiprocket (Custom channel) and
//   records the result on the Medusa order (metadata.shiprocket).
// - applyTrackingUpdate: stores a tracking update (webhook or manual refresh)
//   and moves the Medusa order along: shipped -> fulfilment + shipment,
//   delivered -> marked delivered.
// Everything is recorded on the order so the Shiprocket box on the order page
// in Admin always shows what happened (including errors) and can retry.

import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createOrderFulfillmentWorkflow,
  createOrderShipmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  cancelShiprocketOrders,
  createShiprocketOrder,
  isShiprocketConfigured,
  pickupLocation,
  shiprocketConfig,
  ShiprocketError,
  TrackingSnapshot,
  trackByAwb,
  trackByShipment,
} from "./shiprocket"

export type PaymentMethod = "Prepaid" | "COD"

export type Stage =
  | "not_sent"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "issue"
  | "delivered"
  | "cancelled"
  | "returned"

export type ShiprocketScan = { date: string; activity: string; location: string }

export type ShiprocketInfo = {
  channel_order_id?: string
  sr_order_id?: number
  shipment_id?: number | null
  awb?: string | null
  courier?: string | null
  status?: string
  stage?: Stage
  etd?: string | null
  track_url?: string | null
  payment_method?: PaymentMethod
  cod_amount?: number
  sent_at?: string
  last_event_at?: string
  updated_at?: string
  scans?: ShiprocketScan[]
  attempts?: number
  error?: string | null
  error_at?: string | null
  fulfillment_note?: string | null
  cancelled_ids?: number[]
}

const STAGE_RANK: Record<Stage, number> = {
  not_sent: 0,
  processing: 1,
  shipped: 2,
  issue: 3,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: 5,
  returned: 5,
}

/** Shiprocket status text -> stage. Matched by words (status ids are not relied on). */
export function stageFromStatus(status: string | null | undefined): Stage {
  const t = String(status ?? "").toUpperCase()
  if (!t) return "processing"
  if (/\bRTO\b|RETURN/.test(t)) return "returned"
  if (/CANCEL/.test(t)) return "cancelled"
  if (/UNDELIVERED|NOT DELIVERED|\bNDR\b|FAILED|LOST|DAMAGE|DESTROYED|MISROUTED/.test(t)) return "issue"
  if (/DELIVERED/.test(t)) return "delivered"
  if (/OUT FOR DELIVERY/.test(t)) return "out_for_delivery"
  if (/PICKED|SHIPPED|TRANSIT|REACHED|HUB|DESTINATION|DISPATCH|CONNECTED/.test(t)) return "shipped"
  return "processing"
}

export const STAGE_LABEL: Record<Stage, string> = {
  not_sent: "Order received",
  processing: "Packed, waiting for the courier",
  shipped: "On the way",
  out_for_delivery: "Out for delivery",
  issue: "Delivery delayed",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned to us",
}

export function trackingLink(info: ShiprocketInfo | undefined) {
  if (!info?.awb) return null
  return info.track_url || `https://shiprocket.co/tracking/${encodeURIComponent(info.awb)}`
}

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "status",
  "created_at",
  "canceled_at",
  "currency_code",
  "total",
  "shipping_total",
  "metadata",
  "items.id",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "items.requires_shipping",
  "items.detail.fulfilled_quantity",
  "shipping_address.*",
  "billing_address.*",
  "fulfillments.id",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.amount",
]

export async function loadOrder(container: MedusaContainer, id: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id } })
  if (!data[0]) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "This order no longer exists.")
  }
  return data[0] as any
}

export function shiprocketInfo(order: any): ShiprocketInfo {
  const info = (order?.metadata ?? {}).shiprocket
  return info && typeof info === "object" ? (info as ShiprocketInfo) : {}
}

/** Saves metadata.shiprocket on the order, keeping every other metadata key. */
async function saveInfo(container: MedusaContainer, orderId: string, patch: Partial<ShiprocketInfo>) {
  const order = await loadOrder(container, orderId)
  const metadata = { ...(order.metadata ?? {}) }
  const next: ShiprocketInfo = { ...shiprocketInfo(order), ...patch, updated_at: new Date().toISOString() }
  metadata.shiprocket = next
  const orderModule = container.resolve(Modules.ORDER) as any
  await orderModule.updateOrders([{ id: orderId, metadata }])
  return next
}

/** Paid online (Razorpay etc.), not the manual "pay on confirmation" method. */
export function paidOnline(order: any) {
  return (order.payment_collections ?? []).some((pc: any) =>
    (pc?.payments ?? []).some((p: any) => p?.captured_at && p?.provider_id && !String(p.provider_id).includes("system_default"))
  )
}

const num = (v: unknown) => {
  const n = Number((v as any)?.numeric ?? v)
  return Number.isFinite(n) ? n : 0
}
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "")
const phone10 = (v: unknown) => {
  const d = digits(v)
  return d.length > 10 ? d.slice(-10) : d
}

function shiprocketDate(date: Date) {
  // Shiprocket wants "YYYY-MM-DD HH:mm"; use India time.
  const ist = new Date(date.getTime() + 330 * 60 * 1000)
  return ist.toISOString().slice(0, 16).replace("T", " ")
}

export function buildShiprocketPayload(order: any, paymentMethod: PaymentMethod, channelOrderId: string, pickupName: string) {
  const c = shiprocketConfig()
  const ship = order.shipping_address ?? {}
  const bill = order.billing_address && order.billing_address.address_1 ? order.billing_address : ship
  const problems: string[] = []
  if (!ship.first_name) problems.push("the customer's name")
  if (!ship.address_1) problems.push("the street address")
  if (!ship.city) problems.push("the city")
  if (!ship.province) problems.push("the state")
  if (!/^[1-9]\d{5}$/.test(digits(ship.postal_code))) problems.push("a 6-digit PIN code")
  if (phone10(ship.phone).length !== 10) problems.push("a 10-digit phone number")
  if (problems.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `The delivery address is missing ${problems.join(", ")}. Fix it on the order (Shipping address -> Edit), then send again.`
    )
  }

  const items = (order.items ?? []).filter((i: any) => i.requires_shipping !== false && num(i.quantity) > 0)
  if (!items.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "This order has nothing to ship.")
  }
  const units = items.reduce((s: number, i: any) => s + num(i.quantity), 0)
  const total = Math.round(num(order.total))
  const shipping = Math.round(num(order.shipping_total))
  // sub_total = what the items cost after discounts (Shiprocket adds shipping on top).
  const subTotal = Math.max(0, total - shipping)

  const name = (a: any) => ({ first: String(a.first_name ?? "").trim(), last: String(a.last_name ?? "").trim() })
  const b = name(bill)
  const s = name(ship)
  const sameAddress =
    bill === ship ||
    (digits(bill.postal_code) === digits(ship.postal_code) && String(bill.address_1 ?? "").trim() === String(ship.address_1 ?? "").trim())

  const payload: Record<string, unknown> = {
    order_id: channelOrderId,
    order_date: shiprocketDate(new Date(order.created_at)),
    pickup_location: pickupName,
    billing_customer_name: b.first || s.first,
    billing_last_name: b.last || s.last,
    billing_address: String(bill.address_1 ?? ship.address_1).trim(),
    billing_address_2: String(bill.address_2 ?? "").trim(),
    billing_city: String(bill.city ?? ship.city).trim().slice(0, 30),
    billing_pincode: Number(digits(bill.postal_code) || digits(ship.postal_code)),
    billing_state: String(bill.province ?? ship.province).trim(),
    billing_country: "India",
    billing_email: order.email,
    billing_phone: Number(phone10(bill.phone) || phone10(ship.phone)),
    shipping_is_billing: sameAddress,
    order_items: items.map((i: any) => ({
      name: [i.product_title || i.title, i.variant_title && !/standard/i.test(i.variant_title) ? i.variant_title : ""]
        .filter(Boolean)
        .join(" - ")
        .slice(0, 200),
      sku: String(i.variant_sku || i.id),
      units: num(i.quantity),
      selling_price: Math.round(num(i.unit_price)),
    })),
    payment_method: paymentMethod,
    shipping_charges: shipping,
    sub_total: subTotal,
    length: c.sizeCm.length,
    breadth: c.sizeCm.breadth,
    height: Math.round(c.sizeCm.height * units * 10) / 10,
    weight: Math.round(c.weightKg * units * 100) / 100,
  }
  if (!sameAddress) {
    Object.assign(payload, {
      shipping_customer_name: s.first,
      shipping_last_name: s.last,
      shipping_address: String(ship.address_1).trim(),
      shipping_address_2: String(ship.address_2 ?? "").trim(),
      shipping_city: String(ship.city).trim().slice(0, 30),
      shipping_pincode: Number(digits(ship.postal_code)),
      shipping_state: String(ship.province).trim(),
      shipping_country: "India",
      shipping_email: order.email,
      shipping_phone: Number(phone10(ship.phone)),
    })
  }
  return { payload, codAmount: subTotal + shipping }
}

const sending = new Set<string>()

/**
 * Creates the order in Shiprocket. Safe to call twice: an order that is
 * already in Shiprocket (and not cancelled there) is not sent again.
 */
export async function sendOrderToShiprocket(
  container: MedusaContainer,
  orderId: string,
  paymentMethod: PaymentMethod
): Promise<ShiprocketInfo> {
  if (!isShiprocketConfigured()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Shiprocket is not connected yet. Add the SHIPROCKET_ settings in Vercel (see docs/SHIPROCKET.md)."
    )
  }
  if (sending.has(orderId)) {
    throw new MedusaError(MedusaError.Types.CONFLICT, "This order is already being sent to Shiprocket.")
  }
  sending.add(orderId)
  try {
    const order = await loadOrder(container, orderId)
    if (order.status === "canceled" || order.canceled_at) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This order is cancelled, so it can't be sent to Shiprocket.")
    }
    const info = shiprocketInfo(order)
    if (info.sr_order_id && info.stage !== "cancelled") {
      return info
    }
    // Shiprocket never reuses an order number, even after a cancellation.
    const attempt = (info.cancelled_ids?.length ?? 0) + 1
    const channelOrderId = attempt > 1 ? `${order.display_id}-${attempt}` : String(order.display_id)
    let built: ReturnType<typeof buildShiprocketPayload>
    try {
      const pickup = await pickupLocation()
      if (!pickup) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          shiprocketConfig().pickupLocation
            ? `Shiprocket has no pickup location called "${shiprocketConfig().pickupLocation}". Check SHIPROCKET_PICKUP_LOCATION.`
            : "Add a pickup address in Shiprocket (Settings -> Pickup Addresses) first."
        )
      }
      built = buildShiprocketPayload(order, paymentMethod, channelOrderId, pickup.name)
    } catch (err) {
      await saveInfo(container, orderId, { error: (err as Error).message, error_at: new Date().toISOString() })
      throw err
    }
    try {
      const created = await createShiprocketOrder(built.payload)
      return await saveInfo(container, orderId, {
        channel_order_id: channelOrderId,
        sr_order_id: created.order_id,
        shipment_id: created.shipment_id,
        awb: created.awb_code,
        courier: created.courier_name,
        status: created.status || "NEW",
        stage: stageFromStatus(created.status),
        track_url: null,
        etd: null,
        payment_method: paymentMethod,
        cod_amount: paymentMethod === "COD" ? built.codAmount : 0,
        sent_at: new Date().toISOString(),
        scans: [],
        attempts: (info.attempts ?? 0) + 1,
        error: null,
        error_at: null,
      })
    } catch (err) {
      const message = err instanceof ShiprocketError ? err.message : `Could not send to Shiprocket: ${(err as Error).message}`
      await saveInfo(container, orderId, {
        error: message,
        error_at: new Date().toISOString(),
        attempts: (info.attempts ?? 0) + 1,
      })
      throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
    }
  } finally {
    sending.delete(orderId)
  }
}

/** Cancels the order in Shiprocket (only before it has been picked up). */
export async function cancelInShiprocket(container: MedusaContainer, orderId: string) {
  const order = await loadOrder(container, orderId)
  const info = shiprocketInfo(order)
  if (!info.sr_order_id || info.stage === "cancelled") return info
  if (STAGE_RANK[info.stage ?? "processing"] >= STAGE_RANK.shipped) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "The courier already has this parcel, so it can't be cancelled here. Contact Shiprocket support to stop it."
    )
  }
  await cancelShiprocketOrders([info.sr_order_id])
  return saveInfo(container, orderId, {
    stage: "cancelled",
    status: "CANCELED",
    cancelled_ids: [...(info.cancelled_ids ?? []), info.sr_order_id],
    error: null,
  })
}

/** "23 05 2023 11:43:52" or "2023-05-23 11:43:52" (India time) -> ISO. */
export function parseShiprocketTime(value: unknown): string | null {
  const s = String(value ?? "").trim()
  let m = s.match(/^(\d{2}) (\d{2}) (\d{4})[ T]?(\d{2}:\d{2}(?::\d{2})?)?/)
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] ?? "00:00"}+05:30`).toISOString()
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T]?(\d{2}:\d{2}(?::\d{2})?)?/)
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "00:00"}+05:30`).toISOString()
  return null
}

export type TrackingUpdate = {
  status: string
  awb?: string | null
  courier?: string | null
  etd?: string | null
  track_url?: string | null
  event_at?: string | null
  scans?: { date: string; activity: string; location: string }[]
}

/**
 * Records a tracking update and moves the Medusa order along. Older or
 * repeated updates never move an order backwards.
 */
export async function applyTrackingUpdate(container: MedusaContainer, orderId: string, update: TrackingUpdate) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const order = await loadOrder(container, orderId)
  const info = shiprocketInfo(order)
  const newStage = stageFromStatus(update.status)
  const oldStage: Stage = info.stage ?? "processing"

  const isOlder = Boolean(update.event_at && info.last_event_at && update.event_at < info.last_event_at)
  const finalStage = oldStage === "delivered" || oldStage === "returned"
  const moves =
    !isOlder &&
    !finalStage &&
    (newStage === "cancelled" || newStage === "returned" || newStage === "issue" || STAGE_RANK[newStage] >= STAGE_RANK[oldStage])

  const scans = (update.scans ?? [])
    .filter((s) => s.activity)
    .map((s) => ({ date: s.date, activity: s.activity, location: s.location }))
  const patch: Partial<ShiprocketInfo> = {
    awb: update.awb || info.awb || null,
    courier: update.courier || info.courier || null,
    etd: update.etd ?? info.etd ?? null,
    track_url: update.track_url || info.track_url || null,
    scans: scans.length ? scans.slice(-30) : info.scans ?? [],
  }
  if (moves) {
    patch.status = update.status
    patch.stage = newStage
    patch.last_event_at = update.event_at ?? new Date().toISOString()
    if (newStage === "cancelled" && info.sr_order_id) {
      patch.cancelled_ids = [...new Set([...(info.cancelled_ids ?? []), info.sr_order_id])]
    }
  }
  let saved = await saveInfo(container, orderId, patch)

  const stage = saved.stage ?? oldStage
  if (["shipped", "out_for_delivery", "issue", "delivered"].includes(stage)) {
    try {
      await syncFulfillment(container, orderId, saved, stage === "delivered")
      if (saved.fulfillment_note) saved = await saveInfo(container, orderId, { fulfillment_note: null })
    } catch (err) {
      const note = `Shiprocket says "${saved.status}", but the order could not be marked as shipped in Medusa: ${(err as Error).message}`
      logger.warn(`[shiprocket] order ${order.display_id}: ${note}`)
      saved = await saveInfo(container, orderId, { fulfillment_note: note })
    }
  }
  return saved
}

/** Creates the fulfilment + shipment in Medusa (once) and marks it delivered. */
async function syncFulfillment(container: MedusaContainer, orderId: string, info: ShiprocketInfo, delivered: boolean) {
  let order = await loadOrder(container, orderId)
  let active = (order.fulfillments ?? []).filter((f: any) => !f.canceled_at)
  const labels = info.awb
    ? [{ tracking_number: info.awb, tracking_url: trackingLink(info) ?? "", label_url: trackingLink(info) ?? "" }]
    : []

  if (!active.length) {
    const items = (order.items ?? [])
      .map((i: any) => ({ id: i.id, quantity: num(i.quantity) - num(i.detail?.fulfilled_quantity) }))
      .filter((i: any) => i.quantity > 0)
    if (!items.length) return
    await createOrderFulfillmentWorkflow(container).run({
      input: { order_id: orderId, items, labels, no_notification: true } as any,
    })
    order = await loadOrder(container, orderId)
    active = (order.fulfillments ?? []).filter((f: any) => !f.canceled_at)
  }

  for (const f of active) {
    if (!f.shipped_at) {
      const items = (order.items ?? []).map((i: any) => ({ id: i.id, quantity: num(i.quantity) })).filter((i: any) => i.quantity > 0)
      await createOrderShipmentWorkflow(container).run({
        input: { order_id: orderId, fulfillment_id: f.id, items, labels, no_notification: true } as any,
      })
    }
    if (delivered && !f.delivered_at) {
      await markOrderFulfillmentAsDeliveredWorkflow(container).run({
        input: { orderId, fulfillmentId: f.id },
      })
    }
  }
}

/** Asks Shiprocket for the latest tracking and applies it. */
export async function refreshTracking(container: MedusaContainer, orderId: string) {
  const order = await loadOrder(container, orderId)
  const info = shiprocketInfo(order)
  if (!info.sr_order_id) return info
  let snap: TrackingSnapshot | null = null
  if (info.awb) snap = await trackByAwb(info.awb)
  else if (info.shipment_id) snap = await trackByShipment(info.shipment_id).catch(() => null)
  if (!snap || !snap.status) {
    return saveInfo(container, orderId, {})
  }
  const latest = snap.scans[0]
  return applyTrackingUpdate(container, orderId, {
    status: snap.status,
    awb: snap.awb,
    courier: snap.courier,
    etd: snap.etd,
    track_url: snap.track_url,
    event_at: parseShiprocketTime(latest?.date),
    // Shiprocket lists the newest scan first; keep oldest -> newest.
    scans: [...snap.scans].reverse(),
  })
}

/**
 * Finds the Medusa order a Shiprocket update belongs to. Our Shiprocket order
 * numbers are the Medusa order number ("1001", or "1001-2" after a resend);
 * the Shiprocket order id / AWB stored on the order confirm the match.
 */
export async function findOrderForUpdate(
  container: MedusaContainer,
  ref: { channel_order_id?: unknown; sr_order_id?: unknown; awb?: unknown }
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const srId = Number(ref.sr_order_id) || null
  const awb = ref.awb ? String(ref.awb) : null
  const matches = (o: any) => {
    const info = shiprocketInfo(o)
    return Boolean(
      (srId && (info.sr_order_id === srId || (info.cancelled_ids ?? []).includes(srId))) ||
        (awb && info.awb === awb) ||
        (ref.channel_order_id && info.channel_order_id === String(ref.channel_order_id))
    )
  }
  const displayId = Number(String(ref.channel_order_id ?? "").match(/^(\d+)(?:-\d+)?$/)?.[1])
  if (displayId) {
    const { data } = await query.graph({ entity: "order", fields: ["id", "metadata"], filters: { display_id: displayId } as any })
    const hit = (data as any[]).find(matches)
    if (hit) return hit.id as string
  }
  // Fallback: look through recent orders.
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    pagination: { take: 500, order: { created_at: "DESC" } },
  })
  const hit = (data as any[]).find(matches)
  return hit ? (hit.id as string) : null
}
