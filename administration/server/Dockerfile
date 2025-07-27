FROM node:20-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files from server directory
COPY server/package*.json ./

# Install dependencies (this will build native modules in the container)
RUN npm ci

# Copy server source code
COPY server/ .

# Copy schema from root
COPY schema.sql ./schema.sql

# Build the application
RUN npm run build

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]