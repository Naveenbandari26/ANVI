import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { callService } from '../services/call.service';
import { initializeSocket, getSocket } from '../config/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addIncomingCallListener } from '../events/incomingCallEvents';
import { cancelCallNotification } from '../services/fullScreenCallNotification';
import {
  displayIncomingCall,
  endCall as endNativeCall,
  answerCall as answerNativeCall,
  rejectCall as rejectNativeCall,
  setupCallKeepListeners,
} from '../services/nativeCall.service';

interface IncomingCall {
  callId: string;
  scheduledTime: string;
}

export const useCallManager = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useNativeOverlay, setUseNativeOverlay] = useState(false);
  /** When true, native overlay was tried but failed - show in-app modal instead */
  const [nativeOverlayFailed, setNativeOverlayFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const removeSocketListener = () => getSocket()?.off('incoming_call');

    const handleIncomingCall = async (data: IncomingCall) => {
      if (!mounted) return;
      setIncomingCall(data);
      setNativeOverlayFailed(false);
      if (useNativeOverlay) {
        const displayed = await displayIncomingCall(data.callId, 'ANVI');
        if (displayed) return;
        setNativeOverlayFailed(true);
      }
    };

    const unsubscribePush = addIncomingCallListener(handleIncomingCall);

    const setupSocket = async () => {
      try {
        await initializeSocket();
        const socket = getSocket();
        if (socket) {
          socket.off('incoming_call');
          socket.on('incoming_call', handleIncomingCall);
        }

        const userId = await AsyncStorage.getItem('userId');
        if (userId && socket?.connected) {
          socket?.emit('join_user_room', userId);
        }
        if (!userId) return;

        const ringingCalls = await callService.getUserCalls('ringing');
        if (mounted && ringingCalls.length > 0) {
          const latestCall = ringingCalls[0];
          const scheduledDate = new Date(latestCall.scheduledTime);
          const now = new Date();
          const ageInMinutes = (now.getTime() - scheduledDate.getTime()) / 60000;
          if (ageInMinutes < 2) {
            const callData = { callId: latestCall._id, scheduledTime: latestCall.scheduledTime };
            setIncomingCall(callData);
            if (useNativeOverlay) {
              const displayed = await displayIncomingCall(callData.callId, 'ANVI');
              if (!displayed && mounted) setNativeOverlayFailed(true);
            }
          }
        }
      } catch (error) {
        console.error('Error setting up socket and initial call check:', error);
      }
    };

    setupSocket();
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') setupSocket();
    });

    return () => {
      mounted = false;
      appStateSub.remove();
      removeSocketListener();
      unsubscribePush();
    };
  }, [useNativeOverlay]);

  const acceptCall = useCallback(async (callId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (useNativeOverlay) {
        await answerNativeCall(callId);
      }

      const result = await callService.acceptCall(callId);
      const conversationId = result?.conversation?._id != null
        ? String(result.conversation._id)
        : (result?.call as any)?.conversationId != null
          ? String((result.call as any).conversationId)
          : null;

      if (!conversationId) {
        console.error('Accept call: missing conversation id', result);
        setIsProcessing(false);
        return;
      }

      setIncomingCall(null);
      setActiveCall(callId);
      setActiveConversation(conversationId);
      cancelCallNotification(callId).catch(() => {});

      const socket = getSocket();
      const userId = await AsyncStorage.getItem('userId');
      if (socket && userId) {
        socket.emit('accept_call', { callId, userId });
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, useNativeOverlay]);

  const declineCall = useCallback(async (callId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Reject in native UI if available
      if (useNativeOverlay) {
        await rejectNativeCall(callId);
      }

      await callService.declineCall(callId);
      setIncomingCall(null);
      cancelCallNotification(callId).catch(() => {});

      const socket = getSocket();
      const userId = await AsyncStorage.getItem('userId');
      if (socket && userId) {
        socket.emit('decline_call', { callId, userId });
      }
    } catch (error) {
      console.error('Error declining call:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, useNativeOverlay]);

  const endCall = useCallback(async (callId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // End in native UI if available
      if (useNativeOverlay) {
        await endNativeCall(callId);
      }

      await callService.endCall(callId);
      setActiveCall(null);
      setActiveConversation(null);
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, useNativeOverlay]);

  // Native CallKeep disabled to prevent startup crash (native module can conflict).
  // In-app full-screen modal is used for all incoming calls.
  // To re-enable native overlay later: uncomment the useEffect below and ensure newArchEnabled: false.
  /*
  useEffect(() => {
    const initNativeCalls = async () => {
      const initialized = await initializeCallKeep();
      setUseNativeOverlay(initialized);
      if (initialized) {
        const cleanup = setupCallKeepListeners({
          onAnswerCallAction: async (callId: string) => { await acceptCall(callId); },
          onEndCallAction: async (callId: string) => {
            if (activeCall === callId) await endCall(callId);
            else await declineCall(callId);
          },
          onRejectCallAction: async (callId: string) => { await declineCall(callId); },
        });
        return cleanup;
      }
    };
    const cleanupPromise = initNativeCalls();
    return () => { cleanupPromise.then(cleanup => cleanup && cleanup()); };
  }, [acceptCall, declineCall, endCall, activeCall]);
  */

  return {
    incomingCall,
    activeCall,
    activeConversation,
    acceptCall,
    declineCall,
    endCall,
    useNativeOverlay,
    nativeOverlayFailed,
  };
};
