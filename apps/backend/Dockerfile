FROM node:22-alpine AS development

WORKDIR /workspace

RUN npm install --global npm@12.2.0

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace @sto-booking/backend --include-workspace-root=false

COPY apps/backend apps/backend
WORKDIR /workspace/apps/backend
RUN DATABASE_URL=postgresql://user:password@postgres:5432/database npm run prisma:generate

FROM development AS builder

RUN npm run build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /workspace/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /workspace/apps/backend/dist ./apps/backend/dist
COPY --from=builder /workspace/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend
EXPOSE 5000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node prisma/seed.mjs && node dist/main.js"]
