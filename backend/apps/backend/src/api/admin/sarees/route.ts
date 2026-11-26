import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createSaree, listSarees } from "../../../lib/sarees"
import { CreateSareeBody } from "./validators"

/**
 * Simple Sarees editor API (Admin only; see src/lib/sarees.ts).
 *
 *   GET  /admin/sarees?q=&limit=&offset=   list (newest first)
 *   POST /admin/sarees                      create a saree
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined
  res.json(await listSarees(req.scope, { q, limit, offset }))
}

export async function POST(req: MedusaRequest<CreateSareeBody>, res: MedusaResponse) {
  res.status(201).json({ saree: await createSaree(req.scope, req.validatedBody) })
}
