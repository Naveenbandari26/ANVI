import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Note: In a production app, you would integrate with a full speech-to-text service
import api from '../config/api';

export const useAudioRecorder = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  };

  const stopRecording = async (): Promise<string> => {
    if (!recording) {
      throw new Error('No recording in progress');
    }

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('No recording URI');
      }

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  };

  const getTranscript = async (audioUri: string): Promise<string | null> => {
    try {
      // Send audio file to backend for Vosk transcription
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);

      const response = await api.post('/stt/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data?.transcription || null;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return null;
    }
  };

  return {
    startRecording,
    stopRecording,
    getTranscript,
    isRecording,
  };
};

