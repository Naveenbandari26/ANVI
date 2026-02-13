import { Router } from 'express';
import userRoutes from './user.routes';
import authRoutes from './auth.routes';
import callRoutes from './call.routes';
import conversationRoutes from './conversation.routes';
import diaryRoutes from './diary.routes';
import taskRoutes from './task.routes';
import scheduleRoutes from './schedule.routes';
import ttsRoutes from './tts.routes';

const router = Router();

// API version prefix
const API_VERSION = process.env.API_VERSION || 'v1';

// Route definitions
router.use(`/${API_VERSION}/users`, userRoutes);
router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/calls`, callRoutes);
router.use(`/${API_VERSION}/conversations`, conversationRoutes);
router.use(`/${API_VERSION}/diary`, diaryRoutes);
router.use(`/${API_VERSION}/tasks`, taskRoutes);
router.use(`/${API_VERSION}/schedules`, scheduleRoutes);
router.use(`/${API_VERSION}/tts`, ttsRoutes);

// Debug: Log route registration
console.log(`📋 API Routes registered with version: ${API_VERSION}`);
console.log(`   Auth routes: /api/${API_VERSION}/auth`);

// Default route
// @ts-ignore
router.get('/', (req, res) => {
  res.json({
    message: 'ANVI API Server',
    version: API_VERSION,
    endpoints: {
      users: `/api/${API_VERSION}/users`,
      auth: `/api/${API_VERSION}/auth`,
      calls: `/api/${API_VERSION}/calls`,
      conversations: `/api/${API_VERSION}/conversations`,
      diary: `/api/${API_VERSION}/diary`,
      tasks: `/api/${API_VERSION}/tasks`,
      schedules: `/api/${API_VERSION}/schedules`,
      tts: `/api/${API_VERSION}/tts`,
    },
    testAuth: {
      register: `POST /api/${API_VERSION}/auth/register`,
      login: `POST /api/${API_VERSION}/auth/login`,
    },
  });
});

export default router;

