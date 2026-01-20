import { Router } from 'express';
import {
  getUserCalls,
  getCallById,
  acceptCall,
  declineCall,
  endCall,
  createScheduledCallHandler,
} from '../controllers/call.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getUserCalls);
router.get('/:callId', getCallById);
router.post('/', createScheduledCallHandler);
router.post('/:callId/accept', acceptCall);
router.post('/:callId/decline', declineCall);
router.post('/:callId/end', endCall);

export default router;


