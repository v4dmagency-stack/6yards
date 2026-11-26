import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { getSaree, updateSaree } from "../../../../lib/sarees"
import { UpdateSareeBody } from "../validators"

/**
 *   GET    /admin/sarees/:id   one saree
 *   POST   /admin/sarees/:id   save changes (only the fields sent are changed)
 *   DELETE /admin/sarees/:id   delete permanently (the editor asks first)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ saree: await getSaree(req.scope, req.params.id) })
}

export async function POST(req: MedusaRequest<UpdateSareeBody>, res: MedusaResponse) {
  res.json({ saree: await updateSaree(req.scope, req.params.id, req.validatedBody) })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await getSaree(req.scope, req.params.id)
  await deleteProductsWorkflow(req.scope).run({ input: { ids: [req.params.id] } })
  res.json({ id: req.params.id, deleted: true })
}
