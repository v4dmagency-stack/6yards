/**
 * 6 Yards Sarees - Product Catalog & Collections Data
 * Brand Colors: Maroon (#6B1426), Cream (#F2E4D6), Blush (#E3C4B4), Antique Gold (#B08A4A)
 */

const PRODUCTS_DATA = [
  {
    id: "saree-01",
    name: "Banarasi Silk Saree",
    category: "banarasi",
    collection: "resham",
    collectionName: "Resham - The Silk Edit",
    price: 12999,
    originalPrice: 15999,
    rating: 4.8,
    reviewsCount: 120,
    isBestSeller: true,
    isNew: false,
    tag: "Best Seller",
    color: "Deep Maroon & Zari Gold",
    fabric: "100% Pure Katan Silk",
    weave: "Handloom Banarasi Kadwa Weave",
    length: "6.3 Meters (includes unstitched blouse piece)",
    origin: "Varanasi, Uttar Pradesh",
    description: "Woven in the sacred looms of Varanasi, this opulent Banarasi silk saree features intricate gold zari floral jaal with an exquisite royal pallu. A timeless heirloom draped for generations of celebrations.",
    image: "assets/inspo-3.jpg",
    hoverImage: "assets/inspo-4.jpg",
    details: [
      "Pure Mulberry Katan Silk base with gold metallic zari",
      "Signature regal meenakari border detailing",
      "Silk Mark Certified handloom genuine weave",
      "Dry clean only. Store wrapped in pure muslin cloth"
    ]
  },
  {
    id: "saree-02",
    name: "Kanjivaram Silk Saree",
    category: "kanjivaram",
    collection: "riwayat",
    collectionName: "Riwayat - Heritage Edit",
    price: 16499,
    originalPrice: 19999,
    rating: 4.9,
    reviewsCount: 88,
    isBestSeller: true,
    isNew: true,
    tag: "Heritage Craft",
    color: "Lush Olive & Temple Gold Zari",
    fabric: "Pure Mulberry Kanchipuram Silk",
    weave: "Korvai Triple-Shuttle Handloom",
    length: "6.2 Meters with contrast blouse piece",
    origin: "Kanchipuram, Tamil Nadu",
    description: "A masterwork of South Indian tradition featuring heavy gold zari temple borders (Korvai technique) against a lush rich body. Built with thick 3-ply silk for a majestic drape.",
    image: "assets/inspo-4.jpg",
    hoverImage: "assets/inspo-3.jpg",
    details: [
      "Traditional heavy 3-ply pure silk with 2g gold silver alloy zari",
      "Contrasting rich pallu with peacock & chakra motifs",
      "Silk Mark & Handloom Mark guaranteed",
      "Includes complimentary satin petticoat fabric"
    ]
  },
  {
    id: "saree-03",
    name: "Chanderi Silk Saree",
    category: "chanderi",
    collection: "adaa",
    collectionName: "Adaa - Modern Grace",
    price: 10950,
    originalPrice: 12500,
    rating: 4.7,
    reviewsCount: 76,
    isBestSeller: true,
    isNew: false,
    tag: "Featherlight",
    color: "Pastel Sage & Gold Zari Border",
    fabric: "Chanderi Silk-Cotton Blend",
    weave: "Handwoven Booti & Ashrafi Weave",
    length: "6.3 Meters (with blouse piece)",
    origin: "Chanderi, Madhya Pradesh",
    description: "Gossamer-light and effortlessly graceful, this pastel sage Chanderi saree is accented with delicate coin motifs and a shimmering translucent gold border.",
    image: "assets/inspo-1.png",
    hoverImage: "assets/inspo-5.png",
    details: [
      "Ultra-breathable lightweight luxury silk cotton",
      "Hand-embroidered accents along pallu edge",
      "Perfect for daytime weddings, festivities and intimate soirees",
      "Comfort fit with soft drape feel"
    ]
  },
  {
    id: "saree-04",
    name: "Tussar Silk Saree",
    category: "tussar",
    collection: "vastra",
    collectionName: "Vastra - Timeless Form",
    price: 8499,
    originalPrice: 10500,
    rating: 4.6,
    reviewsCount: 64,
    isBestSeller: true,
    isNew: false,
    tag: "Natural Texture",
    color: "Smoky Ice Blue & Silver Zari",
    fabric: "Wild Desi Tussar (Kosa) Silk",
    weave: "Tribal Handloom Weave with Temple Border",
    length: "6.2 Meters (with blouse)",
    origin: "Bhagalpur, Bihar",
    description: "Celebrated for its organic slub texture and cool silvery sheen, this drape brings understated earthy elegance adorned with distinct silver temple motifs.",
    image: "assets/inspo-2.png",
    hoverImage: "assets/inspo-1.png",
    details: [
      "Naturally cultivated wild silk with rich tactile texture",
      "Eco-friendly natural dye process",
      "Distinct silver zari border finish",
      "All-weather comfortable natural breathable fabric"
    ]
  },
  {
    id: "saree-05",
    name: "Organza Silk Saree",
    category: "organza",
    collection: "leher",
    collectionName: "Leher - Fluid Drapes",
    price: 9999,
    originalPrice: 11999,
    rating: 4.5,
    reviewsCount: 59,
    isBestSeller: true,
    isNew: true,
    tag: "Contemporary",
    color: "Ivory Pearl & Mustard Pink Border",
    fabric: "Pure Sheer Organza Silk",
    weave: "Handloom Weave with Contrast Kaddi Border",
    length: "6.3 Meters (with designer blouse piece)",
    origin: "Jaipur, Rajasthan",
    description: "Crisp yet dreamy, this ivory pearl organza drape features a striking dual mustard gold and rose pink contrast pallu that shimmers with movement.",
    image: "assets/inspo-5.png",
    hoverImage: "assets/inspo-2.png",
    details: [
      "Premium crisp organza with graceful structured fall",
      "Handloom contrast kaddi border",
      "Includes raw silk matching unstitched blouse",
      "Dry clean only"
    ]
  },
  {
    id: "saree-06",
    name: "Georgette Saree",
    category: "georgette",
    collection: "roop",
    collectionName: "Roop - Bold Beauty",
    price: 7499,
    originalPrice: 9200,
    rating: 4.3,
    reviewsCount: 42,
    isBestSeller: true,
    isNew: false,
    tag: "Trending",
    color: "Plum Magenta & Mustard Gold",
    fabric: "Pure Viscose Georgette",
    weave: "Chikankari Shadow Work & Weft Zari",
    length: "6.2 Meters with blouse",
    origin: "Lucknow, Uttar Pradesh",
    description: "Flowing gracefully with every step, this jewel-toned plum drape features intricate weave textures and a lustrous gold sheen.",
    image: "assets/inspo-3.jpg",
    hoverImage: "assets/inspo-5.png",
    details: [
      "Ultra-soft fluid georgette fabric that hugs effortlessly",
      "Handcrafted Chikankari needlework with subtle shimmer",
      "Pre-washed and crease-resistant drape",
      "Ideal for cocktail nights and festive parties"
    ]
  },
  {
    id: "saree-07",
    name: "Paithani Royal Silk Saree",
    category: "paithani",
    collection: "riwayat",
    collectionName: "Riwayat - Heritage Edit",
    price: 18500,
    originalPrice: 22000,
    rating: 4.9,
    reviewsCount: 51,
    isBestSeller: false,
    isNew: true,
    tag: "Royal Heritage",
    color: "Royal Peacock Blue & Gold",
    fabric: "Pure Mulberry Silk",
    weave: "Tapestry Handloom Weave with Mor-Bangadi Pallu",
    length: "6.3 Meters",
    origin: "Yeola, Maharashtra",
    description: "A queen's attire from the Peshwa era, featuring the celebrated peacock and parrot motifs (Mor-Bangadi) woven on a rich zari gold base.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85",
    hoverImage: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85",
    details: [
      "100% Handcrafted by master weavers taking 45 days per saree",
      "Oblique square design border with kaleidoscope pallu",
      "Silk Mark guaranteed",
      "Heirloom keepsake box included"
    ]
  },
  {
    id: "saree-08",
    name: "Patan Patola Double Ikat Saree",
    category: "patola",
    collection: "vastra",
    collectionName: "Vastra - Timeless Form",
    price: 21999,
    originalPrice: 26000,
    rating: 5.0,
    reviewsCount: 38,
    isBestSeller: false,
    isNew: true,
    tag: "Exclusive",
    color: "Crimson Maroon & Mustard Ochre",
    fabric: "Pure Silk Ikat",
    weave: "Double Ikat Resist Dyeing",
    length: "6.2 Meters",
    origin: "Patan, Gujarat",
    description: "One of the most complex weaving traditions in the world where both warp and weft threads are precision resist-dyed before weaving geometric heritage tales.",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85",
    hoverImage: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=85",
    details: [
      "Reversible pattern looks identical on front and back",
      "Geometric elephant (Kunjar) and floral grid motifs",
      "Pure natural dyes with 100-year color fastness",
      "Certificate of Handloom Authenticity included"
    ]
  }
];

const COLLECTIONS_DATA = [
  {
    id: "adaa",
    number: "01",
    name: "Adaa",
    tagline: "Modern Grace",
    image: "assets/collection-adaa.jpg",
    description: "Contemporary cuts and featherlight textures for modern celebrations."
  },
  {
    id: "vastra",
    number: "02",
    name: "Vastra",
    tagline: "Timeless Form",
    image: "assets/collection-vastra.jpg",
    description: "Pure geometric patterns and natural slubs celebrating traditional forms."
  },
  {
    id: "roop",
    number: "03",
    name: "Roop",
    tagline: "Bold Beauty",
    image: "assets/collection-roop.jpg",
    description: "Vibrant palettes and rich jewel tones that command every room."
  },
  {
    id: "leher",
    number: "04",
    name: "Leher",
    tagline: "Fluid Drapes",
    image: "assets/collection-leher.jpg",
    description: "Whispering silks, lightweight organzas and airy chiffons that dance in motion."
  },
  {
    id: "resham",
    number: "05",
    name: "Resham",
    tagline: "The Silk Edit",
    image: "assets/collection-resham.jpg",
    description: "Pure mulberry, muga, and tussar silks handwoven for grand occasions."
  },
  {
    id: "riwayat",
    number: "06",
    name: "Riwayat",
    tagline: "Heritage Edit",
    image: "assets/collection-riwayat.jpg",
    description: "Royal Kanjivarams and Banarasi heirlooms honoring centuries of Indian loomcraft."
  }
];

const HERO_SLIDES = [
  {
    id: 1,
    tag: "TRADITIONAL SAREES",
    title: "Six Yards.\nInfinite Stories.",
    subtitle: "From timeless weaves to contemporary drapes, explore sarees that celebrate craft, culture and you.",
    cta: "EXPLORE COLLECTIONS",
    ctaLink: "#collections-section",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=90",
    badge: "Handcrafted Luxury"
  },
  {
    id: 2,
    tag: "THE RESHAM EDIT",
    title: "Pure Silk.\nRoyal Elegance.",
    subtitle: "Handwoven in Varanasi with antique gold zari for moments that linger forever in memory.",
    cta: "SHOP BANARASI",
    ctaLink: "#products-section",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1600&q=90",
    badge: "100% Pure Mulberry Silk"
  },
  {
    id: 3,
    tag: "FEATHERLIGHT DRAPES",
    title: "Modern Grace in\nEvery Weave.",
    subtitle: "Discover ethereal Organzas and delicate Chanderis tailored for sunlit festivities.",
    cta: "DISCOVER ORGANZA",
    ctaLink: "#products-section",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1600&q=90",
    badge: "Artisanal Heritage"
  }
];
