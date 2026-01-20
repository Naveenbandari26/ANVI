import { useState, useEffect, useCallback } from 'react';
import { callService } from '../services/call.service';
import { initializeSocket, getSocket } from '../config/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface IncomingCall {
  callId: string;
  scheduledTime: string;
}

export const useCallManager = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      try {
        await initializeSocket();
        const userId = await AsyncStorage.getItem('userId');
        
        if (!userId) return;

        const handleIncomingCall = (data: IncomingCall) => {
          if (mounted) {
            setIncomingCall(data);
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
        console.error('Error setting up socket:', error);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, []);

  const acceptCall = useCallback(async (callId: string) => {
    try {
      const result = await callService.acceptCall(callId);
      setActiveCall(callId);
      setActiveConversation(result.conversation._id);
      setIncomingCall(null);
      
      // Join call room to receive messages
      const socket = getSocket();
      if (socket) {
        socket.emit('join_call_room', callId);
      }
    } catch (error) {
      // Error handled by axios interceptor
      throw error;
    }
  }, []);

  const declineCall = useCallback(async (callId: string) => {
    try {
      await callService.declineCall(callId);
      setIncomingCall(null);
    } catch (error) {
      // Error handled by axios interceptor
      throw error;
    }
  }, []);

  const endCall = useCallback(async (callId: string) => {
    try {
      await callService.endCall(callId);
      setActiveCall(null);
      setActiveConversation(null);
    } catch (error) {
      // Error handled by axios interceptor
      throw error;
    }
  }, []);

  return {
    incomingCall,
    activeCall,
    activeConversation,
    acceptCall,
    declineCall,
    endCall,
  };
};


