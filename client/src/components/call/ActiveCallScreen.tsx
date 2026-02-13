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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { conversationService } from '../../services/conversation.service';
import { callService } from '../../services/call.service';
import { useNativeSTT } from '../../hooks/useNativeSTT';
import {
  initializeTTS,
  speakText,
  stopSpeaking,
  checkTeluguSupport,
  showTeluguInstallPrompt,
  NativeTTSSupport,
} from '../../services/native-tts.service';

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
  const [hasReceivedInitialGreeting, setHasReceivedInitialGreeting] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [endingStep, setEndingStep] = useState<string>('');
  const [ttsSupport, setTtsSupport] = useState<NativeTTSSupport | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const hasReceivedGreetingRef = useRef(false); // Track greeting to avoid re-triggering

  const handleSpeechResult = async (text: string) => {
    // Prevent sending messages until initial greeting is received
    if (!hasReceivedInitialGreeting) {
      console.log('⏳ Waiting for initial greeting before accepting user input');
      return;
    }
    
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

  // Initialize TTS on mount
  useEffect(() => {
    let mounted = true;

    const initTTS = async () => {
      try {
        const support = await initializeTTS();
        if (mounted) {
          setTtsSupport(support);
          
          if (!support.isSupported) {
            console.warn('⚠️ Telugu TTS not available - will use server-side TTS fallback');
            // Optionally show prompt to user (can be disabled if too intrusive)
            // showTeluguInstallPrompt();
          }
        }
      } catch (error) {
        console.error('Error initializing TTS:', error);
        if (mounted) {
          setTtsSupport({ isSupported: false, availableVoices: [] });
        }
      }
    };

    initTTS();

    return () => {
      mounted = false;
    };
  }, []);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      // Stop native TTS
      stopSpeaking().catch(() => {});
      
      // Stop expo-av audio
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }
    };
  }, []);

  // Play TTS: always try native TTS first, then server audio if provided
  const playTTSAudio = async (text: string, audioData?: string, isInitialGreeting: boolean = false) => {
    if (!text?.trim()) return;
    try {
      setIsPlayingTTS(true);
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await stopSpeaking();

      const finishPlaying = () => {
        setIsPlayingTTS(false);
        if (hasReceivedInitialGreeting) startListening();
      };
      const fallbackToServer = () => {
        if (audioData) playServerAudio(text, audioData, isInitialGreeting);
        else setIsPlayingTTS(false);
      };

      try {
        await speakText(text, {
          language: 'te-IN',
          onStart: () => setIsPlayingTTS(true),
          onFinish: finishPlaying,
          onError: () => {
            setIsPlayingTTS(false);
            fallbackToServer();
          },
        });
      } catch (_) {
        if (audioData) {
          console.log('🔊 Using server-side TTS (native unavailable)');
          await playServerAudio(text, audioData, isInitialGreeting);
        } else {
          setIsPlayingTTS(false);
        }
      }
    } catch (error) {
      console.error('Error playing TTS audio:', error);
      setIsPlayingTTS(false);
    }
  };

  // Play server-side audio using expo-av (fallback method)
  const playServerAudio = async (text: string, audioData: string, isInitialGreeting: boolean = false) => {
    try {
      setIsPlayingTTS(true);

      // Use the audio data provided by the server
      const audioUri = `data:audio/wav;base64,${audioData}`;

      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Stop any native TTS that might be playing
      await stopSpeaking();

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

            // Only start listening automatically after greeting is received
            // This ensures user can only respond after hearing the greeting
            if (hasReceivedInitialGreeting) {
              startListening();
            }
          }
        }
      });
    } catch (error) {
      console.error('Error playing server audio:', error);
      setIsPlayingTTS(false);
    }
  };

  useEffect(() => {
    // Listen for AI responses (including initial greeting)
    const handleAIResponse = async (data: { conversationId: string; message: string; audio?: string }) => {
      console.log('📥 Received AI response:', {
        receivedConversationId: data.conversationId,
        currentConversationId: conversationId,
        match: data.conversationId === conversationId,
        message: data.message.substring(0, 50),
        hasAudio: !!data.audio,
      });
      
      // Convert both to strings for comparison (in case one is ObjectId)
      const receivedId = String(data.conversationId);
      const currentId = String(conversationId);
      
      if (receivedId === currentId) {
        console.log('✅ Conversation IDs match, adding message to UI');
        
        // Check if this is the first assistant message (initial greeting)
        const isFirstAssistantMessage = messages.length === 0 || 
          !messages.some(msg => msg.role === 'assistant');
        
        setMessages((prev) => {
          // Check for existing message with same content (for audio updates)
          const existingIndex = prev.findIndex(
            (msg) => msg.role === 'assistant' && msg.content === data.message
          );
          
          if (existingIndex >= 0) {
            // Update existing message (e.g., add audio)
            console.log('🔄 Updating existing message with audio');
            const updated = [...prev];
            // Message already exists, just update if needed
            return prev;
          }
          
          // Avoid duplicate messages
          const isDuplicate = prev.some(
            (msg) => msg.role === 'assistant' && msg.content === data.message
          );
          if (isDuplicate) {
            console.log('⚠️ Duplicate message detected, skipping');
            return prev;
          }
          console.log('✅ Adding new assistant message:', data.message.substring(0, 50));
          return [...prev, { role: 'assistant', content: data.message }];
        });
        setIsProcessing(false);

        // If this is the initial greeting, mark it as received
        if (isFirstAssistantMessage && !hasReceivedGreetingRef.current) {
          console.log('🎉 Initial greeting received! Enabling user input.');
          setHasReceivedInitialGreeting(true);
          hasReceivedGreetingRef.current = true;
        }

        // Always try to play message as voice: native TTS first, then server audio if provided
        await playTTSAudio(data.message, data.audio, isFirstAssistantMessage);
      } else {
        console.log('❌ Conversation ID mismatch - ignoring response');
      }
    };

    // Listen for audio updates for existing messages
    const handleAudioUpdate = async (data: { conversationId: string; message: string; audio: string }) => {
      const receivedId = String(data.conversationId);
      const currentId = String(conversationId);
      
      if (receivedId === currentId) {
        console.log('📥 Received audio update for message:', data.message.substring(0, 50));
        // Play the audio update
        await playTTSAudio(data.message, data.audio, false);
      }
    };

    conversationService.onAIResponse(handleAIResponse);
    conversationService.onAudioUpdate?.(handleAudioUpdate);

    return () => {
      conversationService.offAIResponse(handleAIResponse);
      conversationService.offAudioUpdate?.(handleAudioUpdate);
    };
  }, [conversationId, messages.length]);

  const handleStartRecording = async () => {
    // Prevent starting recording until initial greeting is received
    if (!hasReceivedInitialGreeting) {
      console.log('⏳ Waiting for initial greeting before allowing recording');
      return;
    }

    try {
      // Stop any playing TTS audio before recording
      await stopSpeaking(); // Stop native TTS
      
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

      // Stop native TTS playback if active
      await stopSpeaking().catch(() => { });

      // Stop server audio playback if active
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
        setIsPlayingTTS(false);
      }

      // Show loading modal with progress steps
      setIsEndingCall(true);
      setEndingStep('Finalizing conversation...');

      // Call the end call API - backend will handle the processing
      await callService.endCall(callId);

      // Simulate progress steps (backend does these sequentially)
      // Step 1: Finalizing conversation
      setEndingStep('Finalizing conversation...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 2: Creating diary entry
      setEndingStep('Creating diary entry...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 3: Analyzing tasks
      setEndingStep('Analyzing tasks...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Close modal and call the parent's onEndCall
      setIsEndingCall(false);
      setEndingStep('');
      onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
      // Close modal even on error
      setIsEndingCall(false);
      setEndingStep('');
      // Still call onEndCall to close the screen
      onEndCall();
    }
  };

  const handleManualSubmit = () => {
    // Prevent manual input until initial greeting is received
    if (!hasReceivedInitialGreeting) {
      console.log('⏳ Waiting for initial greeting before accepting manual input');
      return;
    }
    
    if (!manualInput.trim()) return;
    const text = manualInput;
    setManualInput('');
    handleSpeechResult(text);
  };

  const currentStatus = isPlayingTTS
    ? 'ANVI is speaking...'
    : isListening
      ? 'Listening...'
      : isProcessing
        ? 'ANVI is thinking...'
        : !hasReceivedInitialGreeting
          ? 'Connecting...'
          : 'Tap mic to speak';
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content;

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.header}>
        <Text style={styles.name}>ANVI</Text>
        <Text style={styles.status}>Call in progress</Text>
        <View style={styles.callStatusBadge}>
          <View style={[styles.statusDot, (isListening || isPlayingTTS) && styles.statusDotActive]} />
          <Text style={styles.callStatusText}>{currentStatus}</Text>
        </View>
      </View>

      <View style={styles.voiceSection}>
        {isPlayingTTS && (
          <ActivityIndicator size="large" color="#6366f1" style={styles.voiceSpinner} />
        )}
        {lastAssistantMessage && !isPlayingTTS && (
          <Text style={styles.currentPhrase} numberOfLines={3}>{lastAssistantMessage}</Text>
        )}
        {!hasReceivedInitialGreeting && !lastAssistantMessage && (
          <Text style={styles.currentPhrasePlaceholder}>Waiting for ANVI...</Text>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
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

        <View style={styles.manualInputRow}>
          <TextInput
            style={[
              styles.manualInput,
              !hasReceivedInitialGreeting && styles.manualInputDisabled
            ]}
            value={manualInput}
            onChangeText={setManualInput}
            placeholder={hasReceivedInitialGreeting ? "Or type here..." : "Waiting for greeting..."}
            placeholderTextColor="#94a3b8"
            onSubmitEditing={handleManualSubmit}
            returnKeyType="send"
            editable={hasReceivedInitialGreeting}
          />
          <TouchableOpacity
            style={[styles.sendButton, !hasReceivedInitialGreeting && styles.sendButtonDisabled]}
            onPress={handleManualSubmit}
            disabled={!hasReceivedInitialGreeting}
          >
            <Ionicons name="send" size={20} color={hasReceivedInitialGreeting ? "#fff" : "#666"} />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isListening && styles.recordButtonActive,
              !hasReceivedInitialGreeting && styles.recordButtonDisabled,
            ]}
            onPress={isListening ? handleStopRecording : handleStartRecording}
            disabled={isProcessing || !hasReceivedInitialGreeting}
          >
            <Ionicons
              name={isListening ? 'stop' : 'mic'}
              size={36}
              color={hasReceivedInitialGreeting ? "#fff" : "#666"}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <Ionicons name="call" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>

    {/* Call Ending Progress Modal */}
    <Modal
      visible={isEndingCall}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.modalTitle}>Ending Call</Text>
          <Text style={styles.modalStep}>{endingStep}</Text>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  callStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748b',
  },
  statusDotActive: {
    backgroundColor: '#22c55e',
  },
  callStatusText: {
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  voiceSection: {
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  currentPhrase: {
    fontSize: 18,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  currentPhrasePlaceholder: {
    fontSize: 16,
    color: '#64748b',
  },
  voiceSpinner: {
    marginVertical: 8,
  },
  messagesContainer: {
    flex: 1,
    maxHeight: 160,
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
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
    width: '100%',
  },
  manualInput: {
    flex: 1,
    color: '#fff',
    height: 40,
    fontSize: 14,
  },
  manualInputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
  recordButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  endCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  modalStep: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
