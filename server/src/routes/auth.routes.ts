import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

// Test route to verify routing works
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!', path: req.originalUrl });
});

// Authentication routes
router.post('/register', (req, res, next) => {
  console.log('🔐 Register route hit:', req.method, req.originalUrl, req.path);
  validateRequest(registerSchema)(req, res, next);
}, authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);

// Debug: Log auth routes
console.log('🔐 Auth routes registered: /register, /login, /logout, /refresh');

export default router;

