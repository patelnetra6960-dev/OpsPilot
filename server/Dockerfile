# =====================================================================
# OpsPilot Backend Production Dockerfile
# Multi-stage / hardened Node.js 22 Alpine runtime
# =====================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade --no-cache

# Copy package descriptors first for layer caching
COPY package*.json ./

# Install all dependencies including devDependencies for build/prep if needed
RUN npm ci

# Copy server application source
COPY . .

# ---------------------------------------------------------------------
# Production Runtime Stage
# ---------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Ensure security updates and wget for healthchecks
RUN apk update && apk upgrade --no-cache && apk add --no-cache wget

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source from builder
COPY --from=builder --chown=node:node /app/src ./src

# Create non-root user directory ownership
USER node

# Expose backend API and Socket.IO port
EXPOSE 5000

# Container liveness health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/v1/health/liveness || exit 1

# Start production server
CMD ["node", "src/server.js"]
