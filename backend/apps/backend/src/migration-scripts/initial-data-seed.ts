import { MedusaContainer } from "@medusajs/framework"
import seed6Yards from "../scripts/seed-6yards"
import prepareStore from "../scripts/prepare-store"

/**
 * Runs once per database during `medusa db:migrate`.
 *
 * This used to be Medusa's starter seed (EUR store, Europe region and demo
 * T-shirts). On a fresh database it now creates the 6 Yards store instead:
 * India/INR region, GST tax region, Varanasi stock location, shipping options,
 * the 5 collections and all sarees, then makes them sellable (stock, free
 * shipping over INR 5,000, WELCOME10 promotion).
 *
 * Databases that already ran the old version are not affected (migration
 * scripts are tracked by file name). For those, run:
 *   npx medusa exec ./src/scripts/seed-6yards.ts
 *   npx medusa exec ./src/scripts/prepare-store.ts
 */
export default async function initialDataSeed({ container }: { container: MedusaContainer }) {
  await seed6Yards({ container })
  await prepareStore({ container, args: [] })
}
