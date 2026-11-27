import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cancelInShiprocket } from "../lib/order-shipping"
import { isShiprocketConfigured } from "../lib/shiprocket"

/** Cancelling an order in Medusa also cancels it in Shiprocket (if the courier doesn't have it yet). */
export default async function shiprocketOrderCanceled({ event, container }: SubscriberArgs<{ id: string }>) {
  if (!isShiprocketConfigured()) return
  try {
    await cancelInShiprocket(container, event.data.id)
  } catch (err) {
    container.resolve(ContainerRegistrationKeys.LOGGER).warn(
      `[shiprocket] Could not cancel order ${event.data.id} in Shiprocket: ${(err as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
