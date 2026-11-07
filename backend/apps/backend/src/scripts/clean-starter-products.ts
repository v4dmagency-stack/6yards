import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductsWorkflow } from "@medusajs/core-flows";

export default async function cleanStarterProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Checking for default starter products to clean...");

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
  });

  const starterProducts = products.filter((p: any) =>
    p.title.startsWith("Medusa ") || p.title.toLowerCase().includes("sweat")
  );

  if (starterProducts.length > 0) {
    const ids = starterProducts.map((p: any) => p.id);
    logger.info(`Deleting ${ids.length} default starter products: ${starterProducts.map((p: any) => p.title).join(", ")}`);
    await deleteProductsWorkflow(container).run({
      input: {
        ids,
      },
    });
    logger.info("✓ Successfully removed default sample products.");
  } else {
    logger.info("No starter sample products found.");
  }
}
