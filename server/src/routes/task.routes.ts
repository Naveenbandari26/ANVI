import { Router } from 'express';
import {
  getTaskById,
  getUserTasksHandler,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  getTasksDueSoonHandler,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getUserTasksHandler);
router.get('/due-soon', getTasksDueSoonHandler);
router.get('/:taskId', getTaskById);
router.post('/', createTaskHandler);
router.put('/:taskId', updateTaskHandler);
router.delete('/:taskId', deleteTaskHandler);

export default router;


