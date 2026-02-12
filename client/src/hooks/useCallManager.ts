import { useState, useEffect, useCallback } from 'react';
import { callService } from '../services/call.service';
import { initializeSocket, getSocket } from '../config/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleIncomingCallNotification } from './usePushNotifications';

interface IncomingCall {
  callId: string;
  scheduledTime: string;
}

export const useCallManager = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      try {
        await initializeSocket();
        const userId = await AsyncStorage.getItem('userId');

        if (!userId) return;

        // Check for any currently ringing calls for this user
        const ringingCalls = await callService.getUserCalls('ringing');
        if (mounted && ringingCalls.length > 0) {
          // Only show calls that are very recent (less than 2 minutes old)
          const latestCall = ringingCalls[0];
          const scheduledDate = new Date(latestCall.scheduledTime);
          const now = new Date();
          const AgeInMinutes = (now.getTime() - scheduledDate.getTime()) / 60000;

          if (AgeInMinutes < 2) {
            setIncomingCall({
              callId: latestCall._id,
              scheduledTime: latestCall.scheduledTime,
            });
          }
        }

        const handleIncomingCall = (data: IncomingCall) => {
          if (mounted) {
            setIncomingCall(data);
            scheduleIncomingCallNotification(data.callId);
          }
        };

        const socket = getSocket();
        if (socket) {
          socket.on('incoming_call', handleIncomingCall);
        }

        return () => {
          if (socket) {
            socket.off('incoming_call', handleIncomingCall);
          }
        };
      } catch (error) {
        console.error('Error setting up socket and initial call check:', error);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, []);

  const acceptCall = useCallback(async (callId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await callService.acceptCall(callId);
      setActiveCall(callId);
      setActiveConversation(result.conversation._id);
      setIncomingCall(null);

      // Notify server and join call room
      const socket = getSocket();
      const userId = await AsyncStorage.getItem('userId');
      if (socket && userId) {
        socket.emit('accept_call', { callId, userId });
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const declineCall = useCallback(async (callId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await callService.declineCall(callId);
      setIncomingCall(null);

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
  }, [isProcessing]);

  const endCall = useCallback(async (callId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await callService.endCall(callId);
      setActiveCall(null);
      setActiveConversation(null);
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  return {
    incomingCall,
    activeCall,
    activeConversation,
    acceptCall,
    declineCall,
    endCall,
  };
};
