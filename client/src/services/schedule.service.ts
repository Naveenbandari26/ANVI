import api from '../config/api';

export interface Schedule {
  _id: string;
  userId: string;
  name?: string;
  time: string;
  daysOfWeek: number[];
  timezone: string;
  isActive: boolean;
  lastTriggered?: string;
  nextTrigger?: string;
}

export const scheduleService = {
  async getSchedules(): Promise<Schedule[]> {
    const response = await api.get('/schedules');
    return response.data.data;
  },

  async getSchedule(scheduleId: string): Promise<Schedule> {
    const response = await api.get(`/schedules/${scheduleId}`);
    return response.data.data;
  },

  async createSchedule(scheduleData: {
    name?: string;
    time: string;
    daysOfWeek: number[];
    timezone?: string;
    isActive?: boolean;
  }): Promise<Schedule> {
    const response = await api.post('/schedules', scheduleData);
    return response.data.data;
  },

  async updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule> {
    const response = await api.put(`/schedules/${scheduleId}`, updates);
    return response.data.data;
  },

  async deleteSchedule(scheduleId: string): Promise<void> {
    await api.delete(`/schedules/${scheduleId}`);
  },
};


