import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Extract IP address from Expo dev server URL (e.g., "192.168.1.42:8081" -> "192.168.1.42")
const getExpoDevServerIP = (): string | null => {
  try {
    // In production builds, Constants.expoConfig might be undefined
    if (!Constants || !Constants.expoConfig) {
      return null;
    }
    const hostUri = Constants.expoConfig.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !ip.includes('10.0.2.2')) {
        return ip;
      }
    }
  } catch (error) {
    // Ignore errors - this is expected in production builds
    console.log('Could not get Expo dev server IP (normal in production):', error);
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
  
  // Priority 1: Use socket URL from Constants.expoConfig.extra (works in production)
  // or process.env (works in development)
  try {
    let socketUrl: string | undefined;
    
    // Try Constants.expoConfig.extra first (for production builds)
    if (Constants?.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL) {
      socketUrl = Constants.expoConfig.extra.EXPO_PUBLIC_SOCKET_URL;
    }
    // Fall back to process.env (for development)
    else if (process.env?.EXPO_PUBLIC_SOCKET_URL) {
      socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    }
    
    if (socketUrl && typeof socketUrl === 'string' && socketUrl.trim()) {
      console.log(`🔌 Using EXPO_PUBLIC_SOCKET_URL: ${socketUrl}`);
      return normalizeUrl(socketUrl.trim());
    }
  } catch (error) {
    console.warn('Error reading EXPO_PUBLIC_SOCKET_URL:', error);
  }
  
  // Priority 2: Fall back to API URL environment variable if set
  try {
    let apiUrl: string | undefined;
    
    // Try Constants.expoConfig.extra first (for production builds)
    if (Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL) {
      apiUrl = Constants.expoConfig.extra.EXPO_PUBLIC_API_URL;
    }
    // Fall back to process.env (for development)
    else if (process.env?.EXPO_PUBLIC_API_URL) {
      apiUrl = process.env.EXPO_PUBLIC_API_URL;
    }
    
    if (apiUrl && typeof apiUrl === 'string' && apiUrl.trim()) {
      console.log(`🔌 Using EXPO_PUBLIC_API_URL for socket: ${apiUrl}`);
      return normalizeUrl(apiUrl.trim());
    }
  } catch (error) {
    console.warn('Error reading EXPO_PUBLIC_API_URL:', error);
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
    // Android emulator uses special IP (only works in emulator, not on real device)
    // For production builds on real devices, this will fail - use environment variables instead
    return 'http://10.0.2.2:5000';
  }
  
  // Fallback
  return 'http://localhost:5000';
};

// Safely get socket URL with error handling
let SOCKET_URL: string;
try {
  SOCKET_URL = getSocketUrl();
} catch (error) {
  console.error('Error determining socket URL:', error);
  // Fallback to production URL if available, otherwise use a safe default
  SOCKET_URL = 'https://server-production-b9b1.up.railway.app';
}

// Debug logging (only in development)
if (__DEV__) {
  console.log('🔌 Socket Configuration:');
  console.log('   Platform:', Platform.OS);
  console.log('   Socket URL:', SOCKET_URL);
  try {
    console.log('   EXPO_PUBLIC_SOCKET_URL:', process.env?.EXPO_PUBLIC_SOCKET_URL || 'not set');
  } catch (e) {
    console.log('   EXPO_PUBLIC_SOCKET_URL: not accessible');
  }
  console.log('   Expo Dev Server IP:', getExpoDevServerIP() || 'not detected');
}

let socket: Socket | null = null;

export const initializeSocket = async (): Promise<Socket> => {
  if (socket?.connected) {
    return socket;
  }

  try {
    let token: string | null = null;
    let userId: string | null = null;

    try {
      token = await AsyncStorage.getItem('authToken');
      userId = await AsyncStorage.getItem('userId');
    } catch (storageError) {
      console.warn('Error reading from AsyncStorage (continuing without auth):', storageError);
      // Continue without token - socket will still connect, just won't be authenticated
    }

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token: token || undefined,
      },
      // Add timeout and retry options for production
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', async () => {
      console.log('🔌 Connected to server');
      try {
        const currentUserId = await AsyncStorage.getItem('userId');
        if (currentUserId) {
          socket?.emit('join_user_room', currentUserId);
        }
      } catch (error) {
        console.warn('Error joining user room:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Don't throw - let the app continue even if socket fails
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    // Return a dummy socket object to prevent crashes
    // The app can continue without socket functionality
    throw error;
  }
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


