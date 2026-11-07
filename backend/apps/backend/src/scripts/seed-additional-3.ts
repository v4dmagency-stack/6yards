import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import { createProductsWorkflow, linkProductsToSalesChannelWorkflow } from "@medusajs/core-flows";

const NEW_SAREES = [
  {
    id: "saree-riwayat-teal-purple",
    name: "Peacock Teal & Royal Purple Kadwa Kanjivaram Saree",
    handle: "peacock-teal-royal-purple-kadwa-kanjivaram-saree",
    collectionName: "Riwayat",
    categoryName: "Silk Sarees",
    price: 17200,
    description: "A magnificent dual-tone peacock teal silk body contrasted with an imperial purple pallu, intricately brocaded with antique electroplated gold zari motifs.",
    image: "assets/catalog/riwayat/riwayat-teal-purple-primary.jpg",
    gallery: [
      "assets/catalog/riwayat/riwayat-teal-purple-primary.jpg",
      "assets/catalog/riwayat/riwayat-teal-purple-hover.jpg",
      "assets/catalog/riwayat/riwayat-teal-purple-combo.jpg"
    ]
  },
  {
    id: "saree-vastra-coral-salmon",
    name: "Coral Salmon Geometric Check Artisan Handloom Saree",
    handle: "coral-salmon-geometric-check-artisan-handloom-saree",
    collectionName: "Vastra",
    categoryName: "Silk Sarees",
    price: 3800,
    description: "Featherlight coral salmon handloom saree woven with micro-grid textures and delicate temple borders, tailored for breathable comfort and effortless daytime elegance.",
    image: "assets/catalog/vastra/vastra-coral-salmon-primary.jpg",
    gallery: [
      "assets/catalog/vastra/vastra-coral-salmon-primary.jpg",
      "assets/catalog/vastra/vastra-coral-salmon-hover.jpg",
      "assets/catalog/vastra/vastra-coral-salmon-detail.jpg"
    ]
  },
  {
    id: "saree-roop-pink-green",
    name: "Rani Rose Pink & Forest Green Zari Border Kanjivaram",
    handle: "rani-rose-pink-forest-green-zari-border-kanjivaram",
    collectionName: "Roop",
    categoryName: "Silk Sarees",
    price: 16800,
    description: "Exquisite bridal harmony featuring auspicious Rani pink body framed by an authentic deep forest green korvai border shimmering with electroplated gold peacock zari.",
    image: "assets/catalog/roop/roop-pink-green-primary.jpg",
    gallery: [
      "assets/catalog/roop/roop-pink-green-primary.jpg",
      "assets/catalog/roop/roop-pink-green-hover.jpg",
      "assets/catalog/roop/roop-pink-green-drape.jpg",
      "assets/catalog/roop/roop-pink-green-detail.jpg"
    ]
  }
];

export default async function seedAdditionalSarees({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Checking for missing download folder sarees in Medusa...");

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "type"],
  });
  const defaultProfile = profiles?.find((p: any) => p.type === "default") || profiles?.[0];

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: "6 Yards Storefront" }
  });
  const salesChannelId = salesChannels?.[0]?.id;

  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title"]
  });

  const createdIds: string[] = [];

  for (const s of NEW_SAREES) {
    const { data: existing } = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle"],
      filters: { handle: s.handle }
    });

    if (existing && existing.length > 0) {
      logger.info(`Product ${s.name} already exists (ID: ${existing[0].id})`);
      createdIds.push(existing[0].id);
      continue;
    }

    const matchedCol = collections?.find((c: any) => c.title.toLowerCase().includes(s.collectionName.toLowerCase()));

    const result = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: s.name,
            handle: s.handle,
            description: s.description,
            collection_id: matchedCol?.id,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: defaultProfile?.id,
            images: s.gallery.map(url => ({ url })),
            thumbnail: s.image,
            options: [
              {
                title: "Drape Specification",
                values: ["Standard 6.3m (with Unstitched Blouse Piece)"]
              }
            ],
            variants: [
              {
                title: "Standard Handloom Drape",
                sku: `6YD-${s.id.toUpperCase()}`,
                options: {
                  "Drape Specification": "Standard 6.3m (with Unstitched Blouse Piece)"
                },
                prices: [
                  {
                    currency_code: "inr",
                    amount: s.price
                  }
                ]
              }
            ]
          }
        ]
      }
    });

    const newProd = (result as any)?.result?.[0];
    if (newProd) {
      logger.info(`✓ Successfully created Medusa product: ${s.name} (${newProd.id})`);
      createdIds.push(newProd.id);
    }
  }

  // Link to sales channel
  if (salesChannelId && createdIds.length > 0) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: {
        id: salesChannelId,
        add: createdIds
      }
    });
    logger.info(`✓ Linked ${createdIds.length} sarees to sales channel ${salesChannelId}`);
  }

  logger.info("All 38 download folder sarees are now fully in Medusa!");
}
