import { Router } from 'express';
import { generateTTS, getSpeakers, ttsHealthCheck } from '../controllers/tts.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Health check (public)
router.get('/health', ttsHealthCheck);

// All other routes require authentication
router.use(authenticate);

// Generate Telugu TTS audio
router.post('/generate', generateTTS);

// Get available speakers
router.get('/speakers', getSpeakers);

export default router;
