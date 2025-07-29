# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app
RUN npm install -g turbo@^2
COPY . .

# Generate a partial monorepo with a pruned lockfile for the server workspace
RUN turbo prune club-management-server --docker

# Change to out directory and install dependencies
WORKDIR /app/out
RUN npm ci --frozen-lockfile

# Build the project
RUN npm run build --filter=club-management-server

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

# Copy everything from builder (includes node_modules with all deps)
COPY --from=builder --chown=nodejs:nodejs /app/ ./

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
CMD ["npm", "run", "start", "--workspace=club-management-server"]
