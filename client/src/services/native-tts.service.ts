import { Platform, Alert } from 'react-native';

export interface NativeTTSVoice {
  id: string;
  name: string;
  language: string;
  quality: number;
  latency: number;
  networkConnectionRequired: boolean;
  notInstalled: boolean;
}

export interface NativeTTSSupport {
  isSupported: boolean;
  teluguVoice?: NativeTTSVoice;
  availableVoices: NativeTTSVoice[];
}

function getTts(): any {
  try {
    return require('react-native-tts').default;
  } catch {
    return null;
  }
}

/**
 * Initialize TTS and check for Telugu support
 */
export async function initializeTTS(): Promise<NativeTTSSupport> {
  try {
    const Tts = getTts();
    if (!Tts) return { isSupported: false, availableVoices: [] };
    const voices = await Tts.voices();
    
    // Find Telugu voice (te-IN is the BCP-47 code for Telugu)
    const teluguVoice = voices.find((v: NativeTTSVoice) => 
      v.language === 'te-IN' || 
      v.language.startsWith('te-') ||
      v.language === 'te'
    );

    const support: NativeTTSSupport = {
      isSupported: !!teluguVoice,
      teluguVoice: teluguVoice,
      availableVoices: voices,
    };

    if (teluguVoice) {
      // Set Telugu as default language
      try {
        await Tts.setDefaultLanguage('te-IN');
        console.log('✅ Telugu TTS is available and set as default');
      } catch (error) {
        // Try alternative language codes
        try {
          await Tts.setDefaultLanguage('te');
          console.log('✅ Telugu TTS is available (using te language code)');
        } catch (e) {
          console.warn('⚠️ Could not set Telugu as default, but voice exists');
        }
      }
    } else {
      console.warn('⚠️ Telugu TTS voice not found on this device');
      
      // On Android, prompt user to install Telugu language pack
      if (Platform.OS === 'android') {
        try {
          // Request installation of Telugu data
          await Tts.requestInstallData();
          console.log('📥 Requested Telugu language pack installation');
        } catch (error) {
          console.error('Error requesting language pack installation:', error);
        }
      }
    }

    // Configure TTS settings
    Tts.setDefaultRate(0.5); // Normal speech rate
    Tts.setDefaultPitch(1.0); // Normal pitch

    return support;
  } catch (error) {
    console.error('Error initializing TTS:', error);
    return {
      isSupported: false,
      availableVoices: [],
    };
  }
}

/**
 * Check if Telugu TTS is available on the device
 */
export async function checkTeluguSupport(): Promise<boolean> {
  try {
    const Tts = getTts();
    if (!Tts) return false;
    const voices = await Tts.voices();
    const hasTelugu = voices.some((v: NativeTTSVoice) => 
      v.language === 'te-IN' || 
      v.language.startsWith('te-') ||
      v.language === 'te'
    );
    return hasTelugu;
  } catch (error) {
    console.error('Error checking Telugu support:', error);
    return false;
  }
}

/**
 * Speak text using native TTS
 * Falls back to server-side TTS if Telugu is not available
 */
export async function speakText(
  text: string,
  options?: {
    language?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onFinish?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const Tts = getTts();
      if (!Tts) {
        options?.onError?.(new Error('TTS not available'));
        reject(new Error('TTS not available'));
        return;
      }
      const hasTelugu = await checkTeluguSupport();
      if (!hasTelugu && options?.language === 'te-IN') {
        const error = new Error('Telugu TTS not available on this device');
        options?.onError?.(error);
        reject(error);
        return;
      }

      const finishListener = Tts.addEventListener('tts-finish', () => {
        Tts.removeEventListener('tts-finish', finishListener);
        options?.onFinish?.();
        resolve();
      });
      const errorListener = Tts.addEventListener('tts-error', (error: any) => {
        Tts.removeEventListener('tts-error', errorListener);
        Tts.removeEventListener('tts-finish', finishListener);
        const err = new Error(error?.errorMessage || 'TTS error occurred');
        options?.onError?.(err);
        reject(err);
      });
      const startListener = Tts.addEventListener('tts-start', () => {
        Tts.removeEventListener('tts-start', startListener);
        options?.onStart?.();
      });
      if (options?.rate !== undefined) Tts.setDefaultRate(options.rate);
      if (options?.pitch !== undefined) Tts.setDefaultPitch(options.pitch);
      if (options?.language) await Tts.setDefaultLanguage(options.language);
      await Tts.speak(text);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onError?.(err);
      reject(err);
    }
  });
}

/**
 * Stop current TTS playback
 */
export async function stopSpeaking(): Promise<void> {
  try {
    const Tts = getTts();
    if (Tts) await Tts.stop();
  } catch (error) {
    console.error('Error stopping TTS:', error);
  }
}

/**
 * Get available voices for a specific language
 */
export async function getVoicesForLanguage(languageCode: string): Promise<NativeTTSVoice[]> {
  try {
    const Tts = getTts();
    if (!Tts) return [];
    const voices = await Tts.voices();
    return voices.filter((v: NativeTTSVoice) => 
      v.language === languageCode || 
      v.language.startsWith(languageCode + '-')
    );
  } catch (error) {
    console.error('Error getting voices:', error);
    return [];
  }
}

/**
 * Show alert to user about missing Telugu support
 */
export function showTeluguInstallPrompt(): void {
  const Tts = getTts();
  if (Platform.OS === 'android' && Tts) {
    Alert.alert(
      'Telugu Voice Not Available',
      'To use Telugu text-to-speech, please install the Telugu language pack:\n\n' +
      '1. Go to Settings > Language & Input\n' +
      '2. Select Text-to-Speech output\n' +
      '3. Install Telugu (te-IN) language pack\n\n' +
      'The app will use server-side TTS until Telugu is installed.',
      [
        { text: 'OK', style: 'default' as const },
        {
          text: 'Open Settings',
          onPress: async () => {
            try {
              await Tts.requestInstallData();
            } catch (error) {
              console.error('Error opening language settings:', error);
            }
          },
        },
      ]
    );
  } else if (Platform.OS !== 'android') {
    Alert.alert(
      'Telugu Voice Not Available',
      'Telugu text-to-speech may not be available on this iOS device. ' +
      'The app will use server-side TTS as a fallback.',
      [{ text: 'OK' }]
    );
  }
}
