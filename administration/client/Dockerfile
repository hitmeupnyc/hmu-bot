# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app
RUN npm install -g turbo@^2
COPY . .

# Generate a partial monorepo with a pruned lockfile for the client workspace
RUN turbo prune club-management-client --docker

# Change to out directory and install dependencies
WORKDIR /app/out
RUN npm ci --frozen-lockfile

# Build the project
RUN npm run build --filter=club-management-client

# Production stage
FROM nginx:alpine AS production

# Install security updates and clean up
RUN apk add --no-cache --upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create nginx user if it doesn't exist
# RUN addgroup -g 1001 -S nginx && \
#     adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy built assets from builder stage
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
