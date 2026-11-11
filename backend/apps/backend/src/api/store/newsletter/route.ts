import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createCustomersWorkflow,
  updateCustomersWorkflow,
} from "@medusajs/medusa/core-flows"
import { NewsletterBody } from "./validators"

/**
 * POST /store/newsletter
 *
 * Records a newsletter sign-up as a guest customer with
 * `metadata.newsletter_opt_in = true`, so subscribers appear in
 * Medusa Admin -> Customers and can be exported from there.
 * The body is validated by the middleware in src/api/middlewares.ts.
 */
export async function POST(
  req: MedusaRequest<NewsletterBody>,
  res: MedusaResponse
) {
  const { email } = req.validatedBody
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { email },
  })

  const metadata = {
    newsletter_opt_in: true,
    newsletter_opt_in_at: new Date().toISOString(),
  }

  if (existing.length) {
    const customer = existing[0]
    if (!customer.metadata?.newsletter_opt_in) {
      await updateCustomersWorkflow(req.scope).run({
        input: {
          selector: { id: customer.id },
          update: { metadata: { ...(customer.metadata ?? {}), ...metadata } },
        },
      })
    }
  } else {
    await createCustomersWorkflow(req.scope).run({
      input: {
        customersData: [{ email, metadata }],
      },
    })
  }

  res.status(200).json({ subscribed: true })
}
