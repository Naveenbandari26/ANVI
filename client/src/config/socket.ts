import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Extract IP address from Expo dev server URL (e.g., "192.168.1.42:8081" -> "192.168.1.42")
const getExpoDevServerIP = (): string | null => {
  try {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !ip.includes('10.0.2.2')) {
        return ip;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
};

// Determine Socket URL based on platform and environment
// Socket URL should match API URL (same server, same port)
const getSocketUrl = () => {
  // For web platform, ALWAYS use localhost:5000 (ignore env vars)
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }
  
  // Helper: Check if URL looks like a physical device IP
  const isPhysicalDeviceUrl = (url: string): boolean => {
    return !url.includes('localhost') && 
           !url.includes('127.0.0.1') && 
           !url.includes('10.0.2.2') &&
           (url.includes('http://') || url.includes('https://'));
  };
  
  // Helper: Normalize URL to use port 5000
  const normalizePort = (url: string): string => {
    if (url.includes(':3000')) {
      return url.replace(':3000', ':5000');
    }
    if (!url.includes(':5000') && !url.includes(':3000')) {
      return url.endsWith('/') ? `${url.slice(0, -1)}:5000` : `${url}:5000`;
    }
    return url;
  };
  
  // Try to auto-detect Expo dev server IP
  const expoIP = getExpoDevServerIP();
  
  // For iOS
  if (Platform.OS === 'ios') {
    // Priority 1: Use auto-detected Expo dev server IP (most reliable)
    if (expoIP) {
      return `http://${expoIP}:5000`;
    }
    // Priority 2: Use socket URL env var
    const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (socketUrl && isPhysicalDeviceUrl(socketUrl)) {
      return normalizePort(socketUrl);
    }
    // Priority 3: Use API URL env var
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (apiUrl && isPhysicalDeviceUrl(apiUrl)) {
      return normalizePort(apiUrl);
    }
    // Priority 4: iOS simulator uses localhost
    return 'http://localhost:5000';
  }
  
  // For Android
  if (Platform.OS === 'android') {
    // Priority 1: Use auto-detected Expo dev server IP (most reliable)
    if (expoIP) {
      return `http://${expoIP}:5000`;
    }
    // Priority 2: Use socket URL env var
    const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (socketUrl && isPhysicalDeviceUrl(socketUrl)) {
      return normalizePort(socketUrl);
    }
    // Priority 3: Use API URL env var
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (apiUrl && isPhysicalDeviceUrl(apiUrl)) {
      return normalizePort(apiUrl);
    }
    // Priority 4: Android emulator uses special IP
    return 'http://10.0.2.2:5000';
  }
  
  // Fallback
  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

// Debug logging
console.log('🔌 Socket Configuration:');
console.log('   Platform:', Platform.OS);
console.log('   Socket URL:', SOCKET_URL);
console.log('   EXPO_PUBLIC_SOCKET_URL:', process.env.EXPO_PUBLIC_SOCKET_URL || 'not set');
console.log('   Expo Dev Server IP:', getExpoDevServerIP() || 'not detected');

let socket: Socket | null = null;

export const initializeSocket = async (): Promise<Socket> => {
  if (socket?.connected) {
    return socket;
  }

  const token = await AsyncStorage.getItem('authToken');
  const userId = await AsyncStorage.getItem('userId');

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: {
      token,
    },
  });

  socket.on('connect', () => {
    console.log('🔌 Connected to server');
    if (userId) {
      socket?.emit('join_user_room', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};


