import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Extract IP address from Expo dev server URL (e.g., "192.168.1.42:8081" -> "192.168.1.42")
const getExpoDevServerIP = (): string | null => {
  try {
    // Try to get the host from Expo Constants
    // hostUri is available when running in Expo Go or development build
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      // hostUri format: "192.168.1.42:8081" or "192.168.1.42"
      const ip = hostUri.split(':')[0];
      // Validate it's an IP address (not localhost)
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && !ip.includes('10.0.2.2')) {
        return ip;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
};

// Determine API URL based on platform and environment
const getApiBaseUrl = () => {
  // For web platform, ALWAYS use localhost:5000 (ignore env vars)
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }
  
  // Helper: Check if URL looks like a physical device IP (not localhost/emulator IP)
  const isPhysicalDeviceUrl = (url: string): boolean => {
    return !url.includes('localhost') && 
           !url.includes('127.0.0.1') && 
           !url.includes('10.0.2.2') &&
           (url.includes('http://') || url.includes('https://'));
  };
  
  // Helper: Normalize URL to use port 5000
  const normalizePort = (url: string): string => {
    if (url.includes(':3000')) {
      console.warn('⚠️  EXPO_PUBLIC_API_URL uses port 3000. Converting to port 5000.');
      return url.replace(':3000', ':5000');
    }
    if (!url.includes(':5000') && !url.includes(':3000')) {
      // No port specified, add :5000
      return url.endsWith('/') ? `${url.slice(0, -1)}:5000` : `${url}:5000`;
    }
    return url;
  };
  
  // Try to auto-detect Expo dev server IP (for physical devices on same WiFi)
  const expoIP = getExpoDevServerIP();
  
  // For iOS
  if (Platform.OS === 'ios') {
    // Priority 1: Use auto-detected Expo dev server IP (most reliable - matches Metro bundler)
    if (expoIP) {
      console.log(`📱 Auto-detected Expo dev server IP: ${expoIP} (using this for API calls)`);
      return `http://${expoIP}:5000`;
    }
    // Priority 2: Use env var if set and looks like physical device IP
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && isPhysicalDeviceUrl(envUrl)) {
      console.log(`📱 Using EXPO_PUBLIC_API_URL: ${envUrl}`);
      return normalizePort(envUrl);
    }
    // Priority 3: iOS simulator uses localhost:5000
    return 'http://localhost:5000';
  }
  
  // For Android
  if (Platform.OS === 'android') {
    // Priority 1: Use auto-detected Expo dev server IP (most reliable - matches Metro bundler)
    if (expoIP) {
      console.log(`📱 Auto-detected Expo dev server IP: ${expoIP} (using this for API calls)`);
      return `http://${expoIP}:5000`;
    }
    // Priority 2: Use env var if set and looks like physical device IP
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && isPhysicalDeviceUrl(envUrl)) {
      console.log(`📱 Using EXPO_PUBLIC_API_URL: ${envUrl}`);
      return normalizePort(envUrl);
    }
    // Priority 3: Android emulator uses special IP to access host machine
    return 'http://10.0.2.2:5000';
  }
  
  // Fallback (shouldn't reach here)
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging
console.log('📡 API Configuration:');
console.log('   Platform:', Platform.OS);
console.log('   API Base URL:', API_BASE_URL);
console.log('   Full API URL:', `${API_BASE_URL}/api/v1`);
console.log('   EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL || 'not set');
console.log('   Expo Dev Server IP:', getExpoDevServerIP() || 'not detected');

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45s - sendMessage (Gemini + TTS) can take 20–40s
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token && token.trim()) {
        // Ensure headers object exists
        if (!config.headers) {
          config.headers = {};
        }
        // Set Authorization header (case-sensitive)
        config.headers['Authorization'] = `Bearer ${token.trim()}`;
      } else {
        // No token found - this is normal for public endpoints
        // But for protected endpoints, the server will return 401
      }
    } catch (error) {
      // If we can't get the token, continue without it
      // The server will handle authentication
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Suppress axios errors - only log critical issues
    const shouldLogError = 
      error.code === 'ECONNREFUSED' || 
      error.message === 'Network Error' ||
      (error.response?.status === 401 && (
        error.config?.url?.includes('/auth/') || 
        error.config?.url?.includes('/calls') ||
        error.config?.url?.includes('/conversations')
      ));

    if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
      // Only log network errors once, not for every request
      if (!(global as any).__networkErrorLogged) {
        console.error('❌ Network Error - Cannot connect to backend');
        console.error(`   Base URL: ${API_BASE_URL}`);
        (global as any).__networkErrorLogged = true;
        setTimeout(() => {
          (global as any).__networkErrorLogged = false;
        }, 5000);
      }
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      // Handle 401 errors - clear invalid/expired token
      // This happens when:
      // 1. Token is expired
      // 2. Token was signed with different JWT_SECRET (server restarted)
      // 3. Token is invalid/corrupted
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          // Clear the invalid token - user needs to log in again
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
        }
      } catch (clearError) {
        // If we can't clear, that's okay - token might already be gone
      }
      
      // Don't log 401 errors - they're handled by components
      // The error will be thrown to the component's catch block
    }
    
    // Suppress all other axios errors - they're handled by components
    return Promise.reject(error);
  }
);

export default api;


