// Helpers shared by the Sarees pages in Admin (src/admin/routes/sarees).

export type Saree = {
  id: string
  title: string
  description: string
  status: "published" | "draft"
  images: string[]
  price: number | null
  regular_price: number | null
  discount_percent: number
  item_code: string
  stock: number | null
  reserved: number
  stock_tracked: boolean
  collection_id: string | null
  collection: string | null
  category_ids: string[]
  categories: string[]
  fabric: string
  fabric_details: string
  weave: string
  color_description: string
  length: string
  blouse_piece: string
  origin: string
  care: string
  occasion: string
  badge: string
  colors: string[]
  details: string[]
  bestseller: boolean
  variant_count: number
}

export type SareeOptions = {
  collections: { id: string; title: string }[]
  categories: { id: string; name: string; rank: number; parent_id: string | null; is_active: boolean }[]
  fabrics: string[]
  colors: string[]
  occasions: string[]
}

const OFFLINE_MESSAGE = "Couldn't reach the server. Check your internet connection and try again."

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const method = init?.method ?? "GET"
  const send = () =>
    fetch(path, {
      method,
      credentials: "include",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  let res: Response
  try {
    res = await send()
  } catch {
    // A dropped connection: loading is retried once by itself; saving is not
    // (it might have gone through), so the person is asked to try again.
    if (method !== "GET") throw new Error(OFFLINE_MESSAGE)
    try {
      res = await send()
    } catch {
      throw new Error(OFFLINE_MESSAGE)
    }
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || `Something went wrong (${res.status}). Please try again.`)
  }
  return data as T
}

export const formatINR = (n: number | null | undefined) =>
  n == null || Number.isNaN(n) ? "—" : `₹ ${Math.round(n).toLocaleString("en-IN")}`

/** Shrinks a photo to at most 1600px on its longest side (camera photos are 4000×6000) and uploads it. */
export async function uploadPhoto(file: File): Promise<string> {
  const blob = await resizeImage(file, 1600, 0.85)
  const form = new FormData()
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
  form.append("files", new File([blob], name, { type: "image/jpeg" }))
  let res: Response
  try {
    res = await fetch("/admin/uploads", { method: "POST", credentials: "include", body: form })
  } catch {
    throw new Error(`Could not upload ${file.name}: ${OFFLINE_MESSAGE}`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.files?.[0]?.url) {
    throw new Error(data?.message || `Could not upload ${file.name}.`)
  }
  return data.files[0].url as string
}

async function resizeImage(file: File, maxSide: number, quality: number): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not a photo.`)
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`Could not read ${file.name}. Try a JPG or PNG photo.`))
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Could not prepare ${file.name}.`))), "image/jpeg", quality)
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
