import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncSkuFromVariant } from "../lib/sku-sync"

/** Editing a variant's SKU (Products -> saree -> Variants) updates its inventory item SKU too. */
export default async function productVariantSkuSync({ event, container }: SubscriberArgs<{ id: string }>) {
  try {
    await syncSkuFromVariant(container, event.data.id)
  } catch (err) {
    container.resolve(ContainerRegistrationKeys.LOGGER).warn(
      `Could not copy the variant SKU of ${event.data.id} to its inventory item: ${(err as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "product-variant.updated",
}
