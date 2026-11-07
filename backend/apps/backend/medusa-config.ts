import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === 'production'

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || 'https://6yards-chi.vercel.app,http://localhost:3000,http://localhost:8000',
      adminCors: process.env.ADMIN_CORS || 'https://6yards-chi.vercel.app,http://localhost:5173,http://localhost:9000',
      authCors: process.env.AUTH_CORS || 'https://6yards-chi.vercel.app,http://localhost:3000,http://localhost:8000,http://localhost:5173,http://localhost:9000',
      jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'supersecret_6yards_jwt_jwtsecret_medusajs_2026'),
      cookieSecret: process.env.COOKIE_SECRET || (isProduction ? '' : 'supersecret_6yards_cookie_cookiesecret_medusajs_2026'),
    },
    cookieOptions: {
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  }
})
