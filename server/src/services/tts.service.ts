import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';

// TTS Python service URL - defaults to localhost
const TTS_API_URL = process.env.TTS_API_URL || 'http://localhost:5001';

// Create axios instance with timeout
const ttsClient: AxiosInstance = axios.create({
  baseURL: TTS_API_URL,
  timeout: 30000, // 30 second timeout for TTS generation
  responseType: 'arraybuffer', // For binary audio data
});

export interface TTSRequest {
  text: string;
  description?: string;
  speaker?: 'prakash' | 'lalitha' | 'kiran';
}

export interface TTSResponse {
  audioBuffer: Buffer;
  filename: string;
  format: string;
  samplingRate?: number;
}

export interface TTSBase64Response {
  audio: string; // base64 encoded
  format: string;
  samplingRate: number;
}

/**
 * Initialize TTS service connection
 * Checks if the Python TTS service is running
 */
export async function initializeTTSService(): Promise<void> {
  try {
    const response = await axios.get(`${TTS_API_URL}/health`);
    if (response.status === 200) {
      console.log('✅ Telugu TTS service is running at', TTS_API_URL);
      console.log('📦 TTS service info:', response.data);
    }
  } catch (error: any) {
    console.warn('⚠️  Telugu TTS service not available at', TTS_API_URL);
    console.warn('📝 Make sure Python TTS service is running:');
    console.warn('   cd server/tts-service && python app.py');
    console.warn('💡 Text-to-speech will not work until TTS service is running');
  }
}

/**
 * Generate Telugu TTS audio and return as buffer
 */
export async function generateTeluguTTS(request: TTSRequest): Promise<TTSResponse> {
  try {
    const response = await ttsClient.post('/generate', {
      text: request.text,
      description: request.description,
      speaker: request.speaker || 'lalitha',
    });

    // Generate filename
    const timestamp = Date.now();
    const filename = `telugu_tts_${timestamp}.wav`;

    return {
      audioBuffer: Buffer.from(response.data),
      filename,
      format: 'wav',
    };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(
        'TTS service is not running. Start it with: cd server/tts-service && python app.py'
      );
    }
    if (error.response) {
      const errorMessage = error.response.data
        ? Buffer.from(error.response.data).toString('utf-8')
        : error.message;
      throw new Error(`TTS generation failed: ${errorMessage}`);
    }
    console.error('Error generating TTS audio:', error.message);
    throw new Error(`TTS generation failed: ${error.message}`);
  }
}

/**
 * Generate Telugu TTS audio and return as base64
 */
export async function generateTeluguTTSBase64(
  request: TTSRequest
): Promise<TTSBase64Response> {
  try {
    const response = await axios.post(
      `${TTS_API_URL}/generate-base64`,
      {
        text: request.text,
        description: request.description,
        speaker: request.speaker || 'lalitha',
      },
      {
        timeout: 30000,
      }
    );

    return {
      audio: response.data.audio,
      format: response.data.format || 'wav',
      samplingRate: response.data.sampling_rate || 24000,
    };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(
        'TTS service is not running. Start it with: cd server/tts-service && python app.py'
      );
    }
    if (error.response) {
      const errorMessage =
        typeof error.response.data === 'string'
          ? error.response.data
          : error.response.data?.error || error.message;
      throw new Error(`TTS generation failed: ${errorMessage}`);
    }
    console.error('Error generating TTS audio:', error.message);
    throw new Error(`TTS generation failed: ${error.message}`);
  }
}

/**
 * Save TTS audio to file
 */
export async function saveTTSAudio(
  audioBuffer: Buffer,
  outputPath: string
): Promise<string> {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write audio file
    fs.writeFileSync(outputPath, audioBuffer);

    return outputPath;
  } catch (error: any) {
    console.error('Error saving TTS audio:', error.message);
    throw new Error(`Failed to save audio file: ${error.message}`);
  }
}

/**
 * Get available Telugu speakers
 */
export async function getTeluguSpeakers(): Promise<any> {
  try {
    const response = await axios.get(`${TTS_API_URL}/speakers`);
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(
        'TTS service is not running. Start it with: cd server/tts-service && python app.py'
      );
    }
    throw new Error(`Failed to get speakers: ${error.message}`);
  }
}
