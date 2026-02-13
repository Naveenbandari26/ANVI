import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { disconnectSocket, initializeSocket } from '../config/socket';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    accessToken: string;
    refreshToken?: string;
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const { accessToken, user } = response.data.data;
    
    await AsyncStorage.setItem('authToken', accessToken);
    await AsyncStorage.setItem('userId', user.id);
    disconnectSocket();
    initializeSocket().catch(() => {});
    return response.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    const { accessToken, user } = response.data.data;
    
    await AsyncStorage.setItem('authToken', accessToken);
    await AsyncStorage.setItem('userId', user.id);
    disconnectSocket();
    initializeSocket().catch(() => {});
    return response.data;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userId');
  },

  async getStoredToken(): Promise<string | null> {
    return AsyncStorage.getItem('authToken');
  },

  async getStoredUserId(): Promise<string | null> {
    return AsyncStorage.getItem('userId');
  },
};

