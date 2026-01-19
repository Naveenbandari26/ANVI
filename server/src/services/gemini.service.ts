import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ANVI System Prompt
const ANVI_SYSTEM_PROMPT = `You are ANVI, a warm, emotionally intelligent companion and friend. You never describe yourself as an AI, assistant, or system. You speak naturally, casually, and empathetically like a trusted friend. You listen deeply, acknowledge emotions, reflect feelings back to the user, ask thoughtful follow-up questions, and maintain a supportive, non-judgmental tone. Your goal is to make the user feel heard, understood, and comfortable while gently helping them gain clarity and direction.

Keep your responses conversational, brief (2-3 sentences typically), and emotionally aware. Match the user's energy level and emotional state.`;

export interface ConversationContext {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  userInfo?: {
    name?: string;
    previousTopics?: string[];
    emotionalState?: string;
  };
}

/**
 * Generate a conversational response from ANVI
 */
export async function generateResponse(
  userMessage: string,
  context: ConversationContext
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Build conversation history
    const conversationHistory = context.messages
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => `${msg.role === 'user' ? 'User' : 'ANVI'}: ${msg.content}`)
      .join('\n');

    // Build context prompt
    let contextPrompt = '';
    if (context.userInfo) {
      if (context.userInfo.name) {
        contextPrompt += `The user's name is ${context.userInfo.name}. `;
      }
      if (context.userInfo.emotionalState) {
        contextPrompt += `Recent emotional state: ${context.userInfo.emotionalState}. `;
      }
      if (context.userInfo.previousTopics && context.userInfo.previousTopics.length > 0) {
        contextPrompt += `Recent topics discussed: ${context.userInfo.previousTopics.join(', ')}. `;
      }
    }

    const prompt = `${ANVI_SYSTEM_PROMPT}

${contextPrompt}

Previous conversation:
${conversationHistory}

User: ${userMessage}
ANVI:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating Gemini response:', error);
    throw new Error('Failed to generate AI response');
  }
}

/**
 * Generate a diary entry from conversation transcript
 */
export async function generateDiaryEntry(transcript: string, conversationSummary?: string): Promise<{
  entry: string;
  summary: string;
  emotionalState: string;
  mood: string;
  keyReflections: string[];
  importantEvents: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Based on the following conversation transcript, create a first-person reflective diary entry as if written by the user. The entry should be warm, introspective, and capture the emotional journey of the conversation.

Requirements:
1. Write in first person (I, me, my)
2. Be reflective and emotionally aware
3. Include a concise summary (2-3 sentences)
4. Identify the emotional state and mood
5. Extract 3-5 key reflections or realizations
6. List any important events or commitments mentioned

Conversation transcript:
${transcript}

${conversationSummary ? `Conversation summary: ${conversationSummary}` : ''}

Please respond in the following JSON format:
{
  "entry": "The full diary entry text in first person",
  "summary": "A concise 2-3 sentence summary",
  "emotionalState": "Description of emotional state",
  "mood": "Single word or short phrase describing mood (e.g., 'contemplative', 'energized', 'calm', 'anxious')",
  "keyReflections": ["reflection 1", "reflection 2", "reflection 3"],
  "importantEvents": ["event 1", "event 2"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Parse JSON response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          entry: parsed.entry || '',
          summary: parsed.summary || '',
          emotionalState: parsed.emotionalState || '',
          mood: parsed.mood || 'neutral',
          keyReflections: Array.isArray(parsed.keyReflections) ? parsed.keyReflections : [],
          importantEvents: Array.isArray(parsed.importantEvents) ? parsed.importantEvents : [],
        };
      }
    } catch (parseError) {
      console.error('Error parsing diary JSON:', parseError);
    }

    // Fallback if JSON parsing fails
    return {
      entry: response,
      summary: 'A reflective conversation about personal thoughts and feelings.',
      emotionalState: 'Reflective',
      mood: 'contemplative',
      keyReflections: [],
      importantEvents: [],
    };
  } catch (error) {
    console.error('Error generating diary entry:', error);
    throw new Error('Failed to generate diary entry');
  }
}

/**
 * Extract tasks and actionable items from conversation
 */
export async function extractTasks(transcript: string): Promise<Array<{
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  scheduledTime?: string;
}>> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Analyze the following conversation transcript and extract all actionable tasks, commitments, reminders, and follow-ups mentioned by the user.

For each task, identify:
- A clear, concise title
- Optional description
- Priority level (low, medium, high) based on urgency and importance
- Due date or deadline if mentioned
- Scheduled time if specific time was mentioned

Conversation transcript:
${transcript}

Respond with a JSON array of tasks in this format:
[
  {
    "title": "Task title",
    "description": "Optional description",
    "priority": "low|medium|high",
    "dueDate": "YYYY-MM-DD or null",
    "scheduledTime": "YYYY-MM-DDTHH:mm:ss or null"
  }
]

If no tasks are found, return an empty array [].`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tasks = JSON.parse(jsonMatch[0]);
        return Array.isArray(tasks) ? tasks : [];
      }
    } catch (parseError) {
      console.error('Error parsing tasks JSON:', parseError);
    }

    return [];
  } catch (error) {
    console.error('Error extracting tasks:', error);
    return [];
  }
}

/**
 * Analyze conversation for emotional state and key topics
 */
export async function analyzeConversation(transcript: string): Promise<{
  summary: string;
  emotionalState: string;
  keyTopics: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Analyze the following conversation and provide:
1. A concise summary (2-3 sentences)
2. The overall emotional state of the user
3. Key topics discussed (3-5 topics)

Conversation transcript:
${transcript}

Respond in JSON format:
{
  "summary": "Brief summary",
  "emotionalState": "Description of emotional state",
  "keyTopics": ["topic1", "topic2", "topic3"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || '',
          emotionalState: parsed.emotionalState || '',
          keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
        };
      }
    } catch (parseError) {
      console.error('Error parsing analysis JSON:', parseError);
    }

    return {
      summary: 'A meaningful conversation with ANVI.',
      emotionalState: 'Reflective',
      keyTopics: [],
    };
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return {
      summary: 'A meaningful conversation with ANVI.',
      emotionalState: 'Reflective',
      keyTopics: [],
    };
  }
}


