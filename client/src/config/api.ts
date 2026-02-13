import axios from 'axios';
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
    // Try to get the host from Expo Constants
    // hostUri is available when running in Expo Go or development build
    const hostUri = Constants.expoConfig.hostUri;
    if (hostUri) {
      // hostUri format: "192.168.1.42:8081" or "192.168.1.42"
      const ip = hostUri.split(':')[0];
      // Validate it's an IP address (not localhost)
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

// Determine API URL based on platform and environment
const getApiBaseUrl = () => {
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
      console.warn('⚠️  EXPO_PUBLIC_API_URL uses port 3000. Converting to port 5000.');
      return cleanUrl.replace(':3000', ':5000');
    }
    
    // Only add :5000 for HTTP URLs without a port (dev/localhost scenarios)
    if (cleanUrl.startsWith('http://') && !cleanUrl.match(/:\d+/)) {
      return `${cleanUrl}:5000`;
    }
    
    return cleanUrl;
  };
  
  // Priority 1: Use environment variable from Constants.expoConfig.extra (works in production)
  // or process.env (works in development)
  try {
    let envUrl: string | undefined;
    
    // Try Constants.expoConfig.extra first (for production builds)
    if (Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL) {
      envUrl = Constants.expoConfig.extra.EXPO_PUBLIC_API_URL;
    }
    // Fall back to process.env (for development)
    else if (process.env?.EXPO_PUBLIC_API_URL) {
      envUrl = process.env.EXPO_PUBLIC_API_URL;
    }
    
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      console.log(`📡 Using EXPO_PUBLIC_API_URL: ${envUrl}`);
      return normalizeUrl(envUrl.trim());
    }
  } catch (error) {
    console.warn('Error reading EXPO_PUBLIC_API_URL:', error);
  }
  
  // Priority 2: For development - try to auto-detect Expo dev server IP
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
      console.log(`📱 Auto-detected Expo dev server IP: ${expoIP} (using this for API calls)`);
      return `http://${expoIP}:5000`;
    }
    // iOS simulator uses localhost:5000
    return 'http://localhost:5000';
  }
  
  // For Android
  if (Platform.OS === 'android') {
    // Use auto-detected Expo dev server IP if available
    if (expoIP) {
      console.log(`📱 Auto-detected Expo dev server IP: ${expoIP} (using this for API calls)`);
      return `http://${expoIP}:5000`;
    }
    // Android emulator uses special IP to access host machine
    // For production builds on real devices, this will fail - use environment variables instead
    return 'http://10.0.2.2:5000';
  }
  
  // Fallback
  return 'http://localhost:5000';
};

// Safely get API base URL with error handling
let API_BASE_URL: string;
try {
  API_BASE_URL = getApiBaseUrl();
} catch (error) {
  console.error('Error determining API base URL:', error);
  // Fallback to production URL if available, otherwise use a safe default
  API_BASE_URL = 'https://server-production-b9b1.up.railway.app';
}

// Debug logging (only in development)
if (__DEV__) {
  console.log('📡 API Configuration:');
  console.log('   Platform:', Platform.OS);
  console.log('   API Base URL:', API_BASE_URL);
  console.log('   Full API URL:', `${API_BASE_URL}/api/v1`);
  try {
    console.log('   EXPO_PUBLIC_API_URL:', process.env?.EXPO_PUBLIC_API_URL || 'not set');
  } catch (e) {
    console.log('   EXPO_PUBLIC_API_URL: not accessible');
  }
  console.log('   Expo Dev Server IP:', getExpoDevServerIP() || 'not detected');
}

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
        // Set Authorization header (case-sensitive)
        if (!config.headers) {
          config.headers = {} as any;
        }
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


