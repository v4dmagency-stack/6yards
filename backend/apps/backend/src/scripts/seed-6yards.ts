import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

// Single source of truth for the catalog. Keep in sync with js/products.js
// (the storefront's offline fallback) - both currently hold the same 38 sarees.
import SEED_DATA from "./products-data.json";

export default async function seed6Yards({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(ModuleRegistrationName.FULFILLMENT);

  logger.info("🌸 Starting 6 Yards Sarees Medusa v2 Seed Script...");

  // 1. Sales Channel
  const { data: existingSalesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });

  let salesChannel: any = existingSalesChannels.find((sc: any) => sc.name === "6 Yards Storefront");
  if (!salesChannel) {
    const { result: [createdSc] } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "6 Yards Storefront",
            description: "Primary digital storefront for 6 Yards Sarees",
          },
        ],
      },
    });
    salesChannel = createdSc;
    logger.info(`✓ Created Sales Channel: ${salesChannel.name} (${salesChannel.id})`);
  }

  // 2. Publishable API Key
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token"],
  });

  let pubKey: any = existingKeys.find((k: any) => k.title === "6 Yards Sarees Web Key");
  if (!pubKey) {
    const { result: [createdKey] } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "6 Yards Sarees Web Key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });
    pubKey = createdKey;
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: pubKey.id,
        add: [salesChannel.id],
      },
    });
    logger.info(`✓ Created & Linked Publishable Key: ${pubKey.id} (Token: ${pubKey.token})`);
  }

  // 3. Store Configuration
  const { data: existingStores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "supported_currencies.currency_code"],
  });

  if (existingStores.length === 0) {
    await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: "6 Yards Sarees",
            supported_currencies: [
              {
                currency_code: "inr",
                is_default: true,
              },
            ],
            default_sales_channel_id: salesChannel.id,
          },
        ],
      },
    });
    logger.info("✓ Created Store: 6 Yards Sarees (Default Currency: INR)");
  }

  // 4. Region (India / INR)
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  });

  let indiaRegion: any = existingRegions.find((r: any) => r.currency_code === "inr");
  if (!indiaRegion) {
    const { result: createdRegions } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries: ["in"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    indiaRegion = createdRegions[0];
    logger.info(`✓ Created Region: India (INR) (${indiaRegion.id})`);
  }

  // 5. Tax Region (GST)
  try {
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: "in",
          provider_id: "tp_system",
        },
      ],
    });
    logger.info("✓ Created Tax Region: India (GST Inclusive)");
  } catch (err: any) {
    logger.info("Tax region already configured.");
  }

  // 6. Stock Location & Fulfillment
  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });

  let centralWarehouse: any = existingLocations.find((l: any) => l.name === "Central Handloom Hub");
  if (!centralWarehouse) {
    const { result: [createdLocation] } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Central Handloom Hub",
            address: {
              city: "Varanasi",
              country_code: "IN",
              address_1: "Ghat Road Handloom Weavers Colony",
            },
          },
        ],
      },
    });
    centralWarehouse = createdLocation;

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: centralWarehouse.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: centralWarehouse.id,
        add: [salesChannel.id],
      },
    });
    logger.info(`✓ Created Stock Location: ${centralWarehouse.name}`);
  }

  // 7. Shipping Options
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "type"],
  });
  const defaultProfile = shippingProfiles[0];

  const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets();
  let fulfillmentSet = fulfillmentSets.find((f: any) => f.name === "Domestic Handloom Delivery");

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Domestic Handloom Delivery",
      type: "shipping",
      service_zones: [
        {
          name: "All India",
          geo_zones: [
            {
              country_code: "in",
              type: "country",
            },
          ],
        },
      ],
    });

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: centralWarehouse.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Handloom Delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: defaultProfile.id,
          type: {
            label: "Standard",
            description: "Carefully packaged with muslin wrap. Delivered in 3-5 business days.",
            code: "standard_delivery",
          },
          prices: [
            {
              currency_code: "inr",
              amount: 150,
            },
            {
              region_id: indiaRegion.id,
              amount: 150,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
          ],
        },
        {
          name: "Express Insured Delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: defaultProfile.id,
          type: {
            label: "Express",
            description: "Priority expedited dispatch in 1-2 business days.",
            code: "express_delivery",
          },
          prices: [
            {
              currency_code: "inr",
              amount: 350,
            },
            {
              region_id: indiaRegion.id,
              amount: 350,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
          ],
        },
      ],
    });
    logger.info("✓ Created Shipping Options (Standard ₹150, Express ₹350)");
  }

  // 8. Collections (5 Collections: Adaa, Roop, Vastra, Leher, Riwayat)
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title", "handle"],
  });

  const collectionMap: Record<string, string> = {};
  for (const col of existingCollections) {
    collectionMap[col.handle] = col.id;
  }

  for (const c of SEED_DATA.collections) {
    if (!collectionMap[c.id]) {
      const { result: [createdCol] } = await createCollectionsWorkflow(container).run({
        input: {
          collections: [
            {
              title: c.name,
              handle: c.id,
            },
          ],
        },
      });
      collectionMap[c.id] = createdCol.id;
      logger.info(`✓ Created Collection: ${c.name} (${createdCol.id})`);
    }
  }

  // 9. Categories
  const categoryNames = ["Silk", "Cotton Silk", "Banarasi", "Pichwai", "Organza", "Chiffon", "Kanjivaram"];
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  });
  const categoryMap: Record<string, string> = {};
  for (const cat of existingCategories) {
    categoryMap[cat.name.toLowerCase()] = cat.id;
  }

  const categoriesToCreate = categoryNames.filter(name => !categoryMap[name.toLowerCase()]);
  if (categoriesToCreate.length > 0) {
    const { result: createdCategories } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: categoriesToCreate.map(name => ({
          name,
          is_active: true,
        })),
      },
    });
    for (const cat of createdCategories) {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    }
    logger.info(`✓ Created Categories: ${categoriesToCreate.join(", ")}`);
  }

  // 10. Products (all sarees in products-data.json)
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
  });
  const existingHandles = new Set(existingProducts.map((p: any) => p.handle));

  logger.info(`Checking ${SEED_DATA.products.length} products from 6 Yards catalog...`);
  let addedCount = 0;

  for (const p of SEED_DATA.products) {
    const handle = p.id;
    if (existingHandles.has(handle)) {
      continue;
    }

    const colId = collectionMap[p.collection];

    // Determine category id if matches
    let matchedCatId: string | undefined = undefined;
    for (const [catName, catId] of Object.entries(categoryMap)) {
      if (p.fabric.toLowerCase().includes(catName) || p.weave.toLowerCase().includes(catName) || (p.tag && p.tag.toLowerCase().includes(catName))) {
        matchedCatId = catId;
        break;
      }
    }

    const images = (p.gallery && p.gallery.length > 0)
      ? p.gallery.map((url: string) => ({ url }))
      : [{ url: p.image }];

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: p.name,
            handle: handle,
            description: p.description,
            collection_id: colId,
            category_ids: matchedCatId ? [matchedCatId] : [],
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: defaultProfile.id,
            sales_channels: [{ id: salesChannel.id }],
            images: images,
            thumbnail: p.image,
            options: [
              {
                title: "Drape Specification",
                values: ["Standard 6.3m (with Unstitched Blouse Piece)"],
              },
            ],
            variants: [
              {
                title: "Standard Handloom Drape",
                sku: `6YD-${p.id.toUpperCase()}`,
                options: {
                  "Drape Specification": "Standard 6.3m (with Unstitched Blouse Piece)",
                },
                prices: [
                  {
                    amount: p.price,
                    currency_code: "inr",
                  },
                ],
              },
            ],
            metadata: {
              storefront_id: p.id,
              occasion: p.occasion,
              thumbnail: p.thumbnail,
              prod_code: p.prod_code,
              originalPrice: p.originalPrice,
              rating: p.rating,
              reviewsCount: p.reviewsCount,
              isBestSeller: p.isBestSeller,
              isNew: p.isNew,
              tag: p.tag,
              color: p.color,
              fabric: p.fabric,
              weave: p.weave,
              length: p.length,
              origin: p.origin,
              details: p.details,
            },
          },
        ],
      },
    });

    addedCount++;
    logger.info(`  [+${addedCount}] Seeded: ${p.name} (₹${p.price})`);
  }

  logger.info(`🎉 6 Yards Sarees Seed Complete! Added ${addedCount} sarees. All 5 collections and products ready.`);
}
