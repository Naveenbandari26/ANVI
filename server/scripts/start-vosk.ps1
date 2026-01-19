# PowerShell script to start Vosk Docker container

Write-Host "🚀 Starting Vosk Docker container..." -ForegroundColor Cyan

# Start the container
docker-compose -f docker-compose.vosk.yml up -d

# Wait for container to be ready
Write-Host "⏳ Waiting for Vosk server to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if container is running
$containerRunning = docker ps | Select-String "anvi-vosk-server"

if ($containerRunning) {
    Write-Host "✅ Vosk container is running" -ForegroundColor Green
    
    # Test the API
    Write-Host "🧪 Testing Vosk API..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:2700/" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Vosk API is responding" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Vosk API is not responding yet. It may still be starting up." -ForegroundColor Yellow
        Write-Host "   Check logs with: docker-compose -f docker-compose.vosk.yml logs" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Vosk container failed to start. Check logs with:" -ForegroundColor Red
    Write-Host "   docker-compose -f docker-compose.vosk.yml logs" -ForegroundColor Yellow
}
