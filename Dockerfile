# ---- Build Stage ----
FROM node:lts-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma

RUN npx prisma generate

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:lts-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
# Overwrite compiled generated client with raw generated files so .ts internals are present at runtime
COPY --from=builder /usr/src/app/generated ./dist/generated
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/dist/prisma.config.js ./prisma.config.js

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
