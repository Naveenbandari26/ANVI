# Vosk Docker Setup Guide

This guide explains how to set up Vosk as a separate Docker service for speech-to-text with Telugu support.

## Why Docker?

- ✅ Works with Node.js v22 (no native compilation issues)
- ✅ Cross-platform compatibility
- ✅ Easy to update and maintain
- ✅ Isolated service (better resource management)
- ✅ Production-ready deployment

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)

## Quick Start

### 1. Start Vosk Docker Container

```bash
cd server
docker-compose -f docker-compose.vosk.yml up -d
```

### 2. Verify Vosk is Running

```bash
# Check container status
docker ps

# Test Vosk API
curl http://localhost:2700/

# Should return: {"status": "ok"}
```

### 3. Download Telugu Model

1. Visit https://alphacephei.com/vosk/models
2. Download a Telugu model or multilingual model:
   - **Telugu Model**: `vosk-model-te` (if available)
   - **Multilingual Model**: `vosk-model-multilingual` (recommended)
   - **Small Multilingual**: `vosk-model-small-multilingual` (faster, less accurate)

3. Extract the model to `server/models/` directory:

   ```
   server/
   ├── models/
   │   └── vosk-model-te/  (or vosk-model-multilingual)
   │       ├── am/
   │       ├── graph/
   │       └── ...
   ```

4. Restart the Docker container to load the model:

   ```bash
   docker-compose -f docker-compose.vosk.yml restart
   ```

## Configuration

### Environment Variables

Add to `server/.env`:

```env
# Vosk HTTP API URL (default: http://localhost:2700)
VOSK_API_URL=http://localhost:2700

# Vosk Docker port (default: 2700)
VOSK_PORT=2700
```

### Docker Compose Options

Edit `docker-compose.vosk.yml` to customize:

- **Port**: Change `2700:2700` to use a different port
- **Model Path**: Change `./models` to point to your model directory
- **Memory**: Add `mem_limit: 2g` if needed

## Usage

Once the Docker container is running, your Node.js app will automatically use it for transcription:

```typescript
// In your code, just use the service as before
import { transcribeAudioFile } from './services/vosk.service';

const text = await transcribeAudioFile('/path/to/audio.wav');
console.log('Transcription:', text);
```

## Management Commands

### Start Vosk Container
```bash
docker-compose -f docker-compose.vosk.yml up -d
```

### Stop Vosk Container
```bash
docker-compose -f docker-compose.vosk.yml stop
```

### View Logs
```bash
docker-compose -f docker-compose.vosk.yml logs -f
```

### Restart Container
```bash
docker-compose -f docker-compose.vosk.yml restart
```

### Remove Container
```bash
docker-compose -f docker-compose.vosk.yml down
```

### Update Vosk Image
```bash
docker-compose -f docker-compose.vosk.yml pull
docker-compose -f docker-compose.vosk.yml up -d
```

## Testing

### Test with curl

```bash
# Test health endpoint
curl http://localhost:2700/

# Test transcription (requires audio file)
curl -X POST http://localhost:2700/transcribe \
  -F "audio=@test-audio.wav"
```

### Test from Node.js

```javascript
const { transcribeAudioFile } = require('./src/services/vosk.service');

transcribeAudioFile('./test-audio.wav')
  .then(text => console.log('Transcription:', text))
  .catch(error => console.error('Error:', error));
```

## Troubleshooting

### Container Won't Start

1. Check Docker is running:
   ```bash
   docker ps
   ```

2. Check logs:
   ```bash
   docker-compose -f docker-compose.vosk.yml logs
   ```

3. Verify port 2700 is not in use:
   ```bash
   netstat -an | findstr 2700  # Windows
   lsof -i :2700              # Mac/Linux
   ```

### Model Not Loading

1. Verify model directory structure:
   ```
   models/vosk-model-te/
   ├── am/
   ├── graph/
   └── ...
   ```

2. Check container logs for model loading errors:
   ```bash
   docker-compose -f docker-compose.vosk.yml logs vosk-server
   ```

3. Ensure model is extracted correctly (not nested in extra folders)

### Connection Refused

1. Verify container is running:
   ```bash
   docker ps | grep vosk
   ```

2. Check VOSK_API_URL in `.env` matches container port

3. Test connection:
   ```bash
   curl http://localhost:2700/
   ```

### Slow Transcription

- Use a smaller model for faster processing
- Increase container memory if needed
- Consider using multiple Vosk instances for load balancing

## Production Deployment

For production:

1. **Use a reverse proxy** (nginx) in front of Vosk
2. **Set resource limits** in docker-compose:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G
       reservations:
         memory: 1G
   ```

3. **Use Docker Swarm or Kubernetes** for orchestration
4. **Monitor container health** with health checks
5. **Set up logging** to external service

## Model Recommendations

### For Telugu Language:

- **Best Quality**: Dedicated Telugu model (if available)
- **Multilingual**: `vosk-model-multilingual` (supports Telugu + 100+ languages)
- **Small & Fast**: `vosk-model-small-multilingual` (faster, good accuracy)

### Model Sizes:

- Small: ~40-50 MB (faster, less accurate)
- Medium: ~1-2 GB (balanced)
- Large: ~2-3 GB (best accuracy)

## Next Steps

1. Download and extract Telugu model
2. Start Docker container
3. Test transcription
4. Integrate with your app

For more information, visit:
- Vosk Models: https://alphacephei.com/vosk/models
- Vosk Server Docker: https://github.com/alphacep/vosk-server
