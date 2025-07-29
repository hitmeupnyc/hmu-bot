# Build stage
FROM node:20-alpine AS builder

# Install dependencies for node-gyp (if needed)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json .
# FIXME: This is broken because Turborepo/monorepo design does funky things with lockfiles. It puts the lockfile in the root, which includes the lockfile for the server dependencies as well.
# COPY package-lock.json .


# Install dependencies with clean npm cache
RUN npm install

# Copy source code
COPY src/ ./src/

COPY tsconfig.json .
COPY vite.config.ts .
COPY tailwind.config.js .
COPY postcss.config.js .
COPY index.html .

# Build the application
RUN npm run build

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
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

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
