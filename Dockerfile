FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ postgresql-client
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild bcrypt
RUN cd node_modules/bcrypt && npm rebuild bcrypt --build-from-source

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create dummy .env file for build
RUN echo "DATABASE_URL=\"postgresql://postgres:shzdb2025@postgres:5432/shzerpdb\"" > .env \
    && echo "NEXTAUTH_URL=\"http://localhost:3000\"" >> .env \
    && echo "NEXTAUTH_SECRET=\"dummy-secret-for-build-only\"" >> .env \
    && echo "NODE_ENV=\"production\"" >> .env \
    && echo "NEXT_PUBLIC_SKIP_DB_CHECKS=\"true\"" >> .env

# Generate Prisma client
RUN npx prisma generate

# Build the application with special flags to avoid database access during build
RUN NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SKIP_DB_CHECKS=true \
    NODE_ENV=production \
    npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Make the initialization script executable
RUN chmod +x ./scripts/init-db.sh

# Create a startup script
RUN echo '#!/bin/sh' > ./start.sh \
    && echo 'echo "Running database initialization script..."' >> ./start.sh \
    && echo './scripts/init-db.sh' >> ./start.sh \
    && echo 'echo "Starting Next.js server..."' >> ./start.sh \
    && echo 'node server.js' >> ./start.sh \
    && chmod +x ./start.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["./start.sh"] 