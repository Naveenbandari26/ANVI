import { useState, useEffect, useCallback } from 'react';
import { NativeModules, Platform } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

export const useNativeSTT = (onSpeechResult?: (text: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const [partialResult, setPartialResult] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Check if the native module exists
    const isVoiceModuleAvailable = !!NativeModules.Voice;

    useEffect(() => {
        if (!isVoiceModuleAvailable) {
            console.warn('Native Voice module is not available in this environment.');
            setError('Native STT module not loaded. Use a Development Build.');
            return;
        }

        Voice.onSpeechStart = () => setIsListening(true);
        Voice.onSpeechEnd = () => setIsListening(false);
        Voice.onSpeechError = (e: SpeechErrorEvent) => {
            console.error('Speech Recognition Error:', e);
            setError(e.error?.message || 'Speech error');
            setIsListening(false);
        };
        Voice.onSpeechResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                const text = e.value[0];
                if (onSpeechResult) {
                    onSpeechResult(text);
                }
            }
        };
        Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                setPartialResult(e.value[0]);
            }
        };

        return () => {
            if (isVoiceModuleAvailable) {
                // Wrap in try-catch and silences promise rejections
                // to prevent crashes during component unmount
                try {
                    Voice.destroy()
                        .then(() => Voice.removeAllListeners())
                        .catch(err => console.log('Voice cleanup silented:', err));
                } catch (e) {
                    console.warn('Voice sync cleanup silented:', e);
                }
            }
        };
    }, [onSpeechResult, isVoiceModuleAvailable]);

    const startListening = useCallback(async () => {
        if (!isVoiceModuleAvailable) {
            setError('STT not available. Use a Development Build.');
            return;
        }
        try {
            setError(null);
            setPartialResult('');
            // te-IN is for Telugu (India)
            await Voice.start('te-IN');
        } catch (e: any) {
            console.error('Failed to start listening:', e);
            setError(e.message);
        }
    }, [isVoiceModuleAvailable]);

    const stopListening = useCallback(async () => {
        if (!isVoiceModuleAvailable) return;
        try {
            await Voice.stop();
        } catch (e: any) {
            // Silently fail to stop if already stopped or module unlinked
            console.log('Stop listening silented:', e);
        }
    }, [isVoiceModuleAvailable]);

    return {
        isListening,
        partialResult,
        error,
        startListening,
        stopListening,
    };
};
