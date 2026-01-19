#!/bin/bash
# Bash script to start Telugu TTS service
# Run this from the server directory

echo "🚀 Starting Telugu TTS Service..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "✅ Python found: $PYTHON_VERSION"

# Navigate to TTS service directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TTS_DIR="$SCRIPT_DIR/../tts-service"

if [ ! -d "$TTS_DIR" ]; then
    echo "❌ TTS service directory not found: $TTS_DIR"
    exit 1
fi

cd "$TTS_DIR"

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  No virtual environment found. Using system Python."
fi

# Check if requirements are installed
echo "🔍 Checking dependencies..."
python3 -c "import torch; import parler_tts; import transformers; import soundfile; import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Missing dependencies. Installing..."
    echo "⏳ This may take several minutes on first run..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Start the service
echo "🎤 Starting TTS service on http://localhost:5001..."
echo "Press Ctrl+C to stop"
echo ""

python3 app.py
