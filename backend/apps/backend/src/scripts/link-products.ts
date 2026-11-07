import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { linkProductsToSalesChannelWorkflow } from "@medusajs/core-flows";

export default async function linkProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Linking all sarees to 6 Yards Storefront Sales Channel...");

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: {
      name: "6 Yards Storefront",
    },
  });

  if (!salesChannels || salesChannels.length === 0) {
    logger.error("Sales channel '6 Yards Storefront' not found!");
    return;
  }

  const salesChannelId = salesChannels[0].id;
  logger.info(`Found Sales Channel: ${salesChannelId}`);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
  });

  logger.info(`Found ${products.length} products to link.`);
  const productIds = products.map((p: any) => p.id);

  if (productIds.length > 0) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: {
        id: salesChannelId,
        add: productIds,
      },
    });
    logger.info(`✓ Successfully linked ${productIds.length} sarees to sales channel ${salesChannelId}!`);
  }
}
