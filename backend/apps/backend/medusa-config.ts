import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProduction = process.env.NODE_ENV === "production"

// Local development origins. Production origins come from STORE_CORS /
// ADMIN_CORS / AUTH_CORS (set them to the live domain, e.g. https://www.example.com).
const DEV_STORE_CORS = "http://localhost:3000,http://localhost:8000,http://127.0.0.1:8000"
const DEV_ADMIN_CORS = "http://localhost:5173,http://localhost:9000"

// Product images uploaded in Medusa Admin. Without S3-compatible storage they
// are written to the container's disk and are lost on every redeploy.
const fileModule = process.env.S3_BUCKET
  ? [{
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [{
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
        }],
      },
    }]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
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
