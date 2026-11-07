FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build

ENV NODE_ENV=production
EXPOSE 80

CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ] || [ -z \"$REDIS_URL\" ] || [ -z \"$JWT_SECRET\" ] || [ -z \"$COOKIE_SECRET\" ]; then echo 'Missing required Medusa production environment variables: DATABASE_URL, REDIS_URL, JWT_SECRET, COOKIE_SECRET' >&2; exit 1; fi; exec npm run start -- --host 0.0.0.0 --port \"${PORT:-80}\""]
