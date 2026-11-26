import { z } from "@medusajs/framework/zod"

const shortText = z.string().max(300)
const longText = z.string().max(5000)

const fields = {
  title: z.string().trim().min(1, "Give the saree a name.").max(200),
  description: longText,
  status: z.enum(["published", "draft"]),
  images: z.array(z.string().min(1).max(2000)).max(30),
  price: z.number().int("Prices are whole rupees.").min(1, "The selling price must be at least ₹1.").max(10_000_000),
  regular_price: z.number().int("Prices are whole rupees.").min(0).max(10_000_000).nullable(),
  item_code: z.string().trim().max(100),
  stock: z.number().int().min(0).max(100_000),
  collection_id: z.string().max(100).nullable(),
  category_ids: z.array(z.string().max(100)).max(100),
  fabric: z.string().trim().max(100),
  fabric_details: shortText,
  weave: shortText,
  color_description: shortText,
  length: shortText,
  blouse_piece: shortText,
  origin: shortText,
  care: longText,
  occasion: z.string().max(50),
  badge: z.string().max(40),
  colors: z.array(z.string().trim().min(1).max(50)).max(20),
  details: z.array(z.string().trim().min(1).max(500)).max(30),
  bestseller: z.boolean(),
}

export const CreateSareeSchema = z.object(fields).partial().required({ title: true, price: true })
export const UpdateSareeSchema = z.object(fields).partial()

export type CreateSareeBody = z.infer<typeof CreateSareeSchema>
export type UpdateSareeBody = z.infer<typeof UpdateSareeSchema>
