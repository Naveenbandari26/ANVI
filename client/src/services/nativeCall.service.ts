import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';
import { callService } from './call.service';

// Check if native module is available
const isCallKeepAvailable = () => {
  try {
    return !!RNCallKeep && typeof RNCallKeep.setup === 'function';
  } catch {
    return false;
  }
};

let isInitialized = false;

/**
 * Initialize CallKeep for native call UI
 * This enables native call screen overlay on both iOS and Android
 */
export const initializeCallKeep = async () => {
  if (!isCallKeepAvailable()) {
    console.log('📱 CallKeep not available - using fallback UI');
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    const options = {
      ios: {
        appName: 'ANVI',
        supportsVideo: false,
        maximumCallGroups: 1,
        maximumCallsPerCallGroup: 1,
      },
      android: {
        alertTitle: 'Permissions required',
        alertDescription: 'This application needs to access your phone accounts',
        cancelButton: 'Cancel',
        okButton: 'OK',
        imageName: 'phone_account_icon',
        additionalPermissions: [],
        // Required for overlay
        selfManaged: false,
        foregroundService: {
          channelId: 'com.anvi.call',
          channelName: 'ANVI Calls',
          notificationTitle: 'ANVI is calling',
          notificationIcon: 'ic_notification',
        },
      },
    };

    await RNCallKeep.setup(options);
    
    // Set available
    await RNCallKeep.setAvailable(true);
    
    isInitialized = true;
    console.log('✅ CallKeep initialized successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to initialize CallKeep:', error);
    return false;
  }
};

/**
 * Display incoming call using native UI
 */
export const displayIncomingCall = async (callId: string, callerName: string = 'ANVI') => {
  if (!isCallKeepAvailable() || !isInitialized) {
    return false;
  }

  try {
    await RNCallKeep.displayIncomingCall(callId, callerName, callerName, 'number', false);
    console.log('📞 Native call UI displayed for call:', callId);
    return true;
  } catch (error) {
    console.error('Error displaying native call:', error);
    return false;
  }
};

/**
 * End call in native UI
 */
export const endCall = async (callId: string) => {
  if (!isCallKeepAvailable()) {
    return false;
  }

  try {
    await RNCallKeep.endCall(callId);
    return true;
  } catch (error) {
    console.error('Error ending native call:', error);
    return false;
  }
};

/**
 * Answer call in native UI
 */
export const answerCall = async (callId: string) => {
  if (!isCallKeepAvailable()) {
    return false;
  }

  try {
    await RNCallKeep.answerIncomingCall(callId);
    return true;
  } catch (error) {
    console.error('Error answering native call:', error);
    return false;
  }
};

/**
 * Reject call in native UI
 */
export const rejectCall = async (callId: string) => {
  if (!isCallKeepAvailable()) {
    return false;
  }

  try {
    await RNCallKeep.rejectCall(callId);
    return true;
  } catch (error) {
    console.error('Error rejecting native call:', error);
    return false;
  }
};

/**
 * Set up event listeners for native call actions
 */
export const setupCallKeepListeners = (callbacks: {
  onAnswerCallAction?: (callId: string) => void;
  onEndCallAction?: (callId: string) => void;
  onRejectCallAction?: (callId: string) => void;
}) => {
  if (!isCallKeepAvailable()) {
    return () => {}; // Return no-op cleanup
  }

  // Answer call event
  RNCallKeep.addEventListener('answerCall', ({ callUUID }: { callUUID: string }) => {
    console.log('📞 Call answered via native UI:', callUUID);
    callbacks.onAnswerCallAction?.(callUUID);
  });

  // End call event
  RNCallKeep.addEventListener('endCall', ({ callUUID }: { callUUID: string }) => {
    console.log('📞 Call ended via native UI:', callUUID);
    callbacks.onEndCallAction?.(callUUID);
  });

  // Reject call event (Android)
  RNCallKeep.addEventListener('rejectCall', ({ callUUID }: { callUUID: string }) => {
    console.log('📞 Call rejected via native UI:', callUUID);
    callbacks.onRejectCallAction?.(callUUID);
  });

  // Return cleanup function
  return () => {
    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.removeEventListener('endCall');
    RNCallKeep.removeEventListener('rejectCall');
  };
};

export const isNativeCallAvailable = isCallKeepAvailable;
