import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "storefront");
const publicDirectories = ["assets", "css", "js", "Categorized_Sarees", "Saree"];

await mkdir(output, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".html")) {
    await cp(path.join(root, entry.name), path.join(output, entry.name));
  }
}

for (const directory of publicDirectories) {
  const source = path.join(root, directory);
  try {
    await cp(source, path.join(output, directory), { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

const configPath = path.join(output, "js", "medusa-config.js");
const config = await readFile(configPath, "utf8");
const key = process.env.MEDUSA_PUBLISHABLE_KEY;
if (key) {
  await writeFile(
    configPath,
    config.replace(
      /window\.MEDUSA_PUBLISHABLE_KEY\s*=\s*[^;]+;/,
      `window.MEDUSA_PUBLISHABLE_KEY = ${JSON.stringify(key)};`,
    ),
  );
}
