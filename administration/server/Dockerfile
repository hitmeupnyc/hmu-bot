# Build stage
FROM node:20-alpine AS builder

# Install dependencies for node-gyp and native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./
# FIXME: This is broken because Turborepo/monorepo design does funky things with lockfiles. It puts the lockfile in the root, which includes the lockfile for the server dependencies as well.
# COPY package-lock.json ./

# Install dependencies with clean npm cache
RUN npm install

# Copy source code and config files
COPY tsconfig.json ./
COPY kysely.config.ts ./
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install security updates and runtime dependencies
RUN apk add --no-cache --upgrade && \
    apk add --no-cache python3 curl && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package.json ./

RUN npm install

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create data directory with proper permissions
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app/data && \
    chmod -R 755 /app/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
