import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();
const userController = new UserController();

// Public routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);

// Protected routes (require authentication)
router.post('/', authenticate, validateRequest(createUserSchema), userController.createUser);
router.put('/:id', authenticate, validateRequest(updateUserSchema), userController.updateUser);
router.delete('/:id', authenticate, userController.deleteUser);

export default router;

