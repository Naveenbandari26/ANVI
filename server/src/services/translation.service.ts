import axios from 'axios';

const PHI3_CHAT_URL = 'https://phi-3-production.up.railway.app/chat';

/**
 * Detect if text is in Telugu script
 */
function isTelugu(text: string): boolean {
  // Telugu Unicode range: 0C00-0C7F
  const teluguRegex = /[\u0C00-\u0C7F]/;
  return teluguRegex.test(text);
}

/**
 * Translate Telugu text to English using Phi-3
 */
export async function translateTeluguToEnglish(teluguText: string): Promise<string> {
  try {
    // If text doesn't contain Telugu characters, assume it's already English
    if (!isTelugu(teluguText)) {
      return teluguText;
    }

    const prompt = `Translate the following Telugu text to English. Only provide the English translation, no explanations or additional text.

Telugu text: ${teluguText}

English translation:`;

    const response = await axios.post(
      PHI3_CHAT_URL,
      { prompt },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000, // 8 second timeout for faster response
      }
    );

    // Extract translation from response
    let translation = '';
    if (typeof response.data?.reply === 'string') {
      translation = response.data.reply.trim();
    } else if (typeof response.data === 'string') {
      translation = response.data.trim();
    } else if (typeof response.data?.response === 'string') {
      translation = response.data.response.trim();
    } else if (typeof response.data?.content === 'string') {
      translation = response.data.content.trim();
    }

    // Clean up translation (remove any extra text)
    translation = translation.split('\n')[0].trim();
    
    // If translation failed or is empty, return original
    if (!translation || translation.length < 2) {
      console.warn('Translation failed or empty, returning original text');
      return teluguText;
    }

    return translation;
  } catch (error) {
    console.error('Error translating Telugu to English:', error);
    // Return original text if translation fails
    return teluguText;
  }
}

/**
 * Translate English text to Telugu using Phi-3
 */
export async function translateEnglishToTelugu(englishText: string): Promise<string> {
  try {
    // If text contains Telugu characters, assume it's already Telugu
    if (isTelugu(englishText)) {
      return englishText;
    }

    const prompt = `Translate the following English text to Telugu (Telugu script). Only provide the Telugu translation in Telugu script, no explanations or additional text.

English text: ${englishText}

Telugu translation:`;

    const response = await axios.post(
      PHI3_CHAT_URL,
      { prompt },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000, // 8 second timeout for faster response
      }
    );

    // Extract translation from response
    let translation = '';
    if (typeof response.data?.reply === 'string') {
      translation = response.data.reply.trim();
    } else if (typeof response.data === 'string') {
      translation = response.data.trim();
    } else if (typeof response.data?.response === 'string') {
      translation = response.data.response.trim();
    } else if (typeof response.data?.content === 'string') {
      translation = response.data.content.trim();
    }

    // Clean up translation (remove any extra text)
    translation = translation.split('\n')[0].trim();
    
    // If translation failed or is empty, return original
    if (!translation || translation.length < 2) {
      console.warn('Translation failed or empty, returning original text');
      return englishText;
    }

    return translation;
  } catch (error) {
    console.error('Error translating English to Telugu:', error);
    // Return original text if translation fails
    return englishText;
  }
}
