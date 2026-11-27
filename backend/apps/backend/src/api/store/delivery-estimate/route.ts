import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deliveryEstimate, isShiprocketConfigured } from "../../../lib/shiprocket"

/**
 * GET /store/delivery-estimate?pincode=560001
 * Used by "Check delivery" on the product page and at checkout.
 * { available: false } when Shiprocket isn't connected or doesn't answer, so
 * the website never blocks an order because of this check.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pincode = String(req.query.pincode ?? "").trim()
  // Without a PIN code: just "is the delivery check switched on?"
  if (!pincode) {
    return res.json({ available: isShiprocketConfigured() })
  }
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return res.status(400).json({ message: "Enter a valid 6-digit PIN code." })
  }
  if (!isShiprocketConfigured()) {
    return res.json({ available: false })
  }
  try {
    const estimate = await deliveryEstimate(pincode)
    res.setHeader("Cache-Control", "public, max-age=3600")
    return res.json({ available: true, pincode, ...estimate })
  } catch (err) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn(`[shiprocket] Delivery check for ${pincode} failed: ${(err as Error).message}`)
    return res.json({ available: false })
  }
}
