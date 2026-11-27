import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { loadOrder, paidOnline, sendOrderToShiprocket, shiprocketInfo } from "../lib/order-shipping"
import { isShiprocketConfigured } from "../lib/shiprocket"

/**
 * Orders paid online (e.g. Razorpay, once added) go to Shiprocket as Prepaid
 * automatically. Orders with the manual "we'll confirm payment" method are sent
 * from the order page in Admin (Shiprocket box -> Paid / Cash on delivery).
 */
export default async function shiprocketAutoSend({ event, container }: SubscriberArgs<{ id: string }>) {
  if (!isShiprocketConfigured()) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    let orderId = event.data.id
    if (event.name === "payment.captured") {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "payment",
        fields: ["id", "payment_collection.order.id"],
        filters: { id: event.data.id },
      })
      orderId = (data[0] as any)?.payment_collection?.order?.id
      if (!orderId) return
    }
    const order = await loadOrder(container, orderId)
    if (!paidOnline(order) || shiprocketInfo(order).sr_order_id) return
    await sendOrderToShiprocket(container, orderId, "Prepaid")
    logger.info(`[shiprocket] Order ${order.display_id} sent to Shiprocket automatically (paid online).`)
  } catch (err) {
    // The error is saved on the order and shown in its Shiprocket box.
    logger.warn(`[shiprocket] Automatic send failed (${event.name} ${event.data.id}): ${(err as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "payment.captured"],
}
