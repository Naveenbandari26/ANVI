"""
Telugu TTS Microservice using Indic Parler-TTS
Flask API service for generating Telugu speech audio
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer
from huggingface_hub import login, HfFolder
import soundfile as sf
import uuid
import os
import tempfile
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configuration
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "ai4bharat/indic-parler-tts"
AUDIO_OUTPUT_DIR = os.getenv("AUDIO_OUTPUT_DIR", tempfile.gettempdir())

# Global model variables (loaded once at startup)
model = None
tokenizer = None
description_tokenizer = None

# Cache for common phrases (LRU cache)
from functools import lru_cache
import hashlib
import base64

# Cache dictionary for audio results
_audio_cache = {}
MAX_CACHE_SIZE = 50  # Cache up to 50 unique phrases

# Telugu speaker descriptions
TELUGU_SPEAKERS = {
    "prakash": "Prakash speaks Telugu in a confident, neutral tone with moderate speed and pitch. The audio is very clear and close-sounding with excellent recording quality.",
    "lalitha": "Lalitha speaks Telugu with a calm and expressive tone, moderate speaking rate, balanced pitch, and very clear audio. The recording is close and high quality with no background noise.",
    "kiran": "Kiran speaks Telugu in a clear and natural tone with moderate pace and pitch. The audio is very clear and high quality."
}

def authenticate_huggingface():
    """Authenticate with Hugging Face if token is provided"""
    hf_token = os.getenv("HUGGINGFACE_TOKEN") or os.getenv("HF_TOKEN")
    
    if hf_token:
        try:
            login(token=hf_token, add_to_git_credential=False)
            print("✅ Authenticated with Hugging Face")
            return True
        except Exception as e:
            print(f"⚠️  Warning: Hugging Face authentication failed: {str(e)}")
            return False
    else:
        # Try to use existing login
        try:
            token = HfFolder.get_token()
            if token:
                print("✅ Using existing Hugging Face token")
                return True
        except:
            pass
        
        print("⚠️  No Hugging Face token found. You may need to authenticate.")
        print("   Set HUGGINGFACE_TOKEN environment variable or run: huggingface-cli login")
        return False

def load_model():
    """Load the Indic Parler-TTS model once at startup"""
    global model, tokenizer, description_tokenizer
    
    try:
        # Authenticate first
        authenticate_huggingface()
        
        print(f"🔄 Loading Indic Parler-TTS model on {DEVICE}...")
        print("📝 Note: This model requires Hugging Face access approval.")
        print("   Request access at: https://huggingface.co/ai4bharat/indic-parler-tts")
        
        # Use token from environment or HfFolder
        hf_token = os.getenv("HUGGINGFACE_TOKEN") or os.getenv("HF_TOKEN") or HfFolder.get_token()
        
        model = ParlerTTSForConditionalGeneration.from_pretrained(
            MODEL_NAME,
            token=hf_token
        ).to(DEVICE)
        
        # OPTIMIZATION: Use FP16 (half precision) for 2x speed improvement
        if DEVICE == "cuda":
            try:
                model = model.half()  # Convert to FP16
                print("✅ Model converted to FP16 (faster inference)")
            except Exception as e:
                print(f"⚠️  Could not convert to FP16: {e}")
        
        # OPTIMIZATION: Torch compile for PyTorch 2.0+ (1.5-2x faster)
        try:
            if hasattr(torch, 'compile') and DEVICE == "cuda":
                model = torch.compile(model, mode='reduce-overhead')
                print("✅ Model compiled with torch.compile (faster inference)")
        except Exception as e:
            print(f"⚠️  Torch compile not available: {e}")
        
        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME,
            token=hf_token
        )
        
        description_tokenizer = AutoTokenizer.from_pretrained(
            model.config.text_encoder._name_or_path,
            token=hf_token
        )
        
        print(f"✅ Model loaded successfully on {DEVICE}")
        
        # Warm up model with a dummy generation
        try:
            warmup_model()
        except Exception as e:
            print(f"⚠️  Model warmup failed: {e}")
        
        return True
    except Exception as e:
        error_msg = str(e)
        if "gated" in error_msg.lower() or "401" in error_msg or "restricted" in error_msg.lower():
            print(f"❌ Error: Model access denied")
            print(f"📝 Steps to fix:")
            print(f"   1. Go to: https://huggingface.co/ai4bharat/indic-parler-tts")
            print(f"   2. Click 'Agree and access repository' to request access")
            print(f"   3. Wait for approval (usually instant)")
            print(f"   4. Get your Hugging Face token from: https://huggingface.co/settings/tokens")
            print(f"   5. Set environment variable: HUGGINGFACE_TOKEN=your_token_here")
            print(f"   6. Or run: huggingface-cli login")
        else:
            print(f"❌ Error loading model: {error_msg}")
        return False

def get_cache_key(text: str, description: str) -> str:
    """Generate cache key for text and description"""
    return hashlib.md5(f"{text}:{description}".encode()).hexdigest()

def generate_telugu_tts(text: str, description: str, use_cache: bool = True) -> tuple[str, int]:
    """
    Generate Telugu audio from text (with caching optimization)
    
    Args:
        text: Telugu text in native script (UTF-8)
        description: Voice description for the speaker
        use_cache: Whether to use cache (default: True)
        
    Returns:
        tuple: (audio_file_path, sampling_rate)
    """
    # OPTIMIZATION: Check cache first
    if use_cache:
        cache_key = get_cache_key(text, description)
        if cache_key in _audio_cache:
            cached_path, cached_sr = _audio_cache[cache_key]
            # Verify file still exists
            if os.path.exists(cached_path):
                print(f"✅ Using cached audio for: {text[:30]}...")
                return cached_path, cached_sr
    
    try:
        # Tokenize description
        desc_inputs = description_tokenizer(
            description, return_tensors="pt"
        ).to(DEVICE)
        
        # Tokenize text
        text_inputs = tokenizer(
            text, return_tensors="pt"
        ).to(DEVICE)
        
        # OPTIMIZATION: Optimized generation parameters for faster inference
        with torch.no_grad():
            audio = model.generate(
                input_ids=desc_inputs.input_ids,
                attention_mask=desc_inputs.attention_mask,
                prompt_input_ids=text_inputs.input_ids,
                prompt_attention_mask=text_inputs.attention_mask,
                max_new_tokens=512,  # Limit max tokens
                do_sample=False,  # Disable sampling (faster, deterministic)
                num_beams=1,  # Single beam (faster than beam search)
            )
        
        # Convert to numpy array (optimize device transfer)
        if DEVICE == "cuda":
            audio_arr = audio.cpu().numpy().squeeze()
        else:
            audio_arr = audio.numpy().squeeze()
        
        sampling_rate = model.config.sampling_rate
        
        # Generate unique filename
        filename = f"telugu_{uuid.uuid4().hex[:8]}.wav"
        filepath = os.path.join(AUDIO_OUTPUT_DIR, filename)
        
        # Ensure output directory exists
        os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
        
        # Save audio file
        sf.write(filepath, audio_arr, sampling_rate)
        
        # OPTIMIZATION: Cache the result
        if use_cache:
            cache_key = get_cache_key(text, description)
            # Limit cache size
            if len(_audio_cache) >= MAX_CACHE_SIZE:
                # Remove oldest entry (simple FIFO)
                oldest_key = next(iter(_audio_cache))
                try:
                    old_path = _audio_cache[oldest_key][0]
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except:
                    pass
                del _audio_cache[oldest_key]
            
            _audio_cache[cache_key] = (filepath, sampling_rate)
        
        return filepath, sampling_rate
        
    except Exception as e:
        raise Exception(f"Error generating audio: {str(e)}")

def warmup_model():
    """Warm up the model with a dummy generation for faster first request"""
    try:
        dummy_text = "హలో"
        dummy_desc = TELUGU_SPEAKERS["lalitha"]
        print("🔥 Warming up model...")
        generate_telugu_tts(dummy_text, dummy_desc, use_cache=False)
        print("✅ Model warmed up successfully")
    except Exception as e:
        print(f"⚠️  Model warmup failed: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "OK",
        "device": DEVICE,
        "model_loaded": model is not None,
        "model_name": MODEL_NAME
    })

@app.route('/generate', methods=['POST'])
def generate_audio():
    """
    Generate Telugu TTS audio
    
    Request body:
    {
        "text": "హలో, మీరు ఈరోజు ఎలా ఉన్నారు?",
        "description": "Lalitha speaks Telugu with a calm and expressive tone, very clear audio.",
        "speaker": "lalitha"  # optional, uses description if provided
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        text = data.get("text")
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Get description - use speaker name or custom description
        description = data.get("description")
        speaker = data.get("speaker", "lalitha").lower()
        
        if not description:
            # Use predefined speaker description
            if speaker in TELUGU_SPEAKERS:
                description = TELUGU_SPEAKERS[speaker]
            else:
                # Default to Lalitha
                description = TELUGU_SPEAKERS["lalitha"]
        
        # Generate audio
        audio_path, sampling_rate = generate_telugu_tts(text, description)
        
        # Return audio file
        return send_file(
            audio_path,
            mimetype='audio/wav',
            as_attachment=True,
            download_name=f"telugu_tts_{uuid.uuid4().hex[:8]}.wav"
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-base64', methods=['POST'])
def generate_audio_base64():
    """
    Generate Telugu TTS audio and return as base64
    
    Request body:
    {
        "text": "హలో, మీరు ఈరోజు ఎలా ఉన్నారు?",
        "description": "Lalitha speaks Telugu with a calm and expressive tone, very clear audio.",
        "speaker": "lalitha"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        text = data.get("text")
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Get description
        description = data.get("description")
        speaker = data.get("speaker", "lalitha").lower()
        
        if not description:
            if speaker in TELUGU_SPEAKERS:
                description = TELUGU_SPEAKERS[speaker]
            else:
                description = TELUGU_SPEAKERS["lalitha"]
        
        # Generate audio
        audio_path, sampling_rate = generate_telugu_tts(text, description)
        
        # Read audio file and convert to base64
        import base64
        with open(audio_path, 'rb') as f:
            audio_data = f.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Clean up temporary file
        try:
            os.remove(audio_path)
        except:
            pass
        
        return jsonify({
            "success": True,
            "audio": audio_base64,
            "format": "wav",
            "sampling_rate": sampling_rate
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/speakers', methods=['GET'])
def get_speakers():
    """Get available Telugu speakers"""
    return jsonify({
        "speakers": {
            "prakash": {
                "name": "Prakash",
                "gender": "Male",
                "description": TELUGU_SPEAKERS["prakash"]
            },
            "lalitha": {
                "name": "Lalitha",
                "gender": "Female",
                "description": TELUGU_SPEAKERS["lalitha"]
            },
            "kiran": {
                "name": "Kiran",
                "gender": "Male",
                "description": TELUGU_SPEAKERS["kiran"]
            }
        }
    })

if __name__ == '__main__':
    # Load model at startup
    if not load_model():
        print("❌ Failed to load model. Exiting...")
        exit(1)
    
    port = int(os.getenv("TTS_PORT", 5001))
    print(f"🚀 Telugu TTS Service starting on port {port}")
    print(f"📝 Health check: http://localhost:{port}/health")
    print(f"🎤 Generate audio: http://localhost:{port}/generate")
    
    app.run(host='0.0.0.0', port=port, debug=False)
