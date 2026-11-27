import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isShiprocketConfigured, listPickupLocations, shiprocketConfig } from "../../../../lib/shiprocket"

/**
 * GET /admin/shiprocket/status — "Test connection" on Settings -> Shiprocket.
 * Logs in to Shiprocket and checks the pickup location. Never returns secrets.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const c = shiprocketConfig()
  const result = {
    configured: isShiprocketConfigured(),
    email_set: Boolean(c.email),
    password_set: Boolean(c.password),
    webhook_token_set: Boolean(c.webhookToken),
    pickup_location_setting: c.pickupLocation,
    package: { weight_kg: c.weightKg, size_cm: c.sizeCm },
    login_ok: false,
    pickup_locations: [] as { name: string; pincode: string; city: string; primary: boolean }[],
    pickup_ok: false,
    error: null as string | null,
  }
  if (!result.configured) {
    return res.json(result)
  }
  try {
    const locations = await listPickupLocations()
    result.login_ok = true
    result.pickup_locations = locations.map((l) => ({ name: l.name, pincode: l.pincode, city: l.city, primary: l.primary }))
    result.pickup_ok = c.pickupLocation
      ? locations.some((l) => l.name.toLowerCase() === c.pickupLocation.toLowerCase())
      : locations.length > 0
    if (!result.pickup_ok) {
      result.error = c.pickupLocation
        ? `Shiprocket has no pickup location called "${c.pickupLocation}". Use one of the names listed.`
        : "Add a pickup address in Shiprocket (Settings -> Pickup Addresses)."
    }
  } catch (err) {
    result.error = (err as Error).message
  }
  res.json(result)
}
