import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadVariantStock, setAvailableStock, summarizeStock } from "../../../../../lib/stock"
import { AvailabilityBody } from "./validators"

/**
 * Sold out / back in stock for one saree (the "Availability" box on the
 * product page in Medusa Admin). The stock logic lives in src/lib/stock.ts,
 * shared with the Sarees editor.
 *
 *   GET  /admin/products/:id/availability
 *   POST /admin/products/:id/availability  { sold_out: true }
 *   POST /admin/products/:id/availability  { sold_out: false, quantity: 1 }
 */

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const variants = await loadVariantStock(req.scope, req.params.id)
  if (!variants.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Product ${req.params.id} has no variants`)
  }
  res.json(summarizeStock(variants))
}

export async function POST(req: MedusaRequest<AvailabilityBody>, res: MedusaResponse) {
  const { sold_out, quantity = 1 } = req.validatedBody
  res.json(await setAvailableStock(req.scope, req.params.id, sold_out ? 0 : quantity))
}
