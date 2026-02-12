import { Request, Response, NextFunction } from 'express';
import {
  getDiaryEntry,
  getUserDiaryEntries,
  searchDiaryEntries,
  updateDiaryEntry,
  deleteDiaryEntry,
} from '../services/diary.service';
import { AuthRequest } from '../middleware/authenticate';

/**
 * Get diary entry by ID
 */
export async function getDiaryEntryById(req: Request, res: Response, next: NextFunction) {
  try {
    const { diaryId } = req.params;
    const userId = (req as AuthRequest).userId;

    const diary = await getDiaryEntry(diaryId);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found',
      });
    }

    if (diary.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    return res.json({
      success: true,
      data: diary,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get user's diary entries
 */
export async function getUserDiaryEntriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    const { limit = 20, skip = 0 } = req.query;

    const entries = await getUserDiaryEntries(userId!, Number(limit), Number(skip));

    return res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Search diary entries
 */
export async function searchDiary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    const { q, limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const entries = await searchDiaryEntries(userId!, q, Number(limit));

    return res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update diary entry
 */
export async function updateDiaryEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { diaryId } = req.params;
    const userId = (req as AuthRequest).userId;
    const updates = req.body;

    const diary = await getDiaryEntry(diaryId);
    if (!diary || diary.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found',
      });
    }

    const updated = await updateDiaryEntry(diaryId, updates);

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete diary entry
 */
export async function deleteDiaryEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { diaryId } = req.params;
    const userId = (req as AuthRequest).userId;

    const diary = await getDiaryEntry(diaryId);
    if (!diary || diary.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found',
      });
    }

    await deleteDiaryEntry(diaryId);

    return res.json({
      success: true,
      message: 'Diary entry deleted',
    });
  } catch (error) {
    return next(error);
  }
}
