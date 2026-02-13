declare module 'react-native-tts' {
  export interface Voice {
    id: string;
    name: string;
    language: string;
    quality: number;
    latency: number;
    networkConnectionRequired: boolean;
    notInstalled: boolean;
  }

  export interface TtsEvents {
    'tts-start': () => void;
    'tts-finish': () => void;
    'tts-cancel': () => void;
    'tts-pause': () => void;
    'tts-resume': () => void;
    'tts-progress': (event: { location: number; length: number }) => void;
    'tts-error': (event: { errorMessage: string }) => void;
  }

  class TtsClass {
    /**
     * Get all available voices
     */
    voices(): Promise<Voice[]>;

    /**
     * Set default language
     */
    setDefaultLanguage(language: string): Promise<void>;

    /**
     * Set default rate (0.0 to 1.0)
     */
    setDefaultRate(rate: number): void;

    /**
     * Set default pitch (0.5 to 2.0)
     */
    setDefaultPitch(pitch: number): void;

    /**
     * Speak text
     */
    speak(text: string, options?: {
      rate?: number;
      pitch?: number;
      language?: string;
      androidParams?: {
        KEY_PARAM_PAN?: number;
        KEY_PARAM_VOLUME?: number;
        KEY_PARAM_STREAM?: string;
      };
    }): Promise<void>;

    /**
     * Stop speaking
     */
    stop(): Promise<void>;

    /**
     * Pause speaking (Android only)
     */
    pause(): Promise<void>;

    /**
     * Resume speaking (Android only)
     */
    resume(): Promise<void>;

    /**
     * Request installation of language data (Android only)
     */
    requestInstallData(): Promise<void>;

    /**
     * Request installation engine (Android only)
     */
    requestInstallEngine(): Promise<void>;

    /**
     * Add event listener
     */
    addEventListener<K extends keyof TtsEvents>(
      event: K,
      handler: TtsEvents[K]
    ): void;

    /**
     * Remove event listener
     */
    removeEventListener<K extends keyof TtsEvents>(
      event: K,
      handler: TtsEvents[K]
    ): void;
  }

  const Tts: TtsClass;
  export default Tts;
}
