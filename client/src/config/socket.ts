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
  // Helper: Normalize URL - only add port for HTTP localhost/dev URLs
  const normalizeUrl = (url: string): string => {
    // Remove trailing slash
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // For HTTPS URLs or production URLs, don't modify port
    if (cleanUrl.includes('https://')) {
      return cleanUrl;
    }
    
    // For HTTP URLs, handle port normalization
    if (cleanUrl.includes(':3000')) {
      return cleanUrl.replace(':3000', ':5000');
    }
    
    // Only add :5000 for HTTP URLs without a port (dev/localhost scenarios)
    if (cleanUrl.startsWith('http://') && !cleanUrl.match(/:\d+/)) {
      return `${cleanUrl}:5000`;
    }
    
    return cleanUrl;
  };
  
  // Priority 1: Use socket URL environment variable if set
  const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (socketUrl && socketUrl.trim()) {
    console.log(`🔌 Using EXPO_PUBLIC_SOCKET_URL: ${socketUrl}`);
    return normalizeUrl(socketUrl.trim());
  }
  
  // Priority 2: Fall back to API URL environment variable if set
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl && apiUrl.trim()) {
    console.log(`🔌 Using EXPO_PUBLIC_API_URL for socket: ${apiUrl}`);
    return normalizeUrl(apiUrl.trim());
  }
  
  // Priority 3: For development - try to auto-detect Expo dev server IP
  const expoIP = getExpoDevServerIP();
  
  // For web platform
  if (Platform.OS === 'web') {
    // If no env var, use localhost for web development
    return 'http://localhost:5000';
  }
  
  // For iOS
  if (Platform.OS === 'ios') {
    // Use auto-detected Expo dev server IP if available
    if (expoIP) {
      return `http://${expoIP}:5000`;
    }
    // iOS simulator uses localhost
    return 'http://localhost:5000';
  }
  
  // For Android
  if (Platform.OS === 'android') {
    // Use auto-detected Expo dev server IP if available
    if (expoIP) {
      return `http://${expoIP}:5000`;
    }
    // Android emulator uses special IP
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


