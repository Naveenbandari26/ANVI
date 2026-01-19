import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { transcribeAudio, transcribeAudioFile } from '../services/vosk.service';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);

// Configure multer for audio file uploads
const upload = multer({
  dest: 'uploads/audio/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(wav|mp3|ogg|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

/**
 * Transcribe audio file
 */
export async function transcribeAudioHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided',
      });
    }

    const audioFilePath = req.file.path;
    
    try {
      const transcription = await transcribeAudioFile(audioFilePath);
      
      // Clean up uploaded file
      await unlink(audioFilePath).catch(console.error);

      res.json({
        success: true,
        data: {
          transcription,
        },
      });
    } catch (error) {
      // Clean up on error
      await unlink(audioFilePath).catch(console.error);
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Transcribe audio buffer (for streaming)
 */
export async function transcribeAudioBuffer(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { audioData, sampleRate = 16000 } = req.body;

    if (!audioData) {
      return res.status(400).json({
        success: false,
        message: 'No audio data provided',
      });
    }

    // Convert base64 to buffer if needed
    let audioBuffer: Buffer;
    if (typeof audioData === 'string') {
      audioBuffer = Buffer.from(audioData, 'base64');
    } else {
      audioBuffer = Buffer.from(audioData);
    }

    const transcription = await transcribeAudio(audioBuffer, sampleRate);

    res.json({
      success: true,
      data: {
        transcription,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Export multer middleware
export const uploadAudio = upload.single('audio');


