import { Pool } from "pg"

/**
 * Files kept in Postgres (table `stored_file`).
 *
 * On Vercel the Medusa container's disk is temporary and every instance has its
 * own copy, so files written by Medusa's default local provider disappear and
 * get `http://localhost:9000/...` links. Product export/import CSVs and images
 * uploaded in Admin are stored here instead and served from `/files/<key>`.
 * Set the `S3_*` variables to use S3/R2 instead (see medusa-config.ts).
 */
let pool: Pool | undefined
let ready: Promise<void> | undefined

export type StoredFile = {
  key: string
  filename: string
  mime_type: string
  content: Buffer
}

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for file storage")
    }
    pool = new Pool({ connectionString, max: 3 })
  }
  return pool
}

async function ensureTable() {
  if (!ready) {
    ready = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS stored_file (
          key text PRIMARY KEY,
          filename text NOT NULL,
          mime_type text NOT NULL,
          access text NOT NULL DEFAULT 'public',
          content bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`
      )
      .then(() => undefined)
      .catch((err) => {
        ready = undefined
        throw err
      })
  }
  return ready
}

export async function saveFile(file: StoredFile & { access?: string }) {
  await ensureTable()
  await getPool().query(
    `INSERT INTO stored_file (key, filename, mime_type, access, content)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (key) DO UPDATE SET filename = EXCLUDED.filename,
       mime_type = EXCLUDED.mime_type, access = EXCLUDED.access, content = EXCLUDED.content`,
    [file.key, file.filename, file.mime_type, file.access ?? "public", file.content]
  )
}

export async function readFile(key: string): Promise<StoredFile | undefined> {
  await ensureTable()
  const { rows } = await getPool().query(
    "SELECT key, filename, mime_type, content FROM stored_file WHERE key = $1",
    [key]
  )
  return rows[0]
}

export async function deleteFiles(keys: string[]) {
  if (!keys.length) {
    return
  }
  await ensureTable()
  await getPool().query("DELETE FROM stored_file WHERE key = ANY($1)", [keys])
}
