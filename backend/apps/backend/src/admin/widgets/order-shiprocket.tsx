import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Text, toast, usePrompt } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, formatINR } from "../lib/sarees-api"

type Info = {
  configured: boolean
  order: { id: string; display_id: number; total: number; canceled: boolean; paid_online: boolean }
  shiprocket: {
    channel_order_id?: string
    sr_order_id?: number
    awb?: string | null
    courier?: string | null
    status?: string
    stage: string
    stage_label: string
    etd?: string | null
    payment_method?: "Prepaid" | "COD"
    cod_amount?: number
    sent_at?: string
    updated_at?: string
    tracking_link?: string | null
    error?: string | null
    fulfillment_note?: string | null
  }
}

const STAGE_COLOR: Record<string, "grey" | "blue" | "orange" | "green" | "red" | "purple"> = {
  not_sent: "grey",
  processing: "blue",
  shipped: "purple",
  out_for_delivery: "purple",
  issue: "orange",
  delivered: "green",
  cancelled: "red",
  returned: "red",
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "")

/** Order page -> Shiprocket: send the order, see its courier status, refresh or cancel. */
const OrderShiprocket = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const prompt = usePrompt()
  const [info, setInfo] = useState<Info | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      setInfo(await api<Info>(`/admin/orders/${order.id}/shiprocket`))
    } catch (err) {
      setLoadError((err as Error).message)
    }
  }, [order.id])

  useEffect(() => {
    load()
  }, [load])

  const act = async (action: string, body: Record<string, unknown> = {}, done?: string) => {
    setBusy(action)
    try {
      setInfo(await api<Info>(`/admin/orders/${order.id}/shiprocket`, { method: "POST", body: { action, ...body } }))
      if (done) toast.success(done)
    } catch (err) {
      toast.error((err as Error).message)
      load()
    } finally {
      setBusy(null)
    }
  }

  const send = async (method: "Prepaid" | "COD") => {
    if (!info) return
    const total = formatINR(info.order.total)
    const ok = await prompt({
      title: method === "COD" ? "Send as cash on delivery?" : "Send as paid?",
      description:
        method === "COD"
          ? `The courier will collect ${total} from the customer. Only choose this if the customer has NOT paid yet.`
          : `The customer has already paid ${total}, so the courier collects nothing.`,
      confirmText: "Send to Shiprocket",
      cancelText: "Go back",
    })
    if (ok) act("send", { payment_method: method }, "Sent to Shiprocket. Assign a courier there to ship it.")
  }

  const cancel = async () => {
    const ok = await prompt({
      title: "Cancel in Shiprocket?",
      description: "The order is removed from Shiprocket (the Medusa order stays). You can send it again later.",
      confirmText: "Cancel in Shiprocket",
      cancelText: "Keep it",
    })
    if (ok) act("cancel", {}, "Cancelled in Shiprocket.")
  }

  const sr = info?.shiprocket
  const sent = Boolean(sr?.sr_order_id) && sr?.stage !== "cancelled"

  return (
    <Container className="flex flex-col gap-y-3 px-6 py-4">
      <div className="flex items-center justify-between gap-2">
        <Heading level="h2">Shiprocket</Heading>
        {sr && <Badge size="2xsmall" color={STAGE_COLOR[sr.stage] ?? "grey"}>{sent || sr.stage === "cancelled" ? sr.stage_label : "Not sent yet"}</Badge>}
      </div>

      {loadError && (
        <div className="flex flex-col gap-2">
          <Text size="small" className="text-ui-fg-error">{loadError}</Text>
          <Button size="small" variant="secondary" onClick={load}>Try again</Button>
        </div>
      )}

      {!info && !loadError && <Text size="small" className="text-ui-fg-subtle">Loading…</Text>}

      {info && !info.configured && (
        <Text size="small" className="text-ui-fg-subtle">
          Shiprocket isn't connected yet. See <Link to="/settings/shiprocket" className="text-ui-fg-interactive">Settings → Shiprocket</Link>.
        </Text>
      )}

      {info && info.configured && info.order.canceled && !sent && (
        <Text size="small" className="text-ui-fg-subtle">This order is cancelled.</Text>
      )}

      {info && info.configured && !info.order.canceled && !sent && (
        <div className="flex flex-col gap-2">
          <Text size="small" className="text-ui-fg-subtle">
            {sr?.stage === "cancelled" ? "It was cancelled in Shiprocket. " : ""}
            When the payment is sorted, send this order to Shiprocket. Has the customer paid?
          </Text>
          <Button size="small" isLoading={busy === "send"} disabled={Boolean(busy)} onClick={() => send("Prepaid")}>
            Yes, paid — send to Shiprocket
          </Button>
          <Button size="small" variant="secondary" isLoading={busy === "send"} disabled={Boolean(busy)} onClick={() => send("COD")}>
            No, cash on delivery ({formatINR(info.order.total)})
          </Button>
        </div>
      )}

      {sr?.error && !sent && (
        <Text size="small" className="text-ui-fg-error">Last try failed: {sr.error}</Text>
      )}

      {info && sent && sr && (
        <div className="flex flex-col gap-1">
          <Row label="Status" value={sr.status || sr.stage_label} />
          <Row label="Shiprocket order" value={`#${sr.channel_order_id ?? ""} (ID ${sr.sr_order_id})`} />
          <Row label="Payment" value={sr.payment_method === "COD" ? `Cash on delivery — collect ${formatINR(sr.cod_amount ?? 0)}` : "Paid"} />
          <Row label="Courier" value={sr.courier || "Not assigned yet — assign one in Shiprocket"} />
          {sr.awb && <Row label="AWB" value={sr.awb} />}
          {sr.etd && <Row label="Expected" value={when(sr.etd)} />}
          {sr.updated_at && <Row label="Last update" value={when(sr.updated_at)} />}
          {sr.fulfillment_note && <Text size="xsmall" className="text-ui-fg-error">{sr.fulfillment_note}</Text>}
          <div className="mt-2 flex flex-wrap gap-2">
            {sr.tracking_link && (
              <a href={sr.tracking_link} target="_blank" rel="noreferrer">
                <Button size="small" variant="secondary">Track parcel</Button>
              </a>
            )}
            <a href="https://app.shiprocket.in/seller/orders/new" target="_blank" rel="noreferrer">
              <Button size="small" variant="secondary">Open Shiprocket</Button>
            </a>
            <Button size="small" variant="secondary" isLoading={busy === "refresh"} disabled={Boolean(busy)} onClick={() => act("refresh", {}, "Tracking updated.")}>
              Refresh
            </Button>
            {sr.stage === "processing" && (
              <Button size="small" variant="danger" isLoading={busy === "cancel"} disabled={Boolean(busy)} onClick={cancel}>
                Cancel in Shiprocket
              </Button>
            )}
          </div>
        </div>
      )}
    </Container>
  )
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3">
    <Text size="small" className="text-ui-fg-subtle">{label}</Text>
    <Text size="small" className="text-right">{value}</Text>
  </div>
)

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderShiprocket
