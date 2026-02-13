#!/bin/bash
set -e

echo "🔨 Starting Railway build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Verify build output
echo "✅ Verifying build output..."
node scripts/verify-build.js

# List dist structure for debugging
echo "📁 Build output structure:"
ls -la dist/ || echo "dist/ directory not found"
ls -la dist/models/ || echo "dist/models/ directory not found"

echo "✅ Railway build completed successfully!"
