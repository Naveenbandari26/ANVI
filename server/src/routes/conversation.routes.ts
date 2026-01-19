import { Router } from 'express';
import {
  getConversationById,
  getUserConversationsHandler,
  sendMessage,
  processTranscript,
} from '../controllers/conversation.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getUserConversationsHandler);
router.get('/:conversationId', getConversationById);
router.post('/:conversationId/message', sendMessage);
router.post('/:conversationId/transcript', processTranscript);

export default router;


