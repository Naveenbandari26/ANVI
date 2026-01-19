import { Router } from 'express';
import {
  getDiaryEntryById,
  getUserDiaryEntriesHandler,
  searchDiary,
  updateDiaryEntryHandler,
  deleteDiaryEntryHandler,
} from '../controllers/diary.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getUserDiaryEntriesHandler);
router.get('/search', searchDiary);
router.get('/:diaryId', getDiaryEntryById);
router.put('/:diaryId', updateDiaryEntryHandler);
router.delete('/:diaryId', deleteDiaryEntryHandler);

export default router;


