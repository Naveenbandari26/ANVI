import { Router } from 'express';
import userRoutes from './user.routes';
import authRoutes from './auth.routes';

const router = Router();

// API version prefix
const API_VERSION = process.env.API_VERSION || 'v1';

// Route definitions
router.use(`/${API_VERSION}/users`, userRoutes);
router.use(`/${API_VERSION}/auth`, authRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({
    message: 'ANVI API Server',
    version: API_VERSION,
    endpoints: {
      users: `/api/${API_VERSION}/users`,
      auth: `/api/${API_VERSION}/auth`,
    },
  });
});

export default router;

