# Deploy 6 Yards Medusa on Vercel

The root `vercel.json` deploys the static storefront and Medusa as separate Vercel
services on the same domain. `/app` is the Medusa Admin; `/store`, `/admin`,
`/auth`, `/health`, and `/files` are routed to Medusa.

## Provision production services

In the Vercel project, add Neon Postgres and Upstash Redis from the Marketplace
and connect both integrations to the project. Set these Production environment
variables in Vercel:

- `DATABASE_URL`: Neon pooled PostgreSQL connection string.
- `REDIS_URL`: Upstash's standard `rediss://` connection string (not its REST URL).
- `JWT_SECRET` and `COOKIE_SECRET`: separate, randomly generated secrets.
- `STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS`: comma-separated allowed origins.
  Include `https://6yards-chi.vercel.app` and any custom production domain.
- `MEDUSA_PUBLISHABLE_KEY`: the storefront key created by the seed script below.

Do not use the PostgreSQL server running on a personal computer as the production
database. Vercel deployments cannot reach a computer's `localhost`.

## First deployment and catalog setup

After adding the environment variables, redeploy the `main` branch. Then pull the
Production environment locally (Vercel CLI):

```powershell
npx vercel login
npx vercel link
npx vercel env pull backend/apps/backend/.env.production --environment production
```

In a second terminal, from the repository root, initialize the production
database and create the initial Admin user:

```powershell
Set-Location backend/apps/backend
$env:NODE_ENV = "production"
..\\..\\node_modules\\.bin\\medusa.cmd db:setup --no-interactive
$password = Read-Host "New Medusa Admin password" -AsSecureString
$plainPassword = [System.Net.NetworkCredential]::new("", $password).Password
..\\..\\node_modules\\.bin\\medusa.cmd user --email you@example.com --password $plainPassword
Remove-Variable plainPassword
..\\..\\node_modules\\.bin\\medusa.cmd exec ./src/scripts/seed-6yards.ts
..\\..\\node_modules\\.bin\\medusa.cmd exec ./src/scripts/seed-additional-3.ts
```

The seed commands create the India/INR region, all 43 storefront sarees,
collections, and a publishable Store API key. The storefront looks up the INR
region from Medusa, so no region ID needs to be copied into Vercel. Copy the
printed key into the Vercel
`MEDUSA_PUBLISHABLE_KEY` Production environment variable, then redeploy. Keep the
pulled environment file private and delete it when setup is complete.

After deployment, sign in at `https://6yards-chi.vercel.app/app`. In Admin, open
**Products**, choose a saree, edit the INR price on its variant, and save.
