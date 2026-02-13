import { Request, Response, NextFunction } from 'express';
import {
  generateTeluguTTS,
  generateTeluguTTSBase64,
  getTeluguSpeakers,
  TTSRequest,
} from '../services/tts.service';

/**
 * Generate Telugu TTS audio
 * POST /api/v1/tts/generate
 */
// @ts-ignore
export async function generateTTS(req: Request, res: Response, next: NextFunction) {
  try {
    const { text, description, speaker } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required',
      });
    }

    // Validate text is not empty
    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text must be a non-empty string',
      });
    }

    const ttsRequest: TTSRequest = {
      text: text.trim(),
      description,
      speaker: speaker || 'lalitha',
    };

    // Check if client wants base64 response
    const responseFormat = req.query.format || req.headers.accept;

    // @ts-ignore
    if (responseFormat === 'base64' || responseFormat?.includes('application/json')) {
      // Return base64 encoded audio
      const result = await generateTeluguTTSBase64(ttsRequest);

      return res.json({
        success: true,
        data: {
          audio: result.audio,
          format: result.format,
          samplingRate: result.samplingRate,
        },
      });
    } else {
      // Return binary audio file
      const result = await generateTeluguTTS(ttsRequest);

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.audioBuffer.length.toString());

      return res.send(result.audioBuffer);
    }
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    next(error);
  }
}

/**
 * Get available Telugu speakers
 * GET /api/v1/tts/speakers
 */
// @ts-ignore
export async function getSpeakers(req: Request, res: Response, next: NextFunction) {
  try {
    const speakers = await getTeluguSpeakers();

    return res.json({
      success: true,
      data: speakers,
    });
  } catch (error: any) {
    console.error('Error getting speakers:', error);
    next(error);
  }
}

/**
 * Health check for TTS service
 * GET /api/v1/tts/health
 */
// @ts-ignore
export async function ttsHealthCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const speakers = await getTeluguSpeakers();

    return res.json({
      success: true,
      message: 'TTS service is available',
      data: {
        service: 'telugu-tts',
        speakers: Object.keys(speakers.speakers || {}),
      },
    });
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      message: 'TTS service is not available',
      error: error.message,
    });
  }
}
