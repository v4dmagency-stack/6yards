import { z } from "@medusajs/framework/zod"

export const AvailabilitySchema = z.object({
  sold_out: z.boolean(),
  // How many pieces are available again when `sold_out` is false.
  quantity: z.number().int().min(1).max(999).optional(),
})

export type AvailabilityBody = z.infer<typeof AvailabilitySchema>
