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

/**
 * Generate Telugu audio from text using the local TTS microservice
 */
export async function generateTeluguSpeech(text: string, speaker: 'lalitha' | 'prakash' | 'kiran' = 'lalitha'): Promise<TTSResponse> {
  try {
    const response = await axios.post(`${TTS_SERVICE_URL}/generate-base64`, {
      text,
      speaker
    });

    return response.data;
  } catch (error) {
    console.error('Error calling TTS service:', error);
    throw new Error('Failed to generate speech audio');
  }
}
