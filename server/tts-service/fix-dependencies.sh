#!/bin/bash
# Bash script to fix PyTorch/torchvision compatibility issues
# Run this from the tts-service directory

echo "🔧 Fixing PyTorch/torchvision compatibility issues..."
echo ""

# Step 1: Uninstall conflicting packages
echo "Step 1: Uninstalling existing PyTorch packages..."
pip3 uninstall -y torch torchvision torchaudio transformers 2>/dev/null
echo "✅ Uninstalled"
echo ""

# Step 2: Install PyTorch with compatible torchvision
echo "Step 2: Installing compatible PyTorch packages..."
echo "⏳ This may take a few minutes..."

# Check if CUDA is available
HAS_CUDA=false
if python3 -c "import torch; exit(0 if torch.cuda.is_available() else 1)" 2>/dev/null; then
    HAS_CUDA=true
fi

if [ "$HAS_CUDA" = true ]; then
    echo "🎮 GPU detected! Installing CUDA-enabled PyTorch..."
    pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
else
    echo "💻 Installing CPU-only PyTorch..."
    pip3 install torch torchvision torchaudio
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to install PyTorch"
    exit 1
fi

echo "✅ PyTorch installed successfully"
echo ""

# Step 3: Install other dependencies
echo "Step 3: Installing other dependencies..."
pip3 install "transformers>=4.35.0,<5.0.0"
pip3 install "soundfile>=0.12.1"
pip3 install "flask>=3.0.0"
pip3 install "flask-cors>=4.0.0"

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Step 4: Install parler-tts
echo "Step 4: Installing Parler-TTS..."
pip3 install git+https://github.com/huggingface/parler-tts.git

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Parler-TTS"
    exit 1
fi

echo "✅ Parler-TTS installed successfully"
echo ""

# Step 5: Verify installation
echo "Step 5: Verifying installation..."
python3 -c "import torch; import torchvision; import transformers; print(f'✅ PyTorch: {torch.__version__}'); print(f'✅ Torchvision: {torchvision.__version__}'); print(f'✅ Transformers: {transformers.__version__}')"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All dependencies fixed and verified!"
    echo "You can now run: python3 app.py"
else
    echo "❌ Verification failed"
    exit 1
fi
