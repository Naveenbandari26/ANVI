# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Verify build output
RUN ls -la dist/ && ls -la dist/models/ || echo "dist/models not found"

# Runtime stage
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy dist folder from builder stage
COPY --from=builder /app/dist ./dist

# Verify dist folder exists
RUN ls -la dist/ && ls -la dist/models/ || echo "dist/models not found"

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
