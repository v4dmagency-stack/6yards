import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncSkuFromInventoryItem } from "../lib/sku-sync"

/** Editing an item's SKU in Admin -> Inventory updates the saree's variant SKU (the website's item code). */
export default async function inventoryItemSkuSync({ event, container }: SubscriberArgs<{ id: string }>) {
  try {
    await syncSkuFromInventoryItem(container, event.data.id)
  } catch (err) {
    container.resolve(ContainerRegistrationKeys.LOGGER).warn(
      `Could not copy the inventory SKU of ${event.data.id} to its variant: ${(err as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "inventory-item.updated",
}
