import { Request, Response, NextFunction } from 'express';
import {
  getTask,
  getUserTasks,
  createTask,
  updateTask,
  deleteTask,
  getTasksDueSoon,
} from '../services/task.service';
import { AuthRequest } from '../middleware/authenticate';

/**
 * Get task by ID
 */
export async function getTaskById(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const userId = (req as AuthRequest).userId;

    const task = await getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (task.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    return res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get user's tasks
 */
export async function getUserTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    const { status, priority, limit = 50, skip = 0 } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    const tasks = await getUserTasks(userId!, filters, Number(limit), Number(skip));

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Create a new task
 */
export async function createTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    const { title, description, priority, dueDate, scheduledTime, tags } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    const task = await createTask({
      userId: userId!,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      tags,
    });

    return res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update task
 */
export async function updateTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const userId = (req as AuthRequest).userId;
    const updates = req.body;

    const task = await getTask(taskId);
    if (!task || task.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Convert date strings to Date objects if present
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
    if (updates.scheduledTime) updates.scheduledTime = new Date(updates.scheduledTime);

    const updated = await updateTask(taskId, updates);

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete task
 */
export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const userId = (req as AuthRequest).userId;

    const task = await getTask(taskId);
    if (!task || task.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    await deleteTask(taskId);

    return res.json({
      success: true,
      message: 'Task deleted',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get tasks due soon
 */
export async function getTasksDueSoonHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;

    const tasks = await getTasksDueSoon(userId!);

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    return next(error);
  }
}
