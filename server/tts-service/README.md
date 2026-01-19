# Telugu TTS Microservice

Microservice for generating Telugu speech audio using Indic Parler-TTS model from AI4Bharat.

## Features

- ✅ Native Telugu script support (UTF-8)
- ✅ Multiple speaker voices (Prakash, Lalitha, Kiran)
- ✅ High-quality audio generation
- ✅ RESTful API endpoints
- ✅ Base64 or binary audio response
- ✅ GPU support (optional but recommended)

## Prerequisites

- Python 3.8 or higher
- pip package manager
- CUDA-capable GPU (optional, but highly recommended for faster inference)
- At least 4GB RAM (8GB+ recommended)

## Installation

### Step 1: Install Python Dependencies

```bash
cd server/tts-service
pip install -r requirements.txt
```

**Note:** The first time you install, it will download the Indic Parler-TTS model (~1-2GB). This may take several minutes depending on your internet connection.

### Step 2: Verify Installation

```bash
python -c "import torch; print(f'PyTorch version: {torch.__version__}')"
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

## Running the Service

### Development Mode

```bash
cd server/tts-service
python app.py
```

The service will start on `http://localhost:5001` by default.

### Production Mode

For production, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 1 -b 0.0.0.0:5001 app:app
```

**Note:** Use `-w 1` (single worker) because the model is loaded in memory and multiple workers would consume too much RAM.

## Environment Variables

You can configure the service using environment variables:

```bash
# Port (default: 5001)
export TTS_PORT=5001

# Audio output directory (default: system temp directory)
export AUDIO_OUTPUT_DIR=/path/to/audio/output
```

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "device": "cuda",
  "model_loaded": true,
  "model_name": "ai4bharat/indic-parler-tts"
}
```

### Generate Audio (Binary)

```http
POST /generate
Content-Type: application/json

{
  "text": "హలో, మీరు ఈరోజు ఎలా ఉన్నారు?",
  "speaker": "lalitha"
}
```

**Response:** Binary WAV file

### Generate Audio (Base64)

```http
POST /generate-base64
Content-Type: application/json

{
  "text": "హలో, మీరు ఈరోజు ఎలా ఉన్నారు?",
  "speaker": "prakash",
  "description": "Custom description (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "audio": "base64_encoded_audio_string",
  "format": "wav",
  "sampling_rate": 24000
}
```

### Get Available Speakers

```http
GET /speakers
```

**Response:**
```json
{
  "speakers": {
    "prakash": {
      "name": "Prakash",
      "gender": "Male",
      "description": "..."
    },
    "lalitha": {
      "name": "Lalitha",
      "gender": "Female",
      "description": "..."
    },
    "kiran": {
      "name": "Kiran",
      "gender": "Male",
      "description": "..."
    }
  }
}
```

## Available Speakers

| Speaker | Gender | Best For |
|---------|--------|----------|
| **Prakash** | Male | Confident, neutral tone |
| **Lalitha** | Female | Calm, expressive tone (Recommended) |
| **Kiran** | Male | Clear, natural tone |

## Request Parameters

### `text` (required)
- Telugu text in native script (UTF-8)
- Must be non-empty
- Example: `"హలో, మీరు ఈరోజు ఎలా ఉన్నారు?"`

### `speaker` (optional)
- One of: `"prakash"`, `"lalitha"`, `"kiran"`
- Default: `"lalitha"`

### `description` (optional)
- Custom voice description
- If not provided, uses predefined description for the selected speaker
- Example: `"Lalitha speaks Telugu with a calm and expressive tone, very clear audio."`

## Tips for Best Results

### ✅ DO:
- Use short sentences for better prosody
- Add proper punctuation: `హలో, మీరు ఈరోజు ఎలా ఉన్నారు?`
- Use native Telugu script (not transliteration)
- Always include "very clear audio" in custom descriptions

### ❌ DON'T:
- Mix English + Telugu in the same sentence
- Omit description text (if using custom description)
- Use transliteration instead of native script
- Send very long texts (split into sentences)

## Example Usage

### Using cURL

```bash
# Generate audio file
curl -X POST http://localhost:5001/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "హలో, మీరు ఈరోజు ఎలా ఉన్నారు?", "speaker": "lalitha"}' \
  --output telugu_audio.wav

# Get base64 audio
curl -X POST http://localhost:5001/generate-base64 \
  -H "Content-Type: application/json" \
  -d '{"text": "హలో, మీరు ఈరోజు ఎలా ఉన్నారు?", "speaker": "prakash"}'
```

### Using Python

```python
import requests

response = requests.post(
    'http://localhost:5001/generate-base64',
    json={
        'text': 'హలో, మీరు ఈరోజు ఎలా ఉన్నారు?',
        'speaker': 'lalitha'
    }
)

data = response.json()
audio_base64 = data['audio']
```

## Troubleshooting

### Model Loading Issues

If the model fails to load:
1. Check internet connection (first-time download)
2. Verify sufficient disk space (~2GB for model)
3. Check Python version: `python --version` (should be 3.8+)

### CUDA/GPU Issues

If CUDA is not available:
- The service will fall back to CPU (slower but works)
- To enable GPU, install CUDA-enabled PyTorch:
  ```bash
  pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
  ```

### Memory Issues

If you get out-of-memory errors:
- Use CPU mode (slower)
- Reduce batch size in model generation
- Close other applications using GPU memory

## Integration with Node.js Backend

The Node.js backend automatically connects to this service. Make sure:

1. TTS service is running on `http://localhost:5001` (or set `TTS_API_URL` env var)
2. Node.js backend can reach the Python service
3. Both services are on the same network or localhost

## Performance

- **First request:** ~5-10 seconds (model warmup)
- **Subsequent requests:** ~2-5 seconds per sentence
- **GPU acceleration:** 2-3x faster than CPU

## License

This service uses the Indic Parler-TTS model from AI4Bharat. Please refer to their license terms.
