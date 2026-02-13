import { useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules } from 'react-native';

function getVoice(): any {
  try {
    return require('@react-native-voice/voice').default;
  } catch {
    return null;
  }
}

function isVoiceNativeModuleAvailable(): boolean {
  try {
    const V = NativeModules.Voice ?? NativeModules.RNVoice;
    return !!(V && typeof V.startSpeech === 'function');
  } catch {
    return false;
  }
}

export const useNativeSTT = (onSpeechResult?: (text: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const [partialResult, setPartialResult] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [voiceReady, setVoiceReady] = useState(false);
    const voiceRef = useRef<any>(null);

    useEffect(() => {
        let Voice: any = null;
        try {
            Voice = getVoice();
            voiceRef.current = Voice;
        } catch (e) {
            console.warn('Voice module not available:', e);
            setError('Native STT not available. Use a Development Build.');
            return;
        }
        if (!Voice) {
            setError('Voice input not available. Use the text field below.');
            return;
        }
        if (!isVoiceNativeModuleAvailable()) {
            setError('Voice input not available on this device. Use the text field below.');
            return;
        }
        try {
            Voice.onSpeechStart = () => setIsListening(true);
            Voice.onSpeechEnd = () => setIsListening(false);
            Voice.onSpeechError = (e: any) => {
                setError(e?.error?.message || 'Speech error');
                setIsListening(false);
            };
            Voice.onSpeechResults = (e: any) => {
                if (e?.value?.length > 0 && onSpeechResult) onSpeechResult(e.value[0]);
            };
            Voice.onSpeechPartialResults = (e: any) => {
                if (e?.value?.length > 0) setPartialResult(e.value[0]);
            };
            setVoiceReady(true);
        } catch (e) {
            console.warn('Voice setup error:', e);
            setError('Voice input not available. Use the text field below.');
            return;
        }
        return () => {
            try {
                Voice?.destroy?.()
                    ?.then(() => Voice?.removeAllListeners?.())
                    ?.catch(() => {});
            } catch (_) {}
        };
    }, [onSpeechResult]);

    const startListening = useCallback(async () => {
        if (!isVoiceNativeModuleAvailable()) {
            setError('Voice input not available on this device. Use the text field below.');
            return;
        }
        const Voice = voiceRef.current || getVoice();
        if (!Voice || !voiceReady) {
            setError('Voice not ready. Use the text field below.');
            return;
        }
        try {
            setError(null);
            setPartialResult('');
            await Voice.start('te-IN');
        } catch (e: any) {
            const msg = e?.message ?? '';
            setError(msg.includes('startSpeech') || msg.includes('null')
                ? 'Voice input not available on this device. Use the text field below.'
                : (msg || 'Failed to start'));
        }
    }, [voiceReady]);

    const stopListening = useCallback(async () => {
        const Voice = voiceRef.current || getVoice();
        if (!Voice) return;
        try {
            await Voice.stop();
        } catch (_) {}
    }, []);

    return {
        isListening,
        partialResult,
        error,
        startListening,
        stopListening,
    };
};
