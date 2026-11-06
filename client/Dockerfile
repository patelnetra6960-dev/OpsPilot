# =====================================================================
# OpsPilot Frontend Production Dockerfile
# Stage 1: Build React/Vite application
# Stage 2: Serve static artifacts with hardened Nginx Alpine
# =====================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade --no-cache

# Build arguments for frontend build
ARG VITE_API_URL=/api/v1
ARG VITE_SUPABASE_URL=https://mock-opspilot.supabase.co
ARG VITE_SUPABASE_ANON_KEY=mock-anon-key-opspilot-2026

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy package manifests
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---------------------------------------------------------------------
# Stage 2: Nginx Web Server
# ---------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Apply security updates
RUN apk update && apk upgrade --no-cache && apk add --no-cache curl

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled React distribution from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose web port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/healthz || exit 1

# Launch Nginx
CMD ["nginx", "-g", "daemon off;"]
