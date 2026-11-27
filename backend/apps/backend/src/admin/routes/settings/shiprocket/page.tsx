import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { api } from "../../../lib/sarees-api"

type Status = {
  configured: boolean
  email_set: boolean
  password_set: boolean
  webhook_token_set: boolean
  pickup_location_setting: string
  package: { weight_kg: number; size_cm: { length: number; breadth: number; height: number } }
  login_ok: boolean
  pickup_locations: { name: string; pincode: string; city: string; primary: boolean }[]
  pickup_ok: boolean
  error: string | null
}

const Check = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <div className="flex items-start gap-2">
    <Badge size="2xsmall" color={ok ? "green" : "red"}>{ok ? "OK" : "To do"}</Badge>
    <Text size="small">{children}</Text>
  </div>
)

/** Settings -> Shiprocket: check the connection and copy the webhook address. */
const ShiprocketSettings = () => {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(false)
  const webhookUrl = `${window.location.origin}/hooks/delivery-updates`

  const test = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await api<Status>("/admin/shiprocket/status"))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    test()
  }, [test])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied.")
    } catch {
      toast.error("Could not copy. Select the text and copy it by hand.")
    }
  }

  return (
    <Container className="flex flex-col gap-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level="h1">Shiprocket</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Orders are sent to Shiprocket from each order's page, and courier updates come back here automatically.
          </Text>
        </div>
        <Button variant="secondary" isLoading={loading} onClick={test}>Test connection</Button>
      </div>

      {status && (
        <div className="flex flex-col gap-2">
          <Check ok={status.email_set && status.password_set}>
            API user email and password are set in Vercel (SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD).
          </Check>
          <Check ok={status.login_ok}>Shiprocket accepts the login.</Check>
          <Check ok={status.pickup_ok}>
            Pickup location{status.pickup_location_setting ? ` "${status.pickup_location_setting}"` : ""} found
            {status.pickup_location_setting ? "" : " (none set, so the primary one is used)"}.
          </Check>
          <Check ok={status.webhook_token_set}>Webhook token is set in Vercel (SHIPROCKET_WEBHOOK_TOKEN).</Check>
          {status.error && <Text size="small" className="text-ui-fg-error">{status.error}</Text>}
          {status.pickup_locations.length > 0 && (
            <Text size="small" className="text-ui-fg-subtle">
              Pickup locations in Shiprocket: {status.pickup_locations.map((l) => `${l.name} (${l.city} ${l.pincode})`).join(", ")}
            </Text>
          )}
          <Text size="small" className="text-ui-fg-subtle">
            Parcel size used for each saree: {status.package.weight_kg} kg, {status.package.size_cm.length} × {status.package.size_cm.breadth} ×{" "}
            {status.package.size_cm.height} cm (change with SHIPROCKET_PACKAGE_WEIGHT_KG / SHIPROCKET_PACKAGE_SIZE_CM).
          </Text>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-ui-border-base p-4">
        <Text weight="plus">Webhook (courier updates)</Text>
        <Text size="small" className="text-ui-fg-subtle">
          In Shiprocket go to Settings → API → Webhooks, paste this address, turn the toggle on, and paste the same
          token you put in SHIPROCKET_WEBHOOK_TOKEN as the security token.
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-ui-bg-subtle px-2 py-1 text-sm">{webhookUrl}</code>
          <Button size="small" variant="secondary" onClick={() => copy(webhookUrl)}>Copy</Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Shiprocket",
})

export default ShiprocketSettings
