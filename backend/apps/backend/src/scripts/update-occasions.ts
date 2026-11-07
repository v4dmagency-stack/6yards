import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/core-flows";
import * as fs from "fs";
import * as path from "path";

export default async function updateOccasions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const dataPath = path.join(__dirname, "products-data.json");
  const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const productsList = rawData.products || [];

  const { data: medusaProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "metadata"]
  });

  const updateUpdates: Array<{
    id: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const mp of medusaProducts) {
    let match = productsList.find((p: any) => p.id === mp.handle || p.id === mp.id);
    if (!match) {
      match = productsList.find((p: any) => p.name === mp.title);
    }
    if (match && match.occasion) {
      updateUpdates.push({
        id: mp.id,
        metadata: {
          ...(mp.metadata || {}),
          occasion: match.occasion,
          thumbnail: match.thumbnail,
          prod_code: match.prod_code,
          occasion_reason: match.occasion_reason
        }
      });
    }
  }

  if (updateUpdates.length > 0) {
    await updateProductsWorkflow(container).run({
      input: {
        products: updateUpdates
      }
    });
    logger.info(`Successfully updated all ${updateUpdates.length} products in Medusa with occasions!`);
  }
}
