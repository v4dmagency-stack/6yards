import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProduction = process.env.NODE_ENV === "production"

// Local development origins. Production origins come from STORE_CORS /
// ADMIN_CORS / AUTH_CORS (set them to the live domain, e.g. https://www.example.com).
const DEV_STORE_CORS = "http://localhost:3000,http://localhost:8000,http://127.0.0.1:8000"
const DEV_ADMIN_CORS = "http://localhost:5173,http://localhost:9000"

// Files: product import/export CSVs and images uploaded in Medusa Admin.
// Default: stored in Postgres and served from /files/<key> (works on Vercel,
// where the container disk is temporary). Set S3_* to use S3/R2 instead.
const fileModule = [{
  resolve: "@medusajs/medusa/file",
  options: {
    providers: [
      process.env.S3_BUCKET
        ? {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
            },
          }
        : {
            resolve: "./src/modules/database-file",
            id: "database",
            // Production: root-relative /files/<key> URLs that work on any domain.
            // Locally the storefront runs on another port, so use the backend URL.
            options: {
              base_url: process.env.FILE_BASE_URL || (isProduction ? "" : "http://localhost:9000"),
            },
          },
    ],
  },
}]

module.exports = defineConfig({
  projectConfig: {
    // Neon (Vercel Storage) provides a pooled DATABASE_URL and a direct
    // DATABASE_URL_UNPOOLED. Medusa is a long-running server and its migrations
    // need a direct connection, so prefer the unpooled one when present.
    databaseUrl: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    // Required in production: without Redis, admin login sessions live in one
    // server instance's memory and are lost whenever Vercel restarts or scales
    // the container (admins get logged out). Upstash on Vercel sets KV_URL.
    redisUrl: process.env.REDIS_URL || process.env.KV_URL,
    http: {
      storeCors: process.env.STORE_CORS || DEV_STORE_CORS,
      adminCors: process.env.ADMIN_CORS || DEV_ADMIN_CORS,
      authCors: process.env.AUTH_CORS || `${DEV_STORE_CORS},${DEV_ADMIN_CORS}`,
      jwtSecret: process.env.JWT_SECRET || (isProduction ? "" : "supersecret_6yards_jwt_jwtsecret_medusajs_2026"),
      cookieSecret: process.env.COOKIE_SECRET || (isProduction ? "" : "supersecret_6yards_cookie_cookiesecret_medusajs_2026"),
    },
    cookieOptions: {
      secure: process.env.COOKIE_SECURE === "true" || isProduction,
      sameSite: "lax",
    },
  },
  modules: [...fileModule],
})
