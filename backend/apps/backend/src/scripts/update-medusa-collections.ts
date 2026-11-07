import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/core-flows";
import * as fs from "fs";
import * as path from "path";

export default async function updateMedusaCollections({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const dataPath = path.join(__dirname, "products-data.json");
  const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const productsList = rawData.products || [];

  // Query collections in Medusa
  const { data: medusaCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle", "title"]
  });

  const collectionMap: Record<string, string> = {};
  for (const col of medusaCollections) {
    collectionMap[col.handle] = col.id;
  }
  logger.info(`Found Medusa collections: ${JSON.stringify(collectionMap)}`);

  const { data: medusaProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "metadata", "collection_id"]
  });

  const updateUpdates: Array<{
    id: string;
    collection_id: string | null | undefined;
    metadata: Record<string, unknown>;
  }> = [];

  for (const mp of medusaProducts) {
    let match = productsList.find((p: any) => p.id === mp.handle || p.id === mp.id);
    if (!match) {
      match = productsList.find((p: any) => p.name === mp.title);
    }
    if (match) {
      const targetColId = collectionMap[match.collection] || mp.collection_id;
      updateUpdates.push({
        id: mp.id,
        collection_id: targetColId,
        metadata: {
          ...(mp.metadata || {}),
          category: match.category,
          collection: match.collection,
          collectionName: match.collectionName,
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
    logger.info(`Successfully updated all ${updateUpdates.length} products in Medusa with 5-Sutra collections and occasions!`);
  }
}
