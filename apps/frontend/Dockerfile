FROM node:22-alpine AS development

WORKDIR /workspace

RUN npm install --global npm@12.2.0

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace @sto-booking/frontend --include-workspace-root=false

COPY apps/frontend apps/frontend
WORKDIR /workspace/apps/frontend

FROM development AS builder

ARG NEXT_PUBLIC_API_URL=http://localhost:5000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /workspace/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/frontend/public ./apps/frontend/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "apps/frontend/server.js"]
