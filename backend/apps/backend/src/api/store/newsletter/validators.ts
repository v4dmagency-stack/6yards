import { z } from "@medusajs/framework/zod"

export const NewsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

export type NewsletterBody = z.infer<typeof NewsletterSchema>
