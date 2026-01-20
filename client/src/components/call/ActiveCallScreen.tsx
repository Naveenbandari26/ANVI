import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { conversationService } from '../../services/conversation.service';
import { callService } from '../../services/call.service';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { generateTTS } from '../../services/tts.service';

interface ActiveCallScreenProps {
  callId: string;
  conversationId: string;
  onEndCall: () => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  callId,
  conversationId,
  onEndCall,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const { startRecording, stopRecording, getTranscript } = useAudioRecorder();

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  // Play TTS audio
  const playTTSAudio = async (text: string) => {
    try {
      setIsPlayingTTS(true);

      // Generate TTS audio
      const audioBase64 = await generateTTS({
        text: text,
        speaker: 'lalitha', // Use Lalitha voice for Telugu
      });

      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Create and play audio from base64
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,${audioBase64}` },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      // Handle playback completion
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlayingTTS(false);
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        }
      });
    } catch (error) {
      console.error('Error playing TTS audio:', error);
      setIsPlayingTTS(false);
      // Continue even if TTS fails - user can still read the message
    }
  };

  useEffect(() => {
    // Listen for AI responses (including initial greeting)
    const handleAIResponse = async (data: { conversationId: string; message: string }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => {
          // Avoid duplicate messages
          const isDuplicate = prev.some(
            (msg) => msg.role === 'assistant' && msg.content === data.message
          );
          if (isDuplicate) return prev;
          return [...prev, { role: 'assistant', content: data.message }];
        });
        setIsProcessing(false);
        
        // Play AI response as Telugu TTS audio
        await playTTSAudio(data.message);
      }
    };

    conversationService.onAIResponse(handleAIResponse);

    return () => {
      conversationService.offAIResponse(handleAIResponse);
    };
  }, [conversationId]);

  const handleStartRecording = async () => {
    try {
      // Stop any playing TTS audio before recording
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlayingTTS(false);
      }
      
      await startRecording();
      setIsRecording(true);
    } catch (error) {
      // Error handled silently - recording may not be available
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      const audioUri = await stopRecording();
      const userTranscript = await getTranscript(audioUri);
      
      if (userTranscript) {
        // Update local transcript
        setTranscript((prev) => prev + userTranscript + ' ');
        setMessages((prev) => [...prev, { role: 'user', content: userTranscript }]);
        
        // Send to backend
        await conversationService.processTranscript(conversationId, userTranscript);
        await conversationService.sendMessage(conversationId, userTranscript);
      }
      
      setIsProcessing(false);
      
      // Switch audio mode back to allow playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (error) {
      // Error handled silently
      setIsProcessing(false);
    }
  };

  const handleEndCall = async () => {
    try {
      // Stop recording if active
      if (isRecording) {
        await stopRecording();
      }
      
      // Stop TTS playback if active
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlayingTTS(false);
      }
      
      await callService.endCall(callId);
      onEndCall();
    } catch (error) {
      // Error handled by axios interceptor - call ended anyway
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>ANVI</Text>
        <Text style={styles.status}>Call in progress</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.message,
              msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <Text style={styles.messageText}>{msg.content}</Text>
          </View>
        ))}
        {isProcessing && (
          <View style={[styles.message, styles.assistantMessage]}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.messageText}>ANVI is thinking...</Text>
          </View>
        )}
        {isPlayingTTS && (
          <View style={[styles.message, styles.assistantMessage]}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.messageText}>Playing audio...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
          ]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isProcessing}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#94a3b8',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
  endCallButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


