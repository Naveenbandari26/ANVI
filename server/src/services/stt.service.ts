import { transcribeAudioFile, transcribeAudio } from './vosk.service';
import fs from 'fs';
import path from 'path';

/**
 * Service wrapper for STT operations
 */
export class STTService {
  /**
   * Transcribe audio file
   */
  async transcribeFile(audioFilePath: string): Promise<string> {
    try {
      return await transcribeAudioFile(audioFilePath);
    } catch (error) {
      console.error('STT Service error:', error);
      throw new Error('Failed to transcribe audio file');
    }
  }

  /**
   * Transcribe audio buffer
   */
  async transcribeBuffer(audioBuffer: Buffer, sampleRate: number = 16000): Promise<string> {
    try {
      return await transcribeAudio(audioBuffer, sampleRate);
    } catch (error) {
      console.error('STT Service error:', error);
      throw new Error('Failed to transcribe audio buffer');
    }
  }

  /**
   * Check if Vosk model is available
   */
  isModelAvailable(): boolean {
    const MODEL_PATH = process.env.VOSK_MODEL_PATH || path.join(__dirname, '../../models/vosk-model-te');
    return fs.existsSync(MODEL_PATH);
  }
}


