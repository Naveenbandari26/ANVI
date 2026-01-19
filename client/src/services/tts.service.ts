import api from '../config/api';

export interface TTSRequest {
  text: string;
  speaker?: 'prakash' | 'lalitha' | 'kiran';
  description?: string;
}

export interface TTSResponse {
  audio: string; // base64 encoded audio
  format: string;
  samplingRate: number;
}

/**
 * Generate Telugu TTS audio
 * Returns base64 encoded audio that can be played with expo-av
 */
export async function generateTTS(request: TTSRequest): Promise<string> {
  try {
    const response = await api.post<TTSResponse>(
      '/tts/generate?format=base64',
      {
        text: request.text,
        speaker: request.speaker || 'lalitha',
        description: request.description,
      }
    );

    if (!response.data.data?.audio) {
      throw new Error('No audio data received from TTS service');
    }

    return response.data.data.audio;
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Failed to generate TTS audio');
  }
}

/**
 * Get available Telugu speakers
 */
export async function getSpeakers(): Promise<any> {
  try {
    const response = await api.get('/tts/speakers');
    return response.data.data;
  } catch (error: any) {
    console.error('Error getting speakers:', error);
    throw new Error('Failed to get speakers');
  }
}
