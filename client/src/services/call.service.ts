import api from '../config/api';
import { getSocket } from '../config/socket';

export interface Call {
  _id: string;
  userId: string;
  scheduledTime: string;
  status: 'scheduled' | 'ringing' | 'accepted' | 'declined' | 'completed' | 'missed';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  conversationId?: string;
}

export const callService = {
  async getUserCalls(status?: string): Promise<Call[]> {
    const params = status ? { status } : {};
    const response = await api.get('/calls', { params });
    return response.data.data;
  },

  async getCallById(callId: string): Promise<Call> {
    const response = await api.get(`/calls/${callId}`);
    return response.data.data;
  },

  async acceptCall(callId: string): Promise<{ call: Call; conversation: any }> {
    const response = await api.post(`/calls/${callId}/accept`);
    return response.data.data;
  },

  async declineCall(callId: string): Promise<Call> {
    const response = await api.post(`/calls/${callId}/decline`);
    return response.data.data;
  },

  async endCall(callId: string): Promise<Call> {
    const response = await api.post(`/calls/${callId}/end`);
    return response.data.data;
  },

  async createScheduledCall(scheduledTime: string): Promise<Call> {
    const response = await api.post('/calls', { scheduledTime });
    return response.data.data;
  },

  // Socket.io methods
  onIncomingCall(callback: (data: { callId: string; scheduledTime: string }) => void): void {
    const socket = getSocket();
    socket?.on('incoming_call', callback);
  },

  offIncomingCall(callback: (data: any) => void): void {
    const socket = getSocket();
    socket?.off('incoming_call', callback);
  },

  emitAcceptCall(callId: string, userId: string): void {
    const socket = getSocket();
    socket?.emit('accept_call', { callId, userId });
  },

  emitDeclineCall(callId: string, userId: string): void {
    const socket = getSocket();
    socket?.emit('decline_call', { callId, userId });
  },
};


