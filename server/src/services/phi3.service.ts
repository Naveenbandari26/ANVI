import axios from 'axios';

const PHI3_CHAT_URL = 'https://phi-3-production.up.railway.app/chat';

// Instructions for the model to act as a friend (English only)
const FRIEND_INSTRUCTIONS = `You are a warm, emotionally intelligent companion and friend. You never describe yourself as an AI or assistant. You speak naturally, casually, and empathetically like a trusted friend. You listen deeply, acknowledge emotions, reflect feelings back, ask thoughtful follow-up questions, and keep a supportive, non-judgmental tone. Your goal is to make the user feel heard and understood.

Keep your responses conversational, brief (2-3 sentences typically), and emotionally aware. Match the user's energy level.

IMPORTANT: Respond in English only.`;

export interface ConversationContext {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  userInfo?: {
    name?: string;
    previousTopics?: string[];
    emotionalState?: string;
  };
}

/**
 * Call Phi-3 chat API. API accepts only prompt="" as parameter.
 * Response may be { response: "..." } or { content: "..." } or similar.
 */
async function sendPrompt(prompt: string): Promise<string> {
  const payload = { prompt };

  try {
    const { data } = await axios.post(PHI3_CHAT_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    // Log the full response for debugging (only in dev)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Phi-3 API Response:', JSON.stringify(data, null, 2));
    }

    // Try various response formats - check 'reply' first since that's what the API returns
    if (typeof data?.reply === 'string') {
      return data.reply.trim();
    }
    if (typeof data === 'string') {
      return data.trim();
    }
    if (typeof data?.response === 'string') {
      return data.response.trim();
    }
    if (typeof data?.content === 'string') {
      return data.content.trim();
    }
    if (typeof data?.text === 'string') {
      return data.text.trim();
    }
    if (typeof data?.output === 'string') {
      return data.output.trim();
    }
    if (data?.choices?.[0]?.message?.content) {
      return String(data.choices[0].message.content).trim();
    }
    if (data?.choices?.[0]?.text) {
      return String(data.choices[0].text).trim();
    }
    if (data?.message?.content) {
      return String(data.message.content).trim();
    }
    if (typeof data?.message === 'string') {
      return data.message.trim();
    }
    if (data?.data && typeof data.data === 'string') {
      return data.data.trim();
    }

    // If we still can't find it, log and throw
    console.error('Phi-3 API Response structure not recognized:', {
      type: typeof data,
      keys: data ? Object.keys(data) : 'null',
      fullData: data,
    });
    throw new Error(`Phi-3 API returned no text content. Response: ${JSON.stringify(data)}`);
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown; status?: number } };
    if (err.response?.data) {
      console.error('Phi-3 API Error Response:', JSON.stringify(err.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Generate a conversational response as a friend, in English.
 * Builds a single prompt with instructions + context + user message for the API.
 */
export async function generateResponse(
  userMessage: string,
  context: ConversationContext
): Promise<string> {
  try {
    let contextLine = '';
    if (context.userInfo) {
      if (context.userInfo.name) {
        contextLine += `The user's name is ${context.userInfo.name}. `;
      }
      if (context.userInfo.emotionalState) {
        contextLine += `Recent emotional state: ${context.userInfo.emotionalState}. `;
      }
      if (context.userInfo.previousTopics?.length) {
        contextLine += `Recent topics: ${context.userInfo.previousTopics.join(', ')}. `;
      }
    }

    const history = context.messages
      .slice(-10)
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Friend'}: ${msg.content}`)
      .join('\n');

    const prompt = `${FRIEND_INSTRUCTIONS}
${contextLine ? `\nContext: ${contextLine}\n` : ''}
${history ? `Previous conversation:\n${history}\n\n` : ''}
User: ${userMessage}

Respond as the friend in English only, in 2-3 sentences:`;

    const text = await sendPrompt(prompt);
    if (!text) {
      throw new Error('Empty response from Phi-3');
    }
    return text;
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number; data?: unknown } };
    console.error('Phi-3 API Error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    if (err.message?.includes('429') || err.message?.includes('quota') || err.response?.status === 429) {
      return "Sorry, the server is a bit busy. Try again in a minute.";
    }
    throw new Error(`Phi-3 Error: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Extract tasks and actionable items from conversation (uses Phi-3)
 */
export async function extractTasks(transcript: string): Promise<Array<{
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  scheduledTime?: string;
}>> {
  try {
    const prompt = `Analyze the following conversation transcript and extract all actionable tasks, commitments, reminders, and follow-ups mentioned by the user.

For each task, identify:
- A clear, concise title
- Optional description
- Priority level (low, medium, high) based on urgency and importance
- Due date or deadline if mentioned
- Scheduled time if specific time was mentioned

Conversation transcript:
${transcript}

Respond with a JSON array of tasks in this format only, no other text:
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

    const fullPrompt = `You are a task extraction assistant. Reply only with a valid JSON array, no other text.\n\n${prompt}`;
    const response = await sendPrompt(fullPrompt);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const tasks = JSON.parse(jsonMatch[0]);
      return Array.isArray(tasks) ? tasks : [];
    }
    return [];
  } catch (error) {
    console.error('Error extracting tasks (Phi-3):', error);
    return [];
  }
}

/**
 * Analyze conversation for emotional state and key topics (uses Phi-3)
 */
export async function analyzeConversation(transcript: string): Promise<{
  summary: string;
  emotionalState: string;
  keyTopics: string[];
}> {
  try {
    const prompt = `Analyze the following conversation and provide:
1. A concise summary (2-3 sentences)
2. The overall emotional state of the user
3. Key topics discussed (3-5 topics)

Conversation transcript:
${transcript}

Respond in JSON format only:
{
  "summary": "Brief summary",
  "emotionalState": "Description of emotional state",
  "keyTopics": ["topic1", "topic2", "topic3"]
}`;

    const fullPrompt = `You are an analyst. Reply only with a valid JSON object, no other text.\n\n${prompt}`;
    const response = await sendPrompt(fullPrompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '',
        emotionalState: parsed.emotionalState || '',
        keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      };
    }
  } catch (error) {
    console.error('Error analyzing conversation (Phi-3):', error);
  }
  return {
    summary: 'A meaningful conversation with ANVI.',
    emotionalState: 'Reflective',
    keyTopics: [],
  };
}

/**
 * Generate a diary entry from conversation transcript (uses Phi-3)
 */
export async function generateDiaryEntry(
  transcript: string,
  conversationSummary?: string
): Promise<{
  entry: string;
  summary: string;
  emotionalState: string;
  mood: string;
  keyReflections: string[];
  importantEvents: string[];
}> {
  try {
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

Respond in the following JSON format only:
{
  "entry": "The full diary entry text in first person",
  "summary": "A concise 2-3 sentence summary",
  "emotionalState": "Description of emotional state",
  "mood": "Single word or short phrase (e.g., contemplative, energized, calm, anxious)",
  "keyReflections": ["reflection 1", "reflection 2", "reflection 3"],
  "importantEvents": ["event 1", "event 2"]
}`;

    const fullPrompt = `You are a diary writer. Reply only with a valid JSON object, no other text.\n\n${prompt}`;
    const response = await sendPrompt(fullPrompt);

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
  } catch (error) {
    console.error('Error generating diary entry (Phi-3):', error);
    throw new Error('Failed to generate diary entry');
  }

  return {
    entry: '',
    summary: 'A reflective conversation about personal thoughts and feelings.',
    emotionalState: 'Reflective',
    mood: 'contemplative',
    keyReflections: [],
    importantEvents: [],
  };
}
