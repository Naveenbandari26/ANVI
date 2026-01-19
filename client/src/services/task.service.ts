import api from '../config/api';

export interface Task {
  _id: string;
  userId: string;
  conversationId?: string;
  callId?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  scheduledTime?: string;
  completedAt?: string;
  tags?: string[];
  createdAt: string;
}

export const taskService = {
  async getTasks(status?: string, priority?: string): Promise<Task[]> {
    const params: any = {};
    if (status) params.status = status;
    if (priority) params.priority = priority;
    const response = await api.get('/tasks', { params });
    return response.data.data;
  },

  async getTask(taskId: string): Promise<Task> {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data.data;
  },

  async getTasksDueSoon(): Promise<Task[]> {
    const response = await api.get('/tasks/due-soon');
    return response.data.data;
  },

  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    scheduledTime?: string;
    tags?: string[];
  }): Promise<Task> {
    const response = await api.post('/tasks', taskData);
    return response.data.data;
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const response = await api.put(`/tasks/${taskId}`, updates);
    return response.data.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },
};


