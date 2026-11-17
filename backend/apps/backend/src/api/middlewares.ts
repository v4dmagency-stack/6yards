import {
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { NewsletterSchema } from "./store/newsletter/validators"
import { stripUnsupportedImportColumns } from "./admin/products/imports/strip-unsupported-columns"
import { AvailabilitySchema } from "./admin/products/[id]/availability/validators"

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/newsletter",
      middlewares: [validateAndTransformBody(NewsletterSchema)],
    },
    {
      method: ["POST"],
      matcher: "/admin/products/imports",
      middlewares: [stripUnsupportedImportColumns],
    },
    {
      method: ["POST"],
      matcher: "/admin/products/:id/availability",
      middlewares: [validateAndTransformBody(AvailabilitySchema)],
    },
  ],
})
