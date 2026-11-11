// Builds the static storefront into dist/storefront for Vercel.
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   MEDUSA_PUBLISHABLE_KEY  Publishable API key from Medusa Admin → Settings → Publishable API Keys
//   MEDUSA_BACKEND_URL      Optional. Defaults to the site's own origin (Medusa served via vercel.json rewrites)
//   SITE_URL                Public site URL used in sitemap.xml / robots.txt, e.g. https://www.example.com
import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "storefront");
const heroVideo = "gemini_generated_video_9da2f281_gwr_video_mvp.mp4";

// Raw photoshoot originals and working files are not referenced by the site
// (several hundred MB); keep them out of the deployment.
const EXCLUDED_ASSET_DIRS = new Set([
  "raw_sarees",
  "raw_sarees_new",
  "photoshoot",
  "thumbs",
  "thumbs_new",
  "inspiration",
]);
const EXCLUDED_ASSET_FILES = /^(inspo-\d+\.(png|jpg)|6yard\.mp4|hero-cover\.png|hero-inspiration\.png|brand-logo-(peacock|banner|transparent|new-peacock|light)[\w-]*\.(png|jpg)|brand-logo\.jpg)$/;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const pages = [];
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".html")) {
    await cp(path.join(root, entry.name), path.join(output, entry.name));
    pages.push(entry.name);
  }
}

for (const directory of ["css", "js"]) {
  await cp(path.join(root, directory), path.join(output, directory), { recursive: true });
}

await cp(path.join(root, "assets"), path.join(output, "assets"), {
  recursive: true,
  filter: (source) => {
    const rel = path.relative(path.join(root, "assets"), source);
    if (!rel) return true;
    const [first] = rel.split(path.sep);
    if (EXCLUDED_ASSET_DIRS.has(first)) return false;
    return !(rel === path.basename(rel) && EXCLUDED_ASSET_FILES.test(rel));
  },
});

await copyFile(path.join(root, heroVideo), path.join(output, heroVideo));

// Runtime configuration.
const configPath = path.join(output, "js", "medusa-config.js");
let config = await readFile(configPath, "utf8");
const key = process.env.MEDUSA_PUBLISHABLE_KEY;
if (key) {
  config = config.replace(
    /window\.MEDUSA_PUBLISHABLE_KEY\s*=\s*[^;]+;/,
    `window.MEDUSA_PUBLISHABLE_KEY = ${JSON.stringify(key)};`,
  );
} else {
  console.warn("[storefront] MEDUSA_PUBLISHABLE_KEY is not set; using the key committed in js/medusa-config.js.");
}
if (process.env.MEDUSA_BACKEND_URL) {
  config += `\nwindow.MEDUSA_BACKEND_URL = ${JSON.stringify(process.env.MEDUSA_BACKEND_URL.replace(/\/$/, ""))};\n`;
}
await writeFile(configPath, config);

// SEO: robots.txt and sitemap.xml.
const siteUrl = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")
).replace(/\/$/, "");

const robots = ["User-agent: *", "Disallow: /checkout.html", "Disallow: /app", "Disallow: /admin"];
if (siteUrl) robots.push(`Sitemap: ${siteUrl}/sitemap.xml`);
await writeFile(path.join(output, "robots.txt"), `${robots.join("\n")}\n`);

if (siteUrl) {
  const productsData = JSON.parse(
    await readFile(path.join(root, "backend/apps/backend/src/scripts/products-data.json"), "utf8"),
  );
  const urls = [
    "",
    "collections.html",
    "about.html",
    "journal.html",
    "contact.html",
    ...productsData.collections.map((c) => `collections.html?collection=${encodeURIComponent(c.id)}`),
    ...productsData.products.map((p) => `product.html?id=${encodeURIComponent(p.id)}`),
  ];
  const today = new Date().toISOString().slice(0, 10);
  const escapeXml = (s) => s.replace(/&/g, "&amp;");
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${escapeXml(`${siteUrl}/${u}`)}</loc><lastmod>${today}</lastmod></url>`),
    "</urlset>",
  ].join("\n");
  await writeFile(path.join(output, "sitemap.xml"), `${xml}\n`);
} else {
  console.warn("[storefront] SITE_URL is not set; skipping sitemap.xml.");
}

console.log(`[storefront] Built ${pages.length} pages into ${path.relative(root, output)}`);
