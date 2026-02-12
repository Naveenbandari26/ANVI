import { Request, Response, NextFunction } from 'express';
import { ScheduleModel } from '../models/schedule.schema';
import { startScheduleCron, stopScheduleCron, calculateNextTrigger } from '../services/schedule.service';
import { AuthRequest } from '../middleware/authenticate';

/**
 * Get user's schedules
 */
export async function getUserSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;

    const schedules = await ScheduleModel.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get schedule by ID
 */
export async function getScheduleById(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params;
    const userId = (req as AuthRequest).userId;

    const schedule = await ScheduleModel.findOne({ _id: scheduleId, userId });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
      });
    }

    return res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Create a new schedule
 */
export async function createSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    const { name, time, daysOfWeek, timezone = 'UTC', isActive = true } = req.body;

    if (!time || !daysOfWeek || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Time and daysOfWeek are required',
      });
    }

    // Validate time format (HH:mm)
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return res.status(400).json({
        success: false,
        message: 'Time must be in HH:mm format',
      });
    }

    // Validate days
    if (!daysOfWeek.every((day: number) => day >= 0 && day <= 6)) {
      return res.status(400).json({
        success: false,
        message: 'Days must be between 0 (Sunday) and 6 (Saturday)',
      });
    }

    const schedule = await ScheduleModel.create({
      userId,
      name,
      time,
      daysOfWeek,
      timezone,
      isActive,
    });

    // Calculate next trigger
    schedule.nextTrigger = calculateNextTrigger(schedule);
    await schedule.save();

    // Start cron job if active
    if (schedule.isActive) {
      startScheduleCron(schedule);
    }

    return res.status(201).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update schedule
 */
export async function updateSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params;
    const userId = (req as AuthRequest).userId;
    const updates = req.body;

    const schedule = await ScheduleModel.findOne({ _id: scheduleId, userId });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
      });
    }

    // Validate time if provided
    if (updates.time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updates.time)) {
      return res.status(400).json({
        success: false,
        message: 'Time must be in HH:mm format',
      });
    }

    // Update schedule
    Object.assign(schedule, updates);

    // Recalculate next trigger
    schedule.nextTrigger = calculateNextTrigger(schedule);
    await schedule.save();

    // Update cron job
    if (schedule.isActive) {
      startScheduleCron(schedule);
    } else {
      stopScheduleCron(scheduleId);
    }

    return res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete schedule
 */
export async function deleteSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduleId } = req.params;
    const userId = (req as AuthRequest).userId;

    const schedule = await ScheduleModel.findOne({ _id: scheduleId, userId });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
      });
    }

    // Stop cron job
    stopScheduleCron(scheduleId);

    await ScheduleModel.findByIdAndDelete(scheduleId);

    return res.json({
      success: true,
      message: 'Schedule deleted',
    });
  } catch (error) {
    return next(error);
  }
}
