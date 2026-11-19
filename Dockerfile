# Production image of the app. Three stages: the last one, the image that runs, only
# carries the compiled server, the migrations and the operation commands. See
# docs/produccion.md.

# 1. Dependencies, with the dev ones: they are needed to build.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build: the Next.js server (.next/standalone) and the operation commands (dist/).
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Public variables are written into the browser's code when building.
ARG NEXT_PUBLIC_APP_NAME=Reservas
ARG NEXT_PUBLIC_SENTRY_DSN=
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
# src/lib/env.ts validates the variables during the build too. These values exist only
# for this step and stay out of the final image: the real ones arrive when it runs.
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=only-for-the-build-never-used-at-runtime \
    BETTER_AUTH_URL=http://localhost:3000 \
    TURNSTILE_SITE_KEY=1x00000000000000000000BB \
    TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA \
    sh -c "npm run build && npm run build:commands"

# 3. The image that runs: no source code, no dev dependencies.
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/dist/commands ./commands
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
# The `node` user comes with the image: the app does not run as root.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
