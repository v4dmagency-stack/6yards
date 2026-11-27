// Shiprocket API client (https://apidocs.shiprocket.in).
//
// Settings come from environment variables (Vercel -> Project -> Settings ->
// Environment Variables). Without SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD
// everything here stays switched off and the shop works as before.
//
//   SHIPROCKET_EMAIL           API user email (Shiprocket -> Settings -> API -> Add New API User)
//   SHIPROCKET_PASSWORD        API user password
//   SHIPROCKET_PICKUP_LOCATION Pickup location nickname exactly as in Shiprocket (Settings -> Pickup Addresses)
//   SHIPROCKET_WEBHOOK_TOKEN   Any long random text; paste the same in Shiprocket -> Settings -> API -> Webhooks
//   SHIPROCKET_PACKAGE_WEIGHT_KG  Packed weight of one saree (default 0.8)
//   SHIPROCKET_PACKAGE_SIZE_CM    Packed size of one saree, LxBxH (default 35x28x4)

export const DEFAULT_BASE_URL = "https://apiv2.shiprocket.in/v1/external"
const TIMEOUT_MS = 20000
// Tokens last 10 days; renew a day early.
const TOKEN_LIFETIME_MS = 9 * 24 * 60 * 60 * 1000

export type ShiprocketConfig = {
  email: string
  password: string
  pickupLocation: string
  webhookToken: string
  baseUrl: string
  weightKg: number
  sizeCm: { length: number; breadth: number; height: number }
}

export class ShiprocketError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

function positive(value: string | undefined, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function shiprocketConfig(): ShiprocketConfig {
  const [l, b, h] = String(process.env.SHIPROCKET_PACKAGE_SIZE_CM || "35x28x4")
    .toLowerCase()
    .split(/[x*,\s]+/)
    .map((v) => Number(v))
  return {
    email: (process.env.SHIPROCKET_EMAIL || "").trim(),
    password: process.env.SHIPROCKET_PASSWORD || "",
    pickupLocation: (process.env.SHIPROCKET_PICKUP_LOCATION || "").trim(),
    webhookToken: (process.env.SHIPROCKET_WEBHOOK_TOKEN || "").trim(),
    baseUrl: (process.env.SHIPROCKET_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    weightKg: positive(process.env.SHIPROCKET_PACKAGE_WEIGHT_KG, 0.8),
    sizeCm: { length: l > 0.5 ? l : 35, breadth: b > 0.5 ? b : 28, height: h > 0.5 ? h : 4 },
  }
}

export function isShiprocketConfigured() {
  const c = shiprocketConfig()
  return Boolean(c.email && c.password)
}

let cachedToken: { token: string; expiresAt: number; email: string } | null = null
let pendingLogin: Promise<string> | null = null

async function call(path: string, init: { method?: string; body?: unknown; token?: string } = {}) {
  const { baseUrl } = shiprocketConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    throw new ShiprocketError(
      (err as Error).name === "AbortError" ? "Shiprocket did not answer in time. Please try again." : "Could not reach Shiprocket. Please try again."
    )
  } finally {
    clearTimeout(timer)
  }
  const text = await res.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text.slice(0, 200) }
  }
  if (!res.ok) {
    throw new ShiprocketError(errorMessage(data, res.status), res.status)
  }
  return data
}

/** Shiprocket errors come as { message } or { errors: { field: ["..."] } }. */
function errorMessage(data: any, status: number) {
  const errors = data?.errors
  if (errors && typeof errors === "object") {
    const first = Object.values(errors)[0]
    const msg = Array.isArray(first) ? first[0] : first
    if (msg) return `Shiprocket: ${msg}`
  }
  if (data?.message) return `Shiprocket: ${data.message}`
  if (status === 401 || status === 403) return "Shiprocket rejected the login. Check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD."
  return `Shiprocket returned an error (${status}).`
}

async function login(): Promise<string> {
  const c = shiprocketConfig()
  if (!c.email || !c.password) {
    throw new ShiprocketError("Shiprocket is not connected yet. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in Vercel.")
  }
  const data = await call("/auth/login", { method: "POST", body: { email: c.email, password: c.password } }).catch((err) => {
    if (err instanceof ShiprocketError && (err.status === 400 || err.status === 401 || err.status === 403)) {
      throw new ShiprocketError("Shiprocket rejected the login. Check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD (use the API user, not your normal login).", err.status)
    }
    throw err
  })
  if (!data?.token) {
    throw new ShiprocketError("Shiprocket login gave no token. Check the API user's email and password.")
  }
  cachedToken = { token: data.token, expiresAt: Date.now() + TOKEN_LIFETIME_MS, email: c.email }
  return data.token
}

async function token(fresh = false) {
  const email = shiprocketConfig().email
  if (!fresh && cachedToken && cachedToken.email === email && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }
  if (!pendingLogin) {
    pendingLogin = login().finally(() => {
      pendingLogin = null
    })
  }
  return pendingLogin
}

/** An authenticated call; logs in again once if the token was rejected. */
async function api(path: string, init: { method?: string; body?: unknown } = {}) {
  try {
    return await call(path, { ...init, token: await token() })
  } catch (err) {
    if (err instanceof ShiprocketError && err.status === 401) {
      return call(path, { ...init, token: await token(true) })
    }
    throw err
  }
}

export type PickupLocation = { name: string; pincode: string; city: string; state: string; primary: boolean }

export async function listPickupLocations(): Promise<PickupLocation[]> {
  const data = await api("/settings/company/pickup")
  return (data?.data?.shipping_address ?? []).map((l: any) => ({
    name: String(l.pickup_location ?? ""),
    pincode: String(l.pin_code ?? ""),
    city: String(l.city ?? ""),
    state: String(l.state ?? ""),
    primary: Number(l.is_primary_location) === 1,
  }))
}

let pickupCache: { name: string; location: PickupLocation | null; at: number } | null = null

/** The pickup location set in SHIPROCKET_PICKUP_LOCATION (or the primary one), cached for an hour. */
export async function pickupLocation(): Promise<PickupLocation | null> {
  const wanted = shiprocketConfig().pickupLocation
  if (pickupCache && pickupCache.name === wanted && Date.now() - pickupCache.at < 60 * 60 * 1000) {
    return pickupCache.location
  }
  const all = await listPickupLocations()
  const location =
    (wanted ? all.find((l) => l.name.toLowerCase() === wanted.toLowerCase()) : null) ??
    (wanted ? null : all.find((l) => l.primary) ?? all[0] ?? null)
  pickupCache = { name: wanted, location, at: Date.now() }
  return location
}

export type CreatedShiprocketOrder = {
  order_id: number
  shipment_id: number | null
  status: string
  awb_code: string | null
  courier_name: string | null
}

export async function createShiprocketOrder(payload: Record<string, unknown>): Promise<CreatedShiprocketOrder> {
  const data = await api("/orders/create/adhoc", { method: "POST", body: payload })
  if (!data?.order_id) {
    throw new ShiprocketError(errorMessage(data, 200).replace("(200)", "") || "Shiprocket did not create the order.")
  }
  return {
    order_id: Number(data.order_id),
    shipment_id: data.shipment_id ? Number(data.shipment_id) : null,
    status: String(data.status ?? "NEW"),
    awb_code: data.awb_code ? String(data.awb_code) : null,
    courier_name: data.courier_name ? String(data.courier_name) : null,
  }
}

export async function cancelShiprocketOrders(ids: number[]) {
  return api("/orders/cancel", { method: "POST", body: { ids } })
}

export type TrackingSnapshot = {
  status: string
  courier: string | null
  awb: string | null
  etd: string | null
  track_url: string | null
  scans: { date: string; activity: string; location: string; status: string }[]
}

function toSnapshot(trackingData: any): TrackingSnapshot | null {
  const t = trackingData ?? {}
  const shipment = (t.shipment_track ?? [])[0]
  if (!shipment && !(t.shipment_track_activities ?? []).length) return null
  return {
    status: String(shipment?.current_status ?? ""),
    courier: shipment?.courier_name ? String(shipment.courier_name) : null,
    awb: shipment?.awb_code ? String(shipment.awb_code) : null,
    etd: shipment?.edd ? String(shipment.edd) : t.etd ? String(t.etd) : null,
    track_url: t.track_url ? String(t.track_url) : null,
    scans: (t.shipment_track_activities ?? []).map((s: any) => ({
      date: String(s.date ?? ""),
      activity: String(s.activity ?? ""),
      location: String(s.location ?? ""),
      status: String(s["sr-status-label"] ?? s.status ?? ""),
    })),
  }
}

export async function trackByAwb(awb: string) {
  const data = await api(`/courier/track/awb/${encodeURIComponent(awb)}`)
  return toSnapshot(data?.tracking_data)
}

export async function trackByShipment(shipmentId: number | string) {
  const data = await api(`/courier/track/shipment/${encodeURIComponent(String(shipmentId))}`)
  return toSnapshot(data?.tracking_data)
}

export type DeliveryEstimate = {
  serviceable: boolean
  cod: boolean
  days: number | null
  etd: string | null
}

const estimateCache = new Map<string, { value: DeliveryEstimate; at: number }>()

/** Can a saree be delivered to this PIN code, how soon, and is cash on delivery possible? */
export async function deliveryEstimate(pincode: string): Promise<DeliveryEstimate> {
  const cached = estimateCache.get(pincode)
  if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000) return cached.value
  const pickup = await pickupLocation()
  if (!pickup?.pincode) {
    throw new ShiprocketError("The Shiprocket pickup location was not found. Check SHIPROCKET_PICKUP_LOCATION.")
  }
  const { weightKg } = shiprocketConfig()
  const query = new URLSearchParams({
    pickup_postcode: pickup.pincode,
    delivery_postcode: pincode,
    weight: String(weightKg),
    cod: "0",
  })
  let couriers: any[] = []
  try {
    const data = await api(`/courier/serviceability/?${query}`)
    couriers = (data?.data?.available_courier_companies ?? []).filter((c: any) => !Number(c.blocked))
  } catch (err) {
    // Shiprocket answers 404 when no courier serves the PIN code.
    if (!(err instanceof ShiprocketError && err.status === 404)) throw err
  }
  const days = couriers
    .map((c) => Number(c.estimated_delivery_days))
    .filter((d) => Number.isFinite(d) && d > 0)
  const fastest = days.length ? Math.min(...days) : null
  const fastestCourier = couriers.find((c) => Number(c.estimated_delivery_days) === fastest)
  const value: DeliveryEstimate = {
    serviceable: couriers.length > 0,
    cod: couriers.some((c) => Number(c.cod) === 1),
    days: fastest,
    etd: fastestCourier?.etd ? String(fastestCourier.etd) : null,
  }
  estimateCache.set(pincode, { value, at: Date.now() })
  if (estimateCache.size > 2000) estimateCache.clear()
  return value
}

/** For tests: forget the cached token and lookups. */
export function resetShiprocketCache() {
  cachedToken = null
  pickupCache = null
  estimateCache.clear()
}
