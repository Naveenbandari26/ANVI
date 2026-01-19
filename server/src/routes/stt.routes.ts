import { Router } from 'express';
import {
  transcribeAudioHandler,
  transcribeAudioBuffer,
  uploadAudio,
} from '../controllers/stt.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Transcribe audio file upload
router.post('/file', uploadAudio, transcribeAudioHandler);

// Transcribe audio buffer (for streaming)
router.post('/buffer', transcribeAudioBuffer);

export default router;


