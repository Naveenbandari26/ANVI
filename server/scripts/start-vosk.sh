#!/bin/bash

# Start Vosk Docker container
echo "🚀 Starting Vosk Docker container..."
docker-compose -f docker-compose.vosk.yml up -d

# Wait for container to be ready
echo "⏳ Waiting for Vosk server to be ready..."
sleep 5

# Check if container is running
if docker ps | grep -q "anvi-vosk-server"; then
    echo "✅ Vosk container is running"
    
    # Test the API
    echo "🧪 Testing Vosk API..."
    if curl -s http://localhost:2700/ > /dev/null; then
        echo "✅ Vosk API is responding"
    else
        echo "⚠️  Vosk API is not responding yet. It may still be starting up."
    fi
else
    echo "❌ Vosk container failed to start. Check logs with:"
    echo "   docker-compose -f docker-compose.vosk.yml logs"
fi
