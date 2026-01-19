import { TaskModel, ITask } from '../models/task.schema';
import { ConversationModel } from '../models/conversation.schema';
import { extractTasks } from './gemini.service';

/**
 * Create tasks from conversation
 */
export async function createTasksFromConversation(
  conversationId: string
): Promise<ITask[]> {
  try {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Extract tasks using Gemini
    const extractedTasks = await extractTasks(conversation.transcript);

    // Create task records
    const tasks = await Promise.all(
      extractedTasks.map(async (taskData) => {
        const task = await TaskModel.create({
          userId: conversation.userId,
          conversationId: conversation._id,
          callId: conversation.callId,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || 'medium',
          status: 'pending',
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
          scheduledTime: taskData.scheduledTime ? new Date(taskData.scheduledTime) : undefined,
        });
        return task;
      })
    );

    return tasks;
  } catch (error) {
    console.error('Error creating tasks from conversation:', error);
    throw error;
  }
}

/**
 * Get task by ID
 */
export async function getTask(taskId: string): Promise<ITask | null> {
  return TaskModel.findById(taskId);
}

/**
 * Get user's tasks
 */
export async function getUserTasks(
  userId: string,
  filters?: {
    status?: string;
    priority?: string;
    dueDateFrom?: Date;
    dueDateTo?: Date;
  },
  limit: number = 50,
  skip: number = 0
): Promise<ITask[]> {
  const query: any = { userId };

  if (filters?.status) {
    query.status = filters.status;
  }
  if (filters?.priority) {
    query.priority = filters.priority;
  }
  if (filters?.dueDateFrom || filters?.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) {
      query.dueDate.$gte = filters.dueDateFrom;
    }
    if (filters.dueDateTo) {
      query.dueDate.$lte = filters.dueDateTo;
    }
  }

  return TaskModel.find(query)
    .sort({ priority: -1, dueDate: 1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
}

/**
 * Create a new task
 */
export async function createTask(taskData: {
  userId: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  scheduledTime?: Date;
  tags?: string[];
}): Promise<ITask> {
  return TaskModel.create({
    ...taskData,
    status: 'pending',
  });
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<ITask>
): Promise<ITask | null> {
  if (updates.status === 'completed' && !updates.completedAt) {
    updates.completedAt = new Date();
  }
  return TaskModel.findByIdAndUpdate(taskId, updates, { new: true });
}

/**
 * Delete task
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  const result = await TaskModel.findByIdAndDelete(taskId);
  return !!result;
}

/**
 * Get tasks due soon (next 7 days)
 */
export async function getTasksDueSoon(userId: string): Promise<ITask[]> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return TaskModel.find({
    userId,
    status: { $in: ['pending', 'in_progress'] },
    dueDate: {
      $gte: now,
      $lte: sevenDaysFromNow,
    },
  }).sort({ dueDate: 1, priority: -1 });
}


