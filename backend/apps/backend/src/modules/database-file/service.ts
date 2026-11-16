import { randomUUID } from "crypto"
import path from "path"
import { PassThrough, Readable } from "stream"
import { AbstractFileProviderService, MedusaError } from "@medusajs/framework/utils"
import { FileTypes } from "@medusajs/framework/types"
import { deleteFiles, readFile, saveFile } from "../../lib/file-store"

type Options = {
  /** Prefix for file URLs. Empty (default) gives root-relative `/files/<key>` URLs. */
  base_url?: string
}

/**
 * Medusa file provider that keeps files in Postgres (see src/lib/file-store.ts)
 * and serves them from GET /files/:key (src/api/files/[key]/route.ts).
 */
class DatabaseFileProviderService extends AbstractFileProviderService {
  static identifier = "database-file"

  protected baseUrl_: string

  constructor(_container: Record<string, unknown>, options: Options = {}) {
    super()
    this.baseUrl_ = (options.base_url ?? "").replace(/\/+$/, "")
  }

  private buildKey(filename: string) {
    // Keys are unguessable and URL-safe; the original name is kept for downloads.
    const ext = path.extname(filename).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10)
    return `${randomUUID()}${ext}`
  }

  private urlFor(key: string) {
    return `${this.baseUrl_}/files/${key}`
  }

  private decode(content: string, mimeType: string) {
    // Same rules as Medusa's local provider: base64 when it round-trips,
    // otherwise plain text (CSV/JSON/XML) or binary string.
    const decodedBase64 = Buffer.from(content, "base64")
    if (decodedBase64.toString("base64") === content) {
      return decodedBase64
    }
    const isText = /^text\/|csv|json|xml/.test(mimeType)
    return Buffer.from(content, isText ? "utf8" : "binary")
  }

  async upload(file: FileTypes.ProviderUploadFileDTO): Promise<FileTypes.ProviderFileResultDTO> {
    if (!file?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    }
    const key = this.buildKey(file.filename)
    await saveFile({
      key,
      filename: path.basename(file.filename),
      mime_type: file.mimeType || "application/octet-stream",
      access: file.access,
      content: this.decode(file.content, file.mimeType || ""),
    })
    return { key, url: this.urlFor(key) }
  }

  async getUploadStream(fileData: FileTypes.ProviderUploadStreamDTO) {
    if (!fileData?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    }
    const key = this.buildKey(fileData.filename)
    const url = this.urlFor(key)
    const writeStream = new PassThrough()
    const chunks: Buffer[] = []
    writeStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))

    const promise = new Promise<FileTypes.ProviderFileResultDTO>((resolve, reject) => {
      writeStream.on("error", reject)
      writeStream.on("end", () => {
        saveFile({
          key,
          filename: path.basename(fileData.filename),
          mime_type: fileData.mimeType || "application/octet-stream",
          access: fileData.access,
          content: Buffer.concat(chunks),
        })
          .then(() => resolve({ key, url }))
          .catch(reject)
      })
    })

    return { writeStream, promise, url, fileKey: key }
  }

  async delete(files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]) {
    const list = Array.isArray(files) ? files : [files]
    await deleteFiles(list.map((f) => f.fileKey))
  }

  private async load(fileKey: string) {
    const file = await readFile(fileKey)
    if (!file) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `File with key ${fileKey} not found`)
    }
    return file
  }

  async getPresignedDownloadUrl(fileData: FileTypes.ProviderGetFileDTO) {
    await this.load(fileData.fileKey)
    return this.urlFor(fileData.fileKey)
  }

  // A relative URL makes Medusa Admin upload through POST /admin/uploads (this provider).
  async getPresignedUploadUrl(fileData: FileTypes.ProviderGetPresignedUploadUrlDTO) {
    if (!fileData?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    }
    return { url: "/admin/uploads", key: fileData.filename }
  }

  async getDownloadStream(fileData: FileTypes.ProviderGetFileDTO): Promise<Readable> {
    const file = await this.load(fileData.fileKey)
    return Readable.from(file.content)
  }

  async getAsBuffer(fileData: FileTypes.ProviderGetFileDTO): Promise<Buffer> {
    const file = await this.load(fileData.fileKey)
    return file.content
  }
}

export default DatabaseFileProviderService
