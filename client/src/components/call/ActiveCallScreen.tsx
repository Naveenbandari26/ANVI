import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { conversationService } from '../../services/conversation.service';
import { callService } from '../../services/call.service';
import { useNativeSTT } from '../../hooks/useNativeSTT';
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
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const handleSpeechResult = async (text: string) => {
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      // Send message to backend and get AI response
      await conversationService.sendMessage(conversationId, text);
    } catch (error) {
      console.error('Error sending speech result:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const { isListening, partialResult, error: sttError, startListening, stopListening } = useNativeSTT(handleSpeechResult);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }
    };
  }, []);

  // Play TTS audio
  const playTTSAudio = async (text: string, audioData?: string) => {
    try {
      setIsPlayingTTS(true);

      let audioUri: string;

      if (audioData) {
        // Use the audio data provided by the server
        audioUri = `data:audio/wav;base64,${audioData}`;
      } else {
        // Fallback: Generate TTS audio locally if not provided by server
        const audioBase64 = await generateTTS({
          text: text,
          speaker: 'lalitha',
        });
        audioUri = `data:audio/wav;base64,${audioBase64}`;
      }

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

      // Create and play audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      // Handle playback completion
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlayingTTS(false);
            sound.unloadAsync().catch(() => { });
            soundRef.current = null;

            // AUTOMATICALLY start listening after AI finishes speaking
            startListening();
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
    const handleAIResponse = async (data: { conversationId: string; message: string; audio?: string }) => {
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

        // Play AI response as Telugu TTS audio (prioritizing server-provided audio)
        await playTTSAudio(data.message, data.audio);
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

      await startListening();
    } catch (error) {
      console.error('Error starting native STT:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopListening();
    } catch (error) {
      console.error('Error stopping native STT:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      // Stop listening if active
      if (isListening) {
        await stopListening().catch(() => { });
      }

      // Stop TTS playback if active
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
        setIsPlayingTTS(false);
      }

      await onEndCall();
    } catch (error) {
      // Handle or ignore cleanup errors
      onEndCall();
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    const text = manualInput;
    setManualInput('');
    handleSpeechResult(text);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        {sttError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{sttError}</Text>
          </View>
        ) : partialResult ? (
          <View style={styles.partialResultContainer}>
            <Text style={styles.partialResultText}>{partialResult}</Text>
          </View>
        ) : null}

        {sttError ? (
          <View style={styles.manualInputContainer}>
            <TextInput
              style={styles.manualInput}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Type in Telugu to test..."
              placeholderTextColor="#94a3b8"
              onSubmitEditing={handleManualSubmit}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleManualSubmit}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isListening && styles.recordButtonActive,
            ]}
            onPress={isListening ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
          >
            <Ionicons
              name={isListening ? 'stop' : 'mic'}
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
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'column', // Stack partial result and buttons
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  partialResultContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  partialResultText: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 10,
    width: '100%',
  },
  manualInput: {
    flex: 1,
    color: '#fff',
    height: 40,
    fontSize: 14,
  },
  sendButton: {
    padding: 8,
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


