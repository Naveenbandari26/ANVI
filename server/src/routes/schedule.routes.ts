import { Router } from 'express';
import {
  getUserSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/schedule.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getUserSchedules);
router.get('/:scheduleId', getScheduleById);
router.post('/', createSchedule);
router.put('/:scheduleId', updateSchedule);
router.delete('/:scheduleId', deleteSchedule);

export default router;


