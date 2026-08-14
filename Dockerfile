# Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files
COPY . .

# Generate Prisma Client
RUN DATABASE_URL=postgresql://localhost:5432/dummy npx prisma generate

# Build Next.js
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL=postgresql://localhost:5432/dummy npm run build

# Pruned production dependencies stage
FROM base AS pruned
RUN npm prune --production

# Production Runner stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone output and assets
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/prisma.config.ts ./
COPY --from=base /app/docker-entrypoint.sh ./

# Copy pruned production node_modules so prisma CLI runs correctly
COPY --from=pruned /app/node_modules ./node_modules

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
