import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://localhost:5001';

export interface TTSResponse {
  success: boolean;
  audio: string; // base64 string
  format: string;
  sampling_rate: number;
}

export interface TTSRequest {
  text: string;
  description?: string;
  speaker?: 'lalitha' | 'prakash' | 'kiran';
}

export interface TTSBase64Response {
  audio: string;
  format: string;
  samplingRate: number;
}

export interface TTSBinaryResponse {
  audioBuffer: Buffer;
  filename: string;
  format: string;
}

/**
 * Initialize and check connection to the TTS service
 */
export async function initializeTTSService(): Promise<void> {
  try {
    const response = await axios.get(`${TTS_SERVICE_URL}/health`);
    if (response.data.status === 'OK') {
      console.log('✅ Connected to Telugu TTS service');
    } else {
      throw new Error('TTS service health check failed');
    }
  } catch (error: any) {
    throw new Error(`Could not connect to TTS service at ${TTS_SERVICE_URL}: ${error.message}`);
  }
}

// Cache for TTS service availability check
let ttsServiceAvailable: boolean | null = null;
let lastHealthCheck: number = 0;
const HEALTH_CHECK_INTERVAL = 30000; // Check every 30 seconds

/**
 * Quick health check for TTS service (cached)
 */
async function checkTTSServiceHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Use cached result if recent
  if (ttsServiceAvailable !== null && (now - lastHealthCheck) < HEALTH_CHECK_INTERVAL) {
    return ttsServiceAvailable;
  }

  try {
    // No timeout - let health check take as long as needed
    const response = await axios.get(`${TTS_SERVICE_URL}/health`);
    ttsServiceAvailable = response.data?.status === 'OK';
    lastHealthCheck = now;
    return ttsServiceAvailable;
  } catch (error) {
    ttsServiceAvailable = false;
    lastHealthCheck = now;
    return false;
  }
}

/**
 * Generate Telugu audio from text using the local TTS microservice
 * No timeout - will wait as long as needed for generation
 * Never blocks - returns error gracefully if service unavailable
 */
export async function generateTeluguSpeech(text: string, speaker: 'lalitha' | 'prakash' | 'kiran' = 'lalitha'): Promise<TTSResponse> {
  // Quick health check first (non-blocking, cached)
  const isHealthy = await checkTTSServiceHealth();
  if (!isHealthy) {
    console.warn('TTS service unavailable - skipping audio generation');
    throw new Error('TTS service unavailable');
  }

  try {
    // No timeout - let it take as long as needed
    const response = await axios.post(
      `${TTS_SERVICE_URL}/generate-base64`,
      {
        text,
        speaker
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 300,
      }
    );

    if (!response.data || !response.data.audio) {
      // Mark service as unavailable
      ttsServiceAvailable = false;
      throw new Error('Invalid TTS response');
    }

    // Service is working, mark as available
    ttsServiceAvailable = true;
    return response.data;
  } catch (error: any) {
    // Mark service as unavailable on connection errors
    if (error.code === 'ECONNREFUSED') {
      ttsServiceAvailable = false;
      console.warn('TTS service connection refused - marking as unavailable');
      throw new Error('TTS service unavailable');
    }
    
    // For other errors, don't mark as unavailable (might be temporary)
    console.error('Error calling TTS service:', error.message);
    throw new Error('Failed to generate speech audio');
  }
}

/**
 * Generate Telugu TTS and return base64 encoded audio (for API endpoint)
 */
export async function generateTeluguTTSBase64(request: TTSRequest): Promise<TTSBase64Response> {
  const speaker = request.speaker || 'lalitha';
  const result = await generateTeluguSpeech(request.text, speaker);
  
  return {
    audio: result.audio,
    format: result.format || 'wav',
    samplingRate: result.sampling_rate || 22050,
  };
}

/**
 * Generate Telugu TTS and return binary audio buffer (for API endpoint)
 */
export async function generateTeluguTTS(request: TTSRequest): Promise<TTSBinaryResponse> {
  const speaker = request.speaker || 'lalitha';
  
  try {
    // No timeout - let it take as long as needed
    const response = await axios.post(
      `${TTS_SERVICE_URL}/generate`,
      {
        text: request.text,
        speaker
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        responseType: 'arraybuffer',
        maxRedirects: 0,
      }
    );

    const audioBuffer = Buffer.from(response.data);
    const timestamp = Date.now();
    
    return {
      audioBuffer,
      filename: `tts_${timestamp}.wav`,
      format: 'wav',
    };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('TTS service connection refused');
      throw new Error('TTS service unavailable');
    }
    console.error('Error calling TTS service:', error.message);
    throw new Error('Failed to generate speech audio');
  }
}

/**
 * Get available Telugu speakers
 */
export async function getTeluguSpeakers(): Promise<{ speakers: Record<string, string> }> {
  try {
    // No timeout - let it take as long as needed
    const response = await axios.get(`${TTS_SERVICE_URL}/speakers`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting speakers:', error.message);
    // Return default speakers if service unavailable
    return {
      speakers: {
        lalitha: 'Lalitha (Female)',
        prakash: 'Prakash (Male)',
        kiran: 'Kiran (Male)',
      },
    };
  }
}
