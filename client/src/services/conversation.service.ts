import api from '../config/api';
import { getSocket } from '../config/socket';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  _id: string;
  userId: string;
  callId: string;
  messages: ConversationMessage[];
  transcript: string;
  summary?: string;
  emotionalState?: string;
  keyTopics?: string[];
}

export const conversationService = {
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await api.get(`/conversations/${conversationId}`);
    return response.data.data;
  },

  async getUserConversations(): Promise<Conversation[]> {
    const response = await api.get('/conversations');
    return response.data.data;
  },

  async sendMessage(conversationId: string, message: string): Promise<any> {
    const response = await api.post(`/conversations/${conversationId}/message`, { message });
    return response.data.data;
  },

  async processTranscript(conversationId: string, transcript: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/transcript`, { transcript });
  },

  // Socket.io methods
  onAIResponse(callback: (data: { conversationId: string; message: string }) => void): void {
    const socket = getSocket();
    socket?.on('ai_response', callback);
  },

  offAIResponse(callback: (data: any) => void): void {
    const socket = getSocket();
    socket?.off('ai_response', callback);
  },

  emitTranscriptUpdate(callId: string, transcript: string, userId: string): void {
    const socket = getSocket();
    socket?.emit('transcript_update', { callId, transcript, userId });
  },
};


