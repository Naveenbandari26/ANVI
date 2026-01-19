# PowerShell script to fix PyTorch/torchvision compatibility issues
# Run this from the tts-service directory

Write-Host "🔧 Fixing PyTorch/torchvision compatibility issues..." -ForegroundColor Yellow
Write-Host ""

# Step 1: Uninstall conflicting packages
Write-Host "Step 1: Uninstalling existing PyTorch packages..." -ForegroundColor Cyan
pip uninstall -y torch torchvision torchaudio transformers 2>$null
Write-Host "✅ Uninstalled" -ForegroundColor Green
Write-Host ""

# Step 2: Install PyTorch with compatible torchvision
Write-Host "Step 2: Installing compatible PyTorch packages..." -ForegroundColor Cyan
Write-Host "⏳ This may take a few minutes..." -ForegroundColor Yellow

# Check if CUDA is available
$hasCuda = $false

try {
    $cudaCheck = python -c "import torch; print('cuda' if torch.cuda.is_available() else 'cpu')" 2>&1
    if ($cudaCheck -eq "cuda") {
        $hasCuda = $true
    }
} catch {
    # CUDA check failed, will install CPU version
    $hasCuda = $false
}

if ($hasCuda) {
    Write-Host "🎮 GPU detected! Installing CUDA-enabled PyTorch..." -ForegroundColor Green
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
} else {
    Write-Host "💻 Installing CPU-only PyTorch..." -ForegroundColor Yellow
    pip install torch torchvision torchaudio
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install PyTorch" -ForegroundColor Red
    exit 1
}

Write-Host "✅ PyTorch installed successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Install other dependencies
Write-Host "Step 3: Installing other dependencies..." -ForegroundColor Cyan
pip install transformers>=4.35.0,<5.0.0
pip install soundfile>=0.12.1
pip install flask>=3.0.0
pip install flask-cors>=4.0.0

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 4: Install parler-tts
Write-Host "Step 4: Installing Parler-TTS..." -ForegroundColor Cyan
pip install git+https://github.com/huggingface/parler-tts.git

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Parler-TTS" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Parler-TTS installed successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Verify installation
Write-Host "Step 5: Verifying installation..." -ForegroundColor Cyan
python -c "import torch; import torchvision; import transformers; print('PyTorch:', torch.__version__); print('Torchvision:', torchvision.__version__); print('Transformers:', transformers.__version__)"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 All dependencies fixed and verified!" -ForegroundColor Green
    Write-Host "You can now run: python app.py" -ForegroundColor Cyan
} else {
    Write-Host "❌ Verification failed" -ForegroundColor Red
    exit 1
}
