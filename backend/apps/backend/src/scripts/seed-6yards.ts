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

const SEED_DATA = {
  "collections": [
    {
      "id": "adaa",
      "number": "01",
      "name": "Adaa",
      "tagline": "Curated stories, woven in six yards.",
      "image": "assets/collection-adaa.jpg",
      "description": "Contemporary cuts and featherlight textures for modern celebrations."
    },
    {
      "id": "roop",
      "number": "02",
      "name": "Roop",
      "tagline": "Curated stories, woven in six yards.",
      "image": "assets/collection-roop.jpg",
      "description": "Vibrant palettes and rich jewel tones that command every room."
    },
    {
      "id": "vastra",
      "number": "03",
      "name": "Vastra",
      "tagline": "Curated stories, woven in six yards.",
      "image": "assets/collection-vastra.jpg",
      "description": "Pure geometric patterns and natural slubs celebrating traditional forms."
    },
    {
      "id": "leher",
      "number": "04",
      "name": "Leher",
      "tagline": "Curated stories, woven in six yards.",
      "image": "assets/collection-leher.jpg",
      "description": "Whispering silks, lightweight organzas and airy chiffons that dance in motion."
    },
    {
      "id": "riwayat",
      "number": "05",
      "name": "Riwayat",
      "tagline": "Curated stories, woven in six yards.",
      "image": "assets/collection-riwayat.jpg",
      "description": "Royal Kanjivarams and Banarasi heirlooms honoring centuries of Indian loomcraft."
    }
  ],
  "products": [
    {
      "id": "saree-01",
      "name": "Gulabi Mauve Pichwai Silk Saree",
      "category": "adaa",
      "collection": "adaa",
      "collectionName": "Adaa - Curated stories, woven in six yards.",
      "price": 2700,
      "originalPrice": 3200,
      "rating": 4.9,
      "reviewsCount": 94,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Pichwai Art",
      "color": "Mauve Rose & Gold Zari Geometric Pallu",
      "fabric": "Fine Handloom Silk Cotton Blend",
      "weave": "Pichwai Kamdhenu, Lotus & Tassel Finish",
      "length": "6.3 Meters (includes unstitched blouse piece)",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Featuring intricate Pichwai temple motifs of the sacred Kamdhenu and blooming lotuses, framed by delicate tassels and a modern maze border on a soft mauve rose base.",
      "image": "assets/catalog/adaa/adaa-01-primary.jpg",
      "hoverImage": "assets/catalog/adaa/adaa-01-hover.jpg",
      "gallery": [
        "assets/catalog/adaa/adaa-01-primary.jpg",
        "assets/catalog/adaa/adaa-01-hover.jpg",
        "assets/catalog/adaa/adaa-01-angle-drape.jpg",
        "assets/catalog/adaa/adaa-01-angle-border.jpg",
        "assets/catalog/adaa/adaa-01-angle-pleats.jpg",
        "assets/catalog/adaa/adaa-01-angle-detail.jpg"
      ],
      "details": [
        "Item Code: AFC 0261/2",
        "Authentic Kamdhenu sacred cow & lotus motif handloom weave",
        "Finished with hand-knotted playful tassel fringe",
        "Featherlight, breathable luxury for intimate festivities and daytime events",
        "Dry clean only. Store wrapped in pure muslin cloth"
      ]
    },
    {
      "id": "saree-02",
      "name": "Chandan Gold Pichwai Peacock Saree",
      "category": "adaa",
      "collection": "adaa",
      "collectionName": "Adaa - Curated stories, woven in six yards.",
      "price": 2700,
      "originalPrice": 3200,
      "rating": 4.8,
      "reviewsCount": 82,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Pichwai Art",
      "color": "Warm Chandan Gold & Peacock Teal",
      "fabric": "Fine Handloom Silk Cotton Blend",
      "weave": "Pichwai Lotus, Mor & Kamdhenu Tapestry",
      "length": "6.3 Meters with contrast blouse piece",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Woven in glowing Chandan gold with vibrant teal peacocks, sacred Kamdhenu cows, and pink lotuses alongside geometric maze weaving.",
      "image": "assets/catalog/adaa/adaa-02-primary.jpg",
      "hoverImage": "assets/catalog/adaa/adaa-02-hover.jpg",
      "details": [
        "Item Code: AFC 0261/1",
        "Artisan illustrated Pichwai sacred motifs with vibrant peacock accents",
        "Soft radiant gold luster with lightweight comfortable drape",
        "Includes matching unstitched blouse piece"
      ]
    },
    {
      "id": "saree-03",
      "name": "Olive Temple Kanjivaram Silk Saree",
      "category": "roop",
      "collection": "roop",
      "collectionName": "Roop - Curated stories, woven in six yards.",
      "price": 14500,
      "originalPrice": 17500,
      "rating": 5,
      "reviewsCount": 112,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Heritage Craft",
      "color": "Lush Moss Olive & Maroon Zari Border",
      "fabric": "Pure Mulberry Katan Silk",
      "weave": "Korvai Triple-Shuttle Weave with Temple Borders",
      "length": "6.3 Meters (with contrast blouse piece)",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "A timeless South Indian masterpiece featuring a lush moss green body framed by auspicious maroon and pure gold zari temple borders with ornate peacock and paisley motifs.",
      "image": "assets/catalog/roop/roop-01-primary.jpg",
      "hoverImage": "assets/catalog/roop/roop-01-hover.jpg",
      "details": [
        "Pure Mulberry Katan silk woven with 2g gold zari alloy",
        "Signature traditional contrast temple border",
        "Silk Mark Certified handloom weave",
        "Dry clean only. Muslin storage bag included"
      ]
    },
    {
      "id": "saree-04",
      "name": "Deep Wine Maroon Kadwa Silk Saree",
      "category": "roop",
      "collection": "roop",
      "collectionName": "Roop - Curated stories, woven in six yards.",
      "price": 15800,
      "originalPrice": 18900,
      "rating": 4.9,
      "reviewsCount": 86,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Bold Beauty",
      "color": "Imperial Wine Maroon & Gold Brocade",
      "fabric": "100% Pure Katan Silk",
      "weave": "Authentic Kadwa Weave with Geometric Floral Pallu",
      "length": "6.3 Meters (with unstitched blouse)",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Commanding deep wine maroon silk woven with delicate geometric floral medallions and rich antique gold zari borders that radiate royal elegance.",
      "image": "assets/catalog/roop/roop-02-primary.jpg",
      "hoverImage": "assets/catalog/roop/roop-02-hover.jpg",
      "details": [
        "Mastercraft Kadwa weave with independently locked motifs",
        "Rich imperial wine tone that shines under evening lighting",
        "Includes pure silk running blouse fabric",
        "Silk Mark guaranteed"
      ]
    },
    {
      "id": "saree-05",
      "name": "Wine Plum Zari Pinstripe Saree",
      "category": "roop",
      "collection": "roop",
      "collectionName": "Roop - Curated stories, woven in six yards.",
      "price": 12400,
      "originalPrice": 14900,
      "rating": 4.8,
      "reviewsCount": 64,
      "isBestSeller": false,
      "isNew": true,
      "tag": "Exclusive",
      "color": "Rich Plum Wine & Metallic Gold Pinstripe",
      "fabric": "Pure Handloom Tussar Katan Silk",
      "weave": "Linear Zari Pinstripes with Broad Ornate Pallu",
      "length": "6.3 Meters with blouse",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Intense wine plum body accented with fine gold zari pinstripes and a heavy ornamental brocade border, embodying modern regal poise.",
      "image": "assets/catalog/roop/roop-03-primary.jpg",
      "hoverImage": "assets/catalog/roop/roop-03-hover.jpg",
      "details": [
        "Lustrous textured silk with sharp pinstripe metallic zari",
        "Heavy festive pallu with artisanal flower band finish",
        "Breathable and structured drape for special ceremonies"
      ]
    },
    {
      "id": "saree-05-b",
      "name": "Seafoam Turquoise Gold Paisley Silk Saree",
      "category": "roop",
      "collection": "roop",
      "collectionName": "Roop - Curated stories, woven in six yards.",
      "price": 13900,
      "originalPrice": 16500,
      "rating": 4.9,
      "reviewsCount": 78,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Jewel Tone",
      "color": "Vibrant Seafoam Turquoise & Antique Gold",
      "fabric": "Pure Handloom Mulberry Silk",
      "weave": "Dense Paisley Zari Borders & Slender Jaal",
      "length": "6.3 Meters with blouse piece",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "An eye-catching seafoam turquoise jewel tone adorned with antique gold paisley and floral borders that glisten with every drape.",
      "image": "assets/catalog/roop/roop-04-primary.jpg",
      "hoverImage": "assets/catalog/roop/roop-04-hover.jpg",
      "details": [
        "Vivid oceanic jewel hue with brilliant festive contrast",
        "Exquisite mango and paisley zari filigree work",
        "Silk Mark Certified handloom weave"
      ]
    },
    {
      "id": "saree-06",
      "name": "Mauve Lilac Handloom Tussar Silk Saree",
      "category": "vastra",
      "collection": "vastra",
      "collectionName": "Vastra - Curated stories, woven in six yards.",
      "price": 3600,
      "originalPrice": 4200,
      "rating": 4.9,
      "reviewsCount": 98,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Natural Texture",
      "color": "Dusty Lilac Mauve & Silver Zari",
      "fabric": "Pure Handloom Textured Tussar Silk",
      "weave": "Linear Dual Silver Zari Pinstripes & Tassels",
      "length": "6.3 Meters with contrast blouse piece",
      "origin": "Bhagalpur, Bihar",
      "description": "Subtle elegance woven with pure natural tussar slubs in dusty lilac mauve, accented by delicate silver zari double stripes, hand-tied tassels, and oxidized medallion styling.",
      "image": "assets/catalog/vastra/vastra-01-primary.jpg",
      "hoverImage": "assets/catalog/vastra/vastra-01-hover.jpg",
      "details": [
        "Naturally textured wild Tussar handloom silk",
        "Silver zari woven horizontal pinstripes with fringed tassels",
        "Breathable and comfortable for celebrations and daytime events",
        "Silk Mark guaranteed handloom piece"
      ]
    },
    {
      "id": "saree-07",
      "name": "Crimson Rust Handloom Tussar Silk Saree",
      "category": "vastra",
      "collection": "vastra",
      "collectionName": "Vastra - Curated stories, woven in six yards.",
      "price": 3600,
      "originalPrice": 4200,
      "rating": 4.8,
      "reviewsCount": 76,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Timeless Form",
      "color": "Deep Crimson Rust & Silver Zari",
      "fabric": "Pure Handloom Textured Tussar Silk",
      "weave": "Linear Silver Zari Pinstripes with Rich Tassels",
      "length": "6.3 Meters with blouse piece",
      "origin": "Bhagalpur, Bihar",
      "description": "An earthy, rich crimson rust body woven in pure tussar silk, highlighted with radiant silver zari border lines and handcrafted fringe tassels.",
      "image": "assets/catalog/vastra/vastra-02-primary.jpg",
      "hoverImage": "assets/catalog/vastra/vastra-02-hover.jpg",
      "details": [
        "Pure textured handloom Tussar base with organic sheen",
        "Signature silver alloy pinstripes",
        "Complete with running unstitched blouse fabric",
        "Dry clean only"
      ]
    },
    {
      "id": "saree-07-b",
      "name": "Sage Mint Artisan Handloom Rib Saree",
      "category": "vastra",
      "collection": "vastra",
      "collectionName": "Vastra - Curated stories, woven in six yards.",
      "price": 990,
      "originalPrice": 1499,
      "rating": 4.8,
      "reviewsCount": 114,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Artisan Value",
      "color": "Muted Sage Mint & Fine Gold Zari Weft",
      "fabric": "Lightweight Cotton-Silk Handloom Blend",
      "weave": "Linear Handloom Ribbed Pinstripe with Knotted Tassels",
      "length": "6.2 Meters with blouse",
      "origin": "Chanderi, Madhya Pradesh",
      "description": "Item Code: ACS-083/3. Everyday luxury in serene sage mint, highlighted with fine metallic gold and ivory pinstripes and rustic artisan tassels.",
      "image": "assets/catalog/vastra/vastra-03-primary.jpg",
      "hoverImage": "assets/catalog/vastra/vastra-03-hover.jpg",
      "details": [
        "Item Code: ACS-083/3 (Priced at ₹990)",
        "Ultra-breathable featherlight drape perfect for warm climates",
        "Hand-finished organic cotton-linen tassels",
        "Machine wash gentle or hand wash cold"
      ]
    },
    {
      "id": "saree-07-c",
      "name": "Slate Indigo Artisan Handloom Rib Saree",
      "category": "vastra",
      "collection": "vastra",
      "collectionName": "Vastra - Curated stories, woven in six yards.",
      "price": 990,
      "originalPrice": 1499,
      "rating": 4.7,
      "reviewsCount": 89,
      "isBestSeller": false,
      "isNew": true,
      "tag": "Artisan Value",
      "color": "Dusty Slate Indigo & Ivory Pinstripe",
      "fabric": "Lightweight Cotton-Silk Handloom Blend",
      "weave": "Linear Handloom Ribbed Weft with Knotted Tassels",
      "length": "6.2 Meters with blouse",
      "origin": "Chanderi, Madhya Pradesh",
      "description": "Item Code: ACS-083. Sophisticated dusty slate indigo drape with micro gold & cream ribbed stripes and handmade tassels.",
      "image": "assets/catalog/vastra/vastra-04-primary.jpg",
      "hoverImage": "assets/catalog/vastra/vastra-04-hover.jpg",
      "details": [
        "Item Code: ACS-083 (Priced at ₹990)",
        "Featherlight everyday comfort with structured fall",
        "Finished with hand-tied natural yarn tassels",
        "Easy care handloom fabric"
      ]
    },
    {
      "id": "saree-07-d",
      "name": "Taupe Charcoal Artisan Handloom Rib Saree",
      "category": "vastra",
      "collection": "vastra",
      "collectionName": "Vastra - Curated stories, woven in six yards.",
      "price": 990,
      "originalPrice": 1499,
      "rating": 4.8,
      "reviewsCount": 92,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Artisan Value",
      "color": "Warm Taupe Charcoal & Golden Rib",
      "fabric": "Lightweight Cotton-Silk Handloom Blend",
      "weave": "Linear Handloom Ribbed Pinstripe with Knotted Tassels",
      "length": "6.2 Meters with blouse",
      "origin": "Chanderi, Madhya Pradesh",
      "description": "Item Code: ACS-083/2. A refined neutral taupe charcoal handloom drape woven with warm golden pinstripes and delicate white tassels.",
      "image": "assets/catalog/vastra/vastra-05-primary.jpg",
      "hoverImage": "assets/catalog/vastra/vastra-05-hover.jpg",
      "details": [
        "Item Code: ACS-083/2 (Priced at ₹990)",
        "Chic earthy neutral palette suitable for workwear & casual soirees",
        "Hand-knotted tassel fringe",
        "All-day comfortable drape"
      ]
    },
    {
      "id": "saree-08",
      "name": "Kohl Black & Bronze Tapestry Check Saree",
      "category": "leher",
      "collection": "leher",
      "collectionName": "Leher - Curated stories, woven in six yards.",
      "price": 7100,
      "originalPrice": 8500,
      "rating": 4.9,
      "reviewsCount": 115,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Signature Weave",
      "color": "Kohl Black & Bronze Gold Check",
      "fabric": "Pure Handwoven Silk Cotton Blend",
      "weave": "Graph Check Grid with Antique Tapestry Pallu & Tassels",
      "length": "6.3 Meters with contrast pallu",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Item Code: ALN/B-001/2 (Priced at ₹7,100). Evoking twilight over the sacred ghats, this Kohl black drape features fine metallic gold grid lines and a rich bronze geometric brocade pallu with hand-tied tassels.",
      "image": "assets/catalog/leher/leher-01-primary.jpg",
      "hoverImage": "assets/catalog/leher/leher-01-hover.jpg",
      "details": [
        "Item Code: ALN/B-001/2 (Priced at ₹7,100)",
        "Intricate architectural window grid (jaali) motif",
        "Lustrous bronze gold zari border with fine black silk tassels",
        "Featherlight drape that cascades fluidly",
        "Silk Mark Certified"
      ]
    },
    {
      "id": "saree-09",
      "name": "Rosewood Crimson Grid Silk Saree",
      "category": "leher",
      "collection": "leher",
      "collectionName": "Leher - Curated stories, woven in six yards.",
      "price": 6800,
      "originalPrice": 8200,
      "rating": 4.8,
      "reviewsCount": 88,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Fluid Drapes",
      "color": "Dusty Rosewood Crimson & Antique Bronze Zari",
      "fabric": "Ethereal Handloom Silk Cotton Blend",
      "weave": "Linear Grid Checks with Heavy Brocade Borders",
      "length": "6.3 Meters with blouse piece",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "A soothing rosewood crimson drape woven with micro metallic grid checks and framed by an ornate antique bronze chevron border that drapes like gentle ripples.",
      "image": "assets/catalog/leher/leher-02-primary.jpg",
      "hoverImage": "assets/catalog/leher/leher-02-hover.jpg",
      "details": [
        "Soft breathable silk cotton base with gossamer finish",
        "Subtle pinstripe grid texture with antique metallic sheen",
        "Includes matched unstitched blouse piece",
        "Dry clean recommended"
      ]
    },
    {
      "id": "saree-09-b",
      "name": "Forest Emerald & Mustard Gold Tapestry Saree",
      "category": "leher",
      "collection": "leher",
      "collectionName": "Leher - Curated stories, woven in six yards.",
      "price": 7400,
      "originalPrice": 8900,
      "rating": 4.9,
      "reviewsCount": 94,
      "isBestSeller": false,
      "isNew": true,
      "tag": "Exclusive",
      "color": "Deep Forest Emerald & Warm Mustard Gold",
      "fabric": "Pure Handloom Silk Cotton",
      "weave": "Windowpane Checks with Chevron Brocade Pallu & Green Tassels",
      "length": "6.3 Meters with contrast pallu",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Deep forest emerald green body adorned with delicate gold grid lines and a striking mustard gold tapestry pallu finished with lush green tassel fringes.",
      "image": "assets/catalog/leher/leher-03-primary.jpg",
      "hoverImage": "assets/catalog/leher/leher-03-hover.jpg",
      "details": [
        "Rich dual-tone contrast between emerald body and mustard pallu",
        "Artisanal chevron brocade and temple border weaving",
        "Hand-finished silk tassel fringes",
        "Silk Mark guaranteed"
      ]
    },
    {
      "id": "saree-09-c",
      "name": "Olive Green Grid & Striped Brocade Saree",
      "category": "leher",
      "collection": "leher",
      "collectionName": "Leher - Curated stories, woven in six yards.",
      "price": 6900,
      "originalPrice": 8300,
      "rating": 4.8,
      "reviewsCount": 76,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Fluid Drapes",
      "color": "Earthy Olive Green & Bronze Copper Zari",
      "fabric": "Pure Handloom Silk Cotton Blend",
      "weave": "Linear Micro Checks with Multi-Band Brocade Border",
      "length": "6.3 Meters with blouse",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Earthy olive green tones meet copper-bronze zari in this check drape, accented with multi-stripe ornamental bands and delicate fringed selvedge.",
      "image": "assets/catalog/leher/leher-04-primary.jpg",
      "hoverImage": "assets/catalog/leher/leher-04-hover.jpg",
      "details": [
        "Organic earthy olive shade with metallic copper highlights",
        "Featherlight texture with a fluid cascade fall",
        "Silver medallion styling included in photoshoot",
        "Perfect for day-to-evening celebrations"
      ]
    },
    {
      "id": "saree-10",
      "name": "Emerald Green Royal Kanjivaram Silk Saree",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 16500,
      "originalPrice": 19800,
      "rating": 5,
      "reviewsCount": 142,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Heritage Craft",
      "color": "Imperial Emerald Green & Gold Temple Zari",
      "fabric": "Pure Heavy Mulberry Kanchipuram Silk",
      "weave": "Korvai Triple-Shuttle Weave with Regal Square Buttas",
      "length": "6.3 Meters with grand pallu",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "A prestigious royal emerald green heirloom drape woven with dense antique gold zari temple borders, dark wine selvedge, and geometric floral medallions.",
      "image": "assets/catalog/riwayat/riwayat-01-primary.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-01-hover.jpg",
      "details": [
        "Pure Mulberry Katan silk woven with pure gold zari alloy",
        "Signature traditional contrast temple border",
        "Silk Mark Certified handloom genuine weave",
        "Dry clean only. Muslin storage bag included"
      ]
    },
    {
      "id": "saree-11",
      "name": "Vermilion Brick Red Royal Kanjivaram Saree",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 15500,
      "originalPrice": 18500,
      "rating": 4.9,
      "reviewsCount": 118,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Royal Heritage",
      "color": "Auspicious Vermilion Red & Rich Gold Brocade",
      "fabric": "100% Pure Katan Silk",
      "weave": "Authentic Kanchipuram Korvai with Floral Bootis",
      "length": "6.3 Meters (with unstitched blouse piece)",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "Item Code: PKES-0089/2 (Priced at ₹15,500). Auspicious vermilion brick red silk adorned with delicate gold floral sprays, broad temple zari borders, and silver medallion styling.",
      "image": "assets/catalog/riwayat/riwayat-02-primary.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-02-hover.jpg",
      "details": [
        "Item Code: PKES-0089/2 (Priced at ₹15,500)",
        "Pure Mulberry 3-ply silk for a regal structured fall",
        "Heavy floral jaal pallu with traditional zari work",
        "Silk Mark guaranteed"
      ]
    },
    {
      "id": "saree-12",
      "name": "Rust Amber Ochre Kanjivaram Silk Saree",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 15500,
      "originalPrice": 18500,
      "rating": 4.9,
      "reviewsCount": 84,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Heritage Craft",
      "color": "Earthy Rust Amber Ochre & Gold Temple Zari",
      "fabric": "Pure Heavy Mulberry Silk",
      "weave": "Interlocking Korvai Weave with Fine Motifs",
      "length": "6.3 Meters with contrast pallu",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "Item Code: PKES-0089/3 (Priced at ₹15,500). An earthy rust amber ochre masterpiece enriched with fine gold zari buttis, deep wine contrast edging, and radiant temple weaving.",
      "image": "assets/catalog/riwayat/riwayat-03-primary.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-03-hover.jpg",
      "details": [
        "Item Code: PKES-0089/3 (Priced at ₹15,500)",
        "Traditional pure silk body with durable 3-ply yarn",
        "Complete with heavy brocade blouse fabric",
        "Silk Mark Certified"
      ]
    },
    {
      "id": "saree-12-b",
      "name": "Taupe Lilac Window Check Kanjivaram Saree",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 13000,
      "originalPrice": 15500,
      "rating": 4.8,
      "reviewsCount": 72,
      "isBestSeller": false,
      "isNew": true,
      "tag": "Exclusive",
      "color": "Sophisticated Taupe Lilac & Royal Peacock Zari",
      "fabric": "Pure Handloom Mulberry Silk",
      "weave": "Micro Grid Checks with Ornate Peacock Pallu",
      "length": "6.3 Meters with blouse",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "Item Code: SSB-0027 (Priced at ₹13,000). Modern sophistication in muted taupe lilac with glistening gold grid checks and an opulent heavy mor (peacock) motif border.",
      "image": "assets/catalog/riwayat/riwayat-04-primary.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-04-hover.jpg",
      "details": [
        "Item Code: SSB-0027 (Priced at ₹13,000)",
        "Micro grid architectural check pattern",
        "Dense peacock and chakra gold zari border detailing",
        "Featherlight yet royal celebratory drape"
      ]
    },
    {
      "id": "saree-12-c",
      "name": "Peacock Sapphire Blue Kanjivaram Silk Saree",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 16800,
      "originalPrice": 20500,
      "rating": 5,
      "reviewsCount": 136,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Royal Heritage",
      "color": "Electric Sapphire Blue & Magenta Gold Border",
      "fabric": "100% Pure Heavy Mulberry Silk",
      "weave": "Korvai Triple-Shuttle with Floral Buttas",
      "length": "6.3 Meters with grand contrast pallu",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "A showstopping royal sapphire blue drape paired with rich magenta and gold zari borders, exuding supreme festive majesty.",
      "image": "assets/catalog/riwayat/riwayat-05-primary.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-05-hover.jpg",
      "details": [
        "Authentic Silk Mark certified pure Kanchipuram silk",
        "Stunning two-tone contrast magenta and gold brocade pallu",
        "Heirloom keepsake packaging included",
        "Dry clean only"
      ]
    },
    {
      "id": "saree-12-d",
      "name": "Cerulean Teal & Plum Kanjivaram Silk Saree",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 15900,
      "originalPrice": 19200,
      "rating": 4.9,
      "reviewsCount": 95,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Heritage Craft",
      "color": "Cerulean Mineral Teal & Deep Plum Border",
      "fabric": "Pure Heavy Mulberry Kanchipuram Silk",
      "weave": "Korvai Triple-Shuttle Weave with Contrast Border",
      "length": "6.3 Meters with grand contrast pallu",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "A breathtaking contrast drape featuring a calming cerulean mineral teal body framed by deep plum purple borders and pure gold metallic pinstripes.",
      "image": "assets/catalog/riwayat/riwayat-06-primary.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-06-hover.jpg",
      "details": [
        "Silk Mark Certified handloom weave with official QR verification label",
        "Signature high-contrast deep plum and mineral teal palette",
        "Triple-shuttle interlocking Korvai technique",
        "Complimentary satin petticoat fabric included"
      ]
    },
    {
      "id": "saree-12-e",
      "name": "Midnight Royal Blue Kadwa Brocade Silk Saree",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 18200,
      "originalPrice": 21900,
      "rating": 5,
      "reviewsCount": 110,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Royal Brocade",
      "color": "Midnight Royal Blue & Antique Gold Floral Jaal",
      "fabric": "100% Pure Mulberry Katan Silk",
      "weave": "Heavy Kadwa Floral Medallion Weave with Fringed Tassels",
      "length": "6.3 Meters with heavy brocade blouse",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "A queenly ceremonial drape in deep midnight royal blue, lavishly adorned with dense antique gold zari floral lattice (jaal) and hand-knotted royal blue silk tassels.",
      "image": "assets/catalog/riwayat/riwayat-07-primary.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-07-hover.jpg",
      "details": [
        "Pure Mulberry Katan silk woven with rich 2g gold zari alloy",
        "Opulent floral diaper grid pattern across the entire body",
        "Hand-finished lush blue silk tassels along the pallu edge",
        "Silk Mark & Handloom Mark guaranteed"
      ]
    },
    {
      "id": "saree-adaa-cream-bird",
      "name": "Ivory Cream Floral & Songbird Paithani Saree",
      "category": "adaa",
      "collection": "adaa",
      "collectionName": "Adaa - Curated stories, woven in six yards.",
      "price": 3800,
      "originalPrice": 4600,
      "rating": 4.9,
      "reviewsCount": 68,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Artisan Illustrated",
      "color": "Ivory Cream & Polychrome Floral Pallu",
      "fabric": "Fine Handloom Silk Cotton Blend",
      "weave": "Artisan Illustrated Songbird & Floral Tapestry",
      "length": "6.3 Meters (includes unstitched blouse piece)",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Luminous ivory cream drape crowned by an exquisite songbird perched amidst blooming lotus branches on the pallu, accented with pure gold zari borders.",
      "image": "assets/catalog/adaa/adaa-cream-bird-angle-1.jpg",
      "hoverImage": "assets/catalog/adaa/adaa-cream-bird-angle-2.jpg",
      "gallery": [
        "assets/catalog/adaa/adaa-cream-bird-angle-1.jpg",
        "assets/catalog/adaa/adaa-cream-bird-angle-2.jpg",
        "assets/catalog/adaa/adaa-cream-bird-angle-3.jpg",
        "assets/catalog/adaa/adaa-cream-bird-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-408275",
        "Fine silk-cotton weave with featherlight airy drape",
        "Intricate songbird and floral medallion artwork on pallu",
        "Lustrous gold zari borders with delicate running buttas",
        "Dry clean recommended"
      ]
    },
    {
      "id": "saree-adaa-mint-leaf",
      "name": "Mint Sea Green Embossed Leaf Silk Saree",
      "category": "adaa",
      "collection": "adaa",
      "collectionName": "Adaa - Curated stories, woven in six yards.",
      "price": 3400,
      "originalPrice": 4200,
      "rating": 4.8,
      "reviewsCount": 54,
      "isBestSeller": false,
      "isNew": true,
      "tag": "Subtle Sheen",
      "color": "Mint Sea Green & Champagne Zari",
      "fabric": "Embossed Chanderi Silk Blend",
      "weave": "Jacquard Embossed Leaf Texture & Contrast Zari Border",
      "length": "6.3 Meters with contrast unstitched blouse",
      "origin": "Chanderi, Madhya Pradesh",
      "description": "Refreshing mint sea green sheer body highlighting raised embossed leaf patterns and a gleaming champagne gold zari pallu with delicate tassels.",
      "image": "assets/catalog/adaa/adaa-mint-leaf-angle-1.jpg",
      "hoverImage": "assets/catalog/adaa/adaa-mint-leaf-angle-2.jpg",
      "gallery": [
        "assets/catalog/adaa/adaa-mint-leaf-angle-1.jpg",
        "assets/catalog/adaa/adaa-mint-leaf-angle-2.jpg",
        "assets/catalog/adaa/adaa-mint-leaf-angle-3.jpg",
        "assets/catalog/adaa/adaa-mint-leaf-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-506183",
        "Textured self-embossed leaf weave with delicate drape",
        "Breathable silk-cotton handfeel for daytime elegance",
        "Includes matching running blouse fabric",
        "Dry clean only"
      ]
    },
    {
      "id": "saree-adaa-teal-elephant",
      "name": "Peacock Teal Kalpavriksha & Hathi Saree",
      "category": "adaa",
      "collection": "adaa",
      "collectionName": "Adaa - Curated stories, woven in six yards.",
      "price": 3600,
      "originalPrice": 4500,
      "rating": 4.9,
      "reviewsCount": 77,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Tree of Life",
      "color": "Vibrant Peacock Teal & Antique Gold Zari",
      "fabric": "Artisan Silk Cotton Handloom",
      "weave": "Pichwai Hathi (Elephant) & Kalpavriksha Tree Motifs",
      "length": "6.3 Meters (includes unstitched blouse piece)",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Vibrant peacock teal weave adorned with the sacred Tree of Life (Kalpavriksha) and caparisoned royal elephants along the pallu and borders.",
      "image": "assets/catalog/adaa/adaa-teal-elephant-angle-1.jpg",
      "hoverImage": "assets/catalog/adaa/adaa-teal-elephant-angle-2.jpg",
      "gallery": [
        "assets/catalog/adaa/adaa-teal-elephant-angle-1.jpg",
        "assets/catalog/adaa/adaa-teal-elephant-angle-2.jpg",
        "assets/catalog/adaa/adaa-teal-elephant-angle-3.jpg",
        "assets/catalog/adaa/adaa-teal-elephant-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-749320",
        "Rich jewel peacock teal tone with antique gold zari sheen",
        "Intricate Pichwai tree of life & elephant narrative weave",
        "Hand-knotted tassel fringe along the pallu edge",
        "Dry clean recommended"
      ]
    },
    {
      "id": "saree-adaa-lilac-sketch",
      "name": "Lilac Silver Floral Botanical Sketch Saree",
      "category": "adaa",
      "collection": "adaa",
      "collectionName": "Adaa - Curated stories, woven in six yards.",
      "price": 3200,
      "originalPrice": 3900,
      "rating": 4.8,
      "reviewsCount": 49,
      "isBestSeller": false,
      "isNew": true,
      "tag": "Botanical Art",
      "color": "Muted Lilac Grey & Silver Zari Border",
      "fabric": "Modal Silk Satin Blend",
      "weave": "Artisan Pen-Sketch Floral Print with Zari Weave Border",
      "length": "6.3 Meters with blouse piece",
      "origin": "Surat, Gujarat",
      "description": "Contemporary pastel elegance in soft lilac grey, embellished with delicate pen-and-ink botanical floral sketches and a refined silver zari border.",
      "image": "assets/catalog/adaa/adaa-lilac-sketch-angle-1.jpg",
      "hoverImage": "assets/catalog/adaa/adaa-lilac-sketch-angle-2.jpg",
      "gallery": [
        "assets/catalog/adaa/adaa-lilac-sketch-angle-1.jpg",
        "assets/catalog/adaa/adaa-lilac-sketch-angle-2.jpg",
        "assets/catalog/adaa/adaa-lilac-sketch-angle-3.jpg",
        "assets/catalog/adaa/adaa-lilac-sketch-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-927461",
        "Ultra-smooth flowing modal silk satin with liquid drape",
        "Modern fine-line botanical floral sketch design",
        "Includes unstitched matching blouse fabric",
        "Gentle handwash or dry clean"
      ]
    },
    {
      "id": "saree-roop-teal-peacock",
      "name": "Teal Peacock Katan Silk Paisley Brocade Saree",
      "category": "roop",
      "collection": "roop",
      "collectionName": "Roop - Curated stories, woven in six yards.",
      "price": 14800,
      "originalPrice": 17800,
      "rating": 5,
      "reviewsCount": 92,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Pure Katan Silk",
      "color": "Teal Peacock Green & Warm Gold Zari",
      "fabric": "100% Pure Mulberry Katan Silk",
      "weave": "Kadwa Paisley (Kalka) Boota & Grand Zari Pallu",
      "length": "6.3 Meters (includes brocade blouse piece)",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Exquisite ceremonial Katan silk in a regal teal peacock hue, lavished with intricate gold zari kalka paisleys and a majestic architectural brocade border.",
      "image": "assets/catalog/roop/roop-teal-peacock-angle-1.jpg",
      "hoverImage": "assets/catalog/roop/roop-teal-peacock-angle-2.jpg",
      "gallery": [
        "assets/catalog/roop/roop-teal-peacock-angle-1.jpg",
        "assets/catalog/roop/roop-teal-peacock-angle-2.jpg",
        "assets/catalog/roop/roop-teal-peacock-angle-3.jpg",
        "assets/catalog/roop/roop-teal-peacock-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-385017",
        "Authentic Banarasi handloom weave with Silk Mark guarantee",
        "Heavy 2-gram gold zari kalka motifs across the body",
        "Includes contrast unstitched heavy brocade blouse fabric",
        "Dry clean only. Store wrapped in muslin"
      ]
    },
    {
      "id": "saree-roop-wine-temple",
      "name": "Imperial Wine Maroon Temple Brocade Saree",
      "category": "roop",
      "collection": "roop",
      "collectionName": "Roop - Curated stories, woven in six yards.",
      "price": 15400,
      "originalPrice": 18500,
      "rating": 4.9,
      "reviewsCount": 85,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Royal Heirloom",
      "color": "Imperial Wine Maroon & Rich Gold Zari",
      "fabric": "100% Pure Katan Silk",
      "weave": "Korvai Temple Border with Heavy Kadwa Bootis",
      "length": "6.3 Meters with matching blouse piece",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "Rich imperial wine maroon silk defined by sacred temple spire (gopuram) zari borders, all-over medallion buttas, and a magnificent ceremonial pallu.",
      "image": "assets/catalog/roop/roop-wine-temple-angle-1.jpg",
      "hoverImage": "assets/catalog/roop/roop-wine-temple-angle-2.jpg",
      "gallery": [
        "assets/catalog/roop/roop-wine-temple-angle-1.jpg",
        "assets/catalog/roop/roop-wine-temple-angle-2.jpg",
        "assets/catalog/roop/roop-wine-temple-angle-3.jpg",
        "assets/catalog/roop/roop-wine-temple-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-531849",
        "Pure Mulberry Katan Silk with hallmark Silk Mark certification",
        "Solid temple borders hand-interlocked using mastercraft technique",
        "Lavish multi-tier zari pallu with rich sheen",
        "Dry clean only"
      ]
    },
    {
      "id": "saree-vastra-peach-flamingo",
      "name": "Peach Beige Flamingo Botanical Linen-Silk Saree",
      "category": "vastra",
      "collection": "vastra",
      "collectionName": "Vastra - Curated stories, woven in six yards.",
      "price": 4200,
      "originalPrice": 5000,
      "rating": 4.8,
      "reviewsCount": 61,
      "isBestSeller": false,
      "isNew": true,
      "tag": "Artisan Linen",
      "color": "Warm Peach Beige & Coral Flamingo Motifs",
      "fabric": "Organic Linen & Tussar Silk Blend",
      "weave": "Botanical Flora & Fauna Print with Zari Selvedge",
      "length": "6.3 Meters with matching unstitched blouse",
      "origin": "Bhagalpur, Bihar",
      "description": "An effortless summer luxury in breathable peach beige linen-tussar, featuring whimsical flamingo waterbirds nestled amidst tropical botanical greenery.",
      "image": "assets/catalog/vastra/vastra-peach-flamingo-angle-1.jpg",
      "hoverImage": "assets/catalog/vastra/vastra-peach-flamingo-angle-2.jpg",
      "gallery": [
        "assets/catalog/vastra/vastra-peach-flamingo-angle-1.jpg",
        "assets/catalog/vastra/vastra-peach-flamingo-angle-2.jpg",
        "assets/catalog/vastra/vastra-peach-flamingo-angle-3.jpg",
        "assets/catalog/vastra/vastra-peach-flamingo-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-163948",
        "Lightweight breathable linen-tussar blend with natural texture",
        "Soft soothing earthy palette designed for day celebrations",
        "Includes running unstitched blouse piece",
        "Handwash or dry clean"
      ]
    },
    {
      "id": "saree-vastra-beige-tussar",
      "name": "Natural Golden Beige Raw Tussar Silk Saree",
      "category": "vastra",
      "collection": "vastra",
      "collectionName": "Vastra - Curated stories, woven in six yards.",
      "price": 5600,
      "originalPrice": 6800,
      "rating": 4.9,
      "reviewsCount": 73,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Pure Tussar",
      "color": "Natural Honey Beige & Antique Gold Zari",
      "fabric": "100% Pure Desi Tussar Silk",
      "weave": "Handspun Wild Silk Ribbed Texture & Zari Pallu",
      "length": "6.3 Meters (includes unstitched blouse piece)",
      "origin": "Bhagalpur, Bihar",
      "description": "Unbleached pure Desi Tussar silk in its native honey-golden glow, celebrated for its organic ribbed slub texture and understated festive zari pinstripes.",
      "image": "assets/catalog/vastra/vastra-beige-tussar-angle-1.jpg",
      "hoverImage": "assets/catalog/vastra/vastra-beige-tussar-angle-2.jpg",
      "gallery": [
        "assets/catalog/vastra/vastra-beige-tussar-angle-1.jpg",
        "assets/catalog/vastra/vastra-beige-tussar-angle-2.jpg",
        "assets/catalog/vastra/vastra-beige-tussar-angle-3.jpg",
        "assets/catalog/vastra/vastra-beige-tussar-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-372950",
        "Certified 100% Handloom Tussar with Silk Mark",
        "Natural wild silk sheen that softens beautifully with every wear",
        "Handcrafted in the legendary silk hubs of Bhagalpur",
        "Dry clean only"
      ]
    },
    {
      "id": "saree-leher-slate-silver",
      "name": "Slate Smoke Grey & Silver Kalka Brocade Saree",
      "category": "leher",
      "collection": "leher",
      "collectionName": "Leher - Curated stories, woven in six yards.",
      "price": 6800,
      "originalPrice": 8200,
      "rating": 4.9,
      "reviewsCount": 58,
      "isBestSeller": false,
      "isNew": true,
      "tag": "Silver Zari",
      "color": "Slate Smoke Grey & Sterling Silver Zari",
      "fabric": "Fine Silk Cotton Jacquard",
      "weave": "Silver Zari Paisley Grid & Flowing Chevron Borders",
      "length": "6.3 Meters with contrast blouse piece",
      "origin": "Chanderi, Madhya Pradesh",
      "description": "Sleek and contemporary in slate smoke grey, illuminated by intricate sterling silver zari paisleys and undulating wave motifs across the pallu.",
      "image": "assets/catalog/leher/leher-slate-silver-angle-1.jpg",
      "hoverImage": "assets/catalog/leher/leher-slate-silver-angle-2.jpg",
      "gallery": [
        "assets/catalog/leher/leher-slate-silver-angle-1.jpg",
        "assets/catalog/leher/leher-slate-silver-angle-2.jpg",
        "assets/catalog/leher/leher-slate-silver-angle-3.jpg",
        "assets/catalog/leher/leher-slate-silver-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-692154",
        "Featherweight silk-cotton drape with crisp modern pleating",
        "Dazzling pure silver-toned zari detailing",
        "Includes unstitched contrast silver blouse fabric",
        "Dry clean recommended"
      ]
    },
    {
      "id": "saree-leher-bronze-kalamkari",
      "name": "Bronze Ochre Grid & Kalamkari Floral Pallu Saree",
      "category": "leher",
      "collection": "leher",
      "collectionName": "Leher - Curated stories, woven in six yards.",
      "price": 7200,
      "originalPrice": 8600,
      "rating": 4.8,
      "reviewsCount": 64,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Geometric & Art",
      "color": "Bronze Ochre Check & Rust Floral Pallu",
      "fabric": "Handloom Raw Silk Cotton Blend",
      "weave": "Graphic Windowpane Check & Artisan Kalamkari Tapestry",
      "length": "6.3 Meters with blouse piece",
      "origin": "Varanasi, Uttar Pradesh",
      "description": "A striking union of modern geometric bronze grid checks on the body paired with a hand-painted heritage Kalamkari floral tapestry on the pallu.",
      "image": "assets/catalog/leher/leher-bronze-kalamkari-angle-1.jpg",
      "hoverImage": "assets/catalog/leher/leher-bronze-kalamkari-angle-2.jpg",
      "gallery": [
        "assets/catalog/leher/leher-bronze-kalamkari-angle-1.jpg",
        "assets/catalog/leher/leher-bronze-kalamkari-angle-2.jpg",
        "assets/catalog/leher/leher-bronze-kalamkari-angle-3.jpg",
        "assets/catalog/leher/leher-bronze-kalamkari-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-850193",
        "Artisan geometric check body with comfortable fall",
        "Rich multi-colored Kalamkari illustrated pallu",
        "Finished with hand-knotted tassel fringe",
        "Dry clean only"
      ]
    },
    {
      "id": "saree-riwayat-purple-silver",
      "name": "Imperial Violet Purple & Silver Kadwa Silk Saree",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 16800,
      "originalPrice": 19800,
      "rating": 5,
      "reviewsCount": 104,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Pure Kanjivaram",
      "color": "Imperial Violet Purple & Fine Silver Zari",
      "fabric": "100% Pure Mulberry Silk",
      "weave": "Double-Warp Korvai with Silver Paisley Bootas",
      "length": "6.3 Meters (includes unstitched blouse piece)",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "Deep imperial violet purple pure silk woven with glistening silver zari paisley kalkas and a majestic temple-crested ceremonial pallu.",
      "image": "assets/catalog/riwayat/riwayat-purple-silver-angle-1.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-purple-silver-angle-2.jpg",
      "gallery": [
        "assets/catalog/riwayat/riwayat-purple-silver-angle-1.jpg",
        "assets/catalog/riwayat/riwayat-purple-silver-angle-2.jpg",
        "assets/catalog/riwayat/riwayat-purple-silver-angle-3.jpg",
        "assets/catalog/riwayat/riwayat-purple-silver-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-294716",
        "Pure Mulberry Silk Certified with Silk Mark & Handloom Mark",
        "High-density pure silver zari kalka motifs across the body",
        "Heavy heirloom quality with signature luxury luster",
        "Dry clean only. Muslin pouch included"
      ]
    },
    {
      "id": "saree-riwayat-cerulean-magenta",
      "name": "Cerulean Royal Blue & Rani Pink Contrast Kanjivaram",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 17500,
      "originalPrice": 20800,
      "rating": 4.9,
      "reviewsCount": 118,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Heirloom Contrast",
      "color": "Cerulean Royal Blue, Rani Pink & 2G Gold Zari",
      "fabric": "100% Pure Mulberry Silk",
      "weave": "Traditional Korvai Interlocked Contrast Pallu with Gold Buttis",
      "length": "6.3 Meters with contrast magenta blouse piece",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "A breathtaking classic contrast: brilliant cerulean blue body complemented by an auspicious Rani magenta pink border and pallu drenched in 2-gram gold zari buttas.",
      "image": "assets/catalog/riwayat/riwayat-cerulean-magenta-angle-1.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-cerulean-magenta-angle-2.jpg",
      "gallery": [
        "assets/catalog/riwayat/riwayat-cerulean-magenta-angle-1.jpg",
        "assets/catalog/riwayat/riwayat-cerulean-magenta-angle-2.jpg",
        "assets/catalog/riwayat/riwayat-cerulean-magenta-angle-3.jpg",
        "assets/catalog/riwayat/riwayat-cerulean-magenta-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-614728",
        "Authentic Korvai interlocking weave by senior master weavers",
        "Pure Mulberry Silk with Silk Mark guarantee",
        "Lustrous gold zari floral circular buttas and grand pallu",
        "Dry clean only"
      ]
    },
    {
      "id": "saree-riwayat-bottle-green",
      "name": "Bottle Green & Aubergine Purple Royal Kanjivaram",
      "category": "riwayat",
      "collection": "riwayat",
      "collectionName": "Riwayat - Curated stories, woven in six yards.",
      "price": 18200,
      "originalPrice": 21500,
      "rating": 5,
      "reviewsCount": 126,
      "isBestSeller": true,
      "isNew": true,
      "tag": "Bridal Masterpiece",
      "color": "Forest Bottle Green, Aubergine Purple & Heavy Gold Zari",
      "fabric": "100% Pure Mulberry Silk",
      "weave": "Korvai Contrast Border with Rudraksha & Mayil Motifs",
      "length": "6.3 Meters with grand contrast blouse piece",
      "origin": "Kanchipuram, Tamil Nadu",
      "description": "Aristocratic deep bottle green pure silk contrasted with imperial aubergine purple and woven with pure gold zari peacock and sacred Rudraksha motifs.",
      "image": "assets/catalog/riwayat/riwayat-bottle-green-angle-1.jpg",
      "hoverImage": "assets/catalog/riwayat/riwayat-bottle-green-angle-2.jpg",
      "gallery": [
        "assets/catalog/riwayat/riwayat-bottle-green-angle-1.jpg",
        "assets/catalog/riwayat/riwayat-bottle-green-angle-2.jpg",
        "assets/catalog/riwayat/riwayat-bottle-green-angle-3.jpg",
        "assets/catalog/riwayat/riwayat-bottle-green-angle-4.jpg"
      ],
      "details": [
        "Item Code: PROD-716382",
        "Heavy 3-ply pure Mulberry silk with 2-gram gold zari alloy",
        "Rare green-and-purple heirloom royal colorway",
        "Silk Mark & Handloom Mark guaranteed",
        "Dry clean only. Muslin storage cover included"
      ]
    }
  ]
};

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

  // 10. Products (All 35 Sarees)
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
