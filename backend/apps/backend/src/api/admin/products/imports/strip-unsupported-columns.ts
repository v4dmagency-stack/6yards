import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { parse } from "csv-parse/sync"

// Medusa 2.22's product export writes these variant image columns, but its
// import rejects them ("Invalid column name(s)"), so an exported file could
// never be imported back. They are dropped before the import reads the file;
// variant images already on products are left unchanged.
const UNSUPPORTED_COLUMN = /^variant (thumbnail|image \d+)$/i

const toCsvCell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

type ImportBody = { file_key?: string; originalname?: string }

export async function stripUnsupportedImportColumns(
  req: MedusaRequest<ImportBody>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const fileKey = req.body?.file_key
    if (!fileKey) {
      return next()
    }

    const fileModule = req.scope.resolve(Modules.FILE)
    const content = (await fileModule.getAsBuffer(fileKey)).toString("utf8")
    const rows: string[][] = parse(content, { skip_empty_lines: true, relax_column_count: true, bom: true })
    const header = rows[0] ?? []
    const keep = header.map((name, i) => (UNSUPPORTED_COLUMN.test(name.trim()) ? -1 : i)).filter((i) => i >= 0)
    if (keep.length === header.length) {
      return next()
    }

    const cleaned = rows.map((row) => keep.map((i) => toCsvCell(row[i] ?? "")).join(",")).join("\n")
    const [file] = await fileModule.createFiles([{
      filename: req.body.originalname || "product-import.csv",
      mimeType: "text/csv",
      content: Buffer.from(cleaned, "utf8").toString("base64"),
      access: "private",
    }])
    req.body.file_key = file.id
    const validated = (req as unknown as { validatedBody?: ImportBody }).validatedBody
    if (validated) {
      validated.file_key = file.id
    }
    await fileModule.deleteFiles(fileKey).catch(() => undefined)
    next()
  } catch (error) {
    next(error)
  }
}
