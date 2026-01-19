import api from '../config/api';

export interface DiaryEntry {
  _id: string;
  userId: string;
  conversationId: string;
  callId: string;
  entry: string;
  summary: string;
  emotionalState: string;
  mood: string;
  keyReflections: string[];
  importantEvents: string[];
  createdAt: string;
}

export const diaryService = {
  async getDiaryEntries(): Promise<DiaryEntry[]> {
    const response = await api.get('/diary');
    return response.data.data;
  },

  async getDiaryEntry(diaryId: string): Promise<DiaryEntry> {
    const response = await api.get(`/diary/${diaryId}`);
    return response.data.data;
  },

  async searchDiary(query: string): Promise<DiaryEntry[]> {
    const response = await api.get('/diary/search', { params: { q: query } });
    return response.data.data;
  },

  async updateDiaryEntry(diaryId: string, updates: Partial<DiaryEntry>): Promise<DiaryEntry> {
    const response = await api.put(`/diary/${diaryId}`, updates);
    return response.data.data;
  },

  async deleteDiaryEntry(diaryId: string): Promise<void> {
    await api.delete(`/diary/${diaryId}`);
  },
};


