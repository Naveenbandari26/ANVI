# PowerShell script to start Telugu TTS service
# Run this from the server directory

Write-Host "🚀 Starting Telugu TTS Service..." -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8 or higher" -ForegroundColor Yellow
    exit 1
}

# Navigate to TTS service directory
$ttsDir = Join-Path $PSScriptRoot "..\tts-service"
if (-not (Test-Path $ttsDir)) {
    Write-Host "❌ TTS service directory not found: $ttsDir" -ForegroundColor Red
    exit 1
}

Set-Location $ttsDir

# Check if virtual environment exists
$venvPath = Join-Path $ttsDir "venv"
if (Test-Path $venvPath) {
    Write-Host "📦 Activating virtual environment..." -ForegroundColor Cyan
    & "$venvPath\Scripts\Activate.ps1"
} else {
    Write-Host "⚠️  No virtual environment found. Using system Python." -ForegroundColor Yellow
}

# Check if requirements are installed
Write-Host "🔍 Checking dependencies..." -ForegroundColor Cyan
try {
    python -c "import torch; import parler_tts; import transformers; import soundfile; import flask" 2>&1 | Out-Null
    Write-Host "✅ All dependencies are installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Missing dependencies. Installing..." -ForegroundColor Yellow
    Write-Host "⏳ This may take several minutes on first run..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Start the service
Write-Host "🎤 Starting TTS service on http://localhost:5001..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

python app.py
