import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { readFile } from "../../../lib/file-store"

/**
 * Serves files stored by the database file provider: product export CSVs and
 * images uploaded in Medusa Admin. Keys are random UUIDs, so links can't be guessed.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const key = req.params.key
  if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9]+)?$/.test(key)) {
    res.status(404).json({ message: "Not found" })
    return
  }

  const file = await readFile(key)
  if (!file) {
    res.status(404).json({ message: "Not found" })
    return
  }

  const isCsv = /csv/.test(file.mime_type)
  const safeName = file.filename.replace(/[^\w.-]+/g, "_")
  res.setHeader("Content-Type", file.mime_type)
  res.setHeader("Content-Length", String(file.content.length))
  res.setHeader("Cache-Control", isCsv ? "private, no-store" : "public, max-age=31536000, immutable")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("Content-Disposition", `${isCsv ? "attachment" : "inline"}; filename="${safeName}"`)
  res.status(200).send(file.content)
}
