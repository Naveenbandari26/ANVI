import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// Vosk HTTP API URL - defaults to localhost Docker container
const VOSK_API_URL = process.env.VOSK_API_URL || 'http://localhost:2700';

// Create axios instance with timeout
const voskClient: AxiosInstance = axios.create({
  baseURL: VOSK_API_URL,
  timeout: 60000, // 60 second timeout for transcription
});

/**
 * Initialize Vosk HTTP API connection
 * Checks if the Vosk Docker container is running
 */
export async function initializeVoskModel(): Promise<void> {
  try {
    const response = await voskClient.get('/');
    if (response.status === 200) {
      console.log('✅ Vosk HTTP API server is running at', VOSK_API_URL);
      
      // Try to get model info if available
      try {
        const modelInfo = await voskClient.get('/model');
        console.log('📦 Vosk model info:', modelInfo.data);
      } catch (error) {
        // Model info endpoint might not be available
      }
    }
  } catch (error: any) {
    console.warn('⚠️  Vosk HTTP API server not available at', VOSK_API_URL);
    console.warn('📝 Make sure Vosk Docker container is running:');
    console.warn('   docker-compose -f docker-compose.vosk.yml up -d');
    console.warn('💡 Speech-to-text will not work until Vosk server is running');
  }
}

/**
 * Transcribe audio file using Vosk HTTP API
 */
export async function transcribeAudioFile(audioFilePath: string): Promise<string> {
  try {
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const form = new FormData();
    form.append('audio', fs.createReadStream(audioFilePath), {
      filename: 'audio.wav',
      contentType: 'audio/wav',
    });

    const response = await voskClient.post('/transcribe', form, {
      headers: form.getHeaders(),
    });

    const result = response.data;
    
    // Vosk HTTP API returns { text: "...", result: [...] }
    if (result.text) {
      return result.text.trim();
    }
    
    // Fallback: extract text from result array
    if (result.result && Array.isArray(result.result)) {
      const words = result.result
        .map((item: any) => item.word || '')
        .filter((word: string) => word)
        .join(' ');
      
      return words.trim();
    }

    // If no text found, return empty string
    console.warn('⚠️  Vosk returned empty transcription');
    return '';
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Vosk server is not running. Start it with: docker-compose -f docker-compose.vosk.yml up -d');
    }
    console.error('Error transcribing audio file via Vosk HTTP API:', error.message);
    throw new Error(`Vosk transcription failed: ${error.message}`);
  }
}

/**
 * Transcribe audio buffer using Vosk HTTP API
 */
export async function transcribeAudio(audioBuffer: Buffer, sampleRate: number = 16000): Promise<string> {
  try {
    const form = new FormData();
    form.append('audio', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav',
    });

    const response = await voskClient.post('/transcribe', form, {
      headers: form.getHeaders(),
    });

    const result = response.data;
    
    if (result.text) {
      return result.text.trim();
    }
    
    if (result.result && Array.isArray(result.result)) {
      const words = result.result
        .map((item: any) => item.word || '')
        .filter((word: string) => word)
        .join(' ');
      
      return words.trim();
    }

    return '';
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Vosk server is not running. Start it with: docker-compose -f docker-compose.vosk.yml up -d');
    }
    console.error('Error transcribing audio buffer:', error.message);
    throw new Error(`Vosk transcription failed: ${error.message}`);
  }
}

/**
 * Streaming recognizer (for real-time transcription)
 * Note: Vosk HTTP API doesn't support true streaming,
 * but you can send chunks and combine results
 */
export class StreamingRecognizer {
  private chunks: string[] = [];
  private sampleRate: number;

  constructor(sampleRate: number = 16000) {
    this.sampleRate = sampleRate;
  }

  /**
   * Process an audio chunk
   * Note: Each chunk is sent as a separate request to Vosk HTTP API
   */
  async processChunk(audioChunk: Buffer): Promise<string | null> {
    try {
      const text = await transcribeAudio(audioChunk, this.sampleRate);
      if (text && text.trim()) {
        this.chunks.push(text);
        return text;
      }
      return null;
    } catch (error) {
      console.error('Error processing chunk:', error);
      return null;
    }
  }

  /**
   * Get the combined result from all processed chunks
   */
  getFinalResult(): string {
    return this.chunks.join(' ').trim();
  }

  /**
   * Reset the recognizer (clear all chunks)
   */
  reset(): void {
    this.chunks = [];
  }

  /**
   * Free resources (no-op for HTTP API)
   */
  free(): void {
    this.chunks = [];
  }
}
