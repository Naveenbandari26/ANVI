import { ConversationModel, IConversation } from '../models/conversation.schema';
import { CallModel } from '../models/call.schema';
import { generateResponse, analyzeConversation, ConversationContext } from './phi3.service';
import { extractTasks } from './phi3.service';
import { generateTeluguSpeech } from './tts.service';
import { translateTeluguToEnglish, translateEnglishToTelugu } from './translation.service';
import { io } from '../config/socket';
import { UserModel } from '../models/user.schema';
import { TaskModel } from '../models/task.schema';

/**
 * Create a new conversation for a call
 */
export async function createConversation(
  userId: string,
  callId: string
): Promise<IConversation> {
  try {
    const conversation = await ConversationModel.create({
      userId,
      callId,
      messages: [],
      transcript: '',
    });

    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Send initial greeting when call starts
 * Optimized to send greeting immediately, TTS generated asynchronously
 */
export async function sendInitialGreeting(
  conversationId: string
): Promise<void> {
  try {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get user info (optimize query - only fetch name field, use lean for faster response)
    const user = await UserModel.findById(conversation.userId).select('name').lean().exec();

    // Use a static warm greeting in Telugu to ensure immediate response
    const greeting = user?.name
      ? `హలో ${user.name}, నేను ANVIని. మీరు ఎలా ఉన్నారు?`
      : 'హలో, నేను ANVIని. మీరు ఎలా ఉన్నారు?';

    // Add greeting as assistant message
    conversation.messages.push({
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
    });

    // Update transcript
    conversation.transcript += `ANVI: ${greeting}\n`;

    // Save conversation
    await conversation.save();

    // Emit greeting to client IMMEDIATELY (don't wait for TTS)
    const callIdStr = conversation.callId.toString();
    console.log(`📤 Sending initial greeting immediately to call:${callIdStr}`);
    
    // Send greeting immediately without waiting for TTS
    io.to(`call:${callIdStr}`).emit('ai_response', {
      conversationId,
      message: greeting,
      audio: undefined, // TTS will be generated in background
    });

    // Generate TTS asynchronously (non-blocking, with timeout wrapper)
    // Use Promise.race to ensure it doesn't hang indefinitely
    Promise.race([
      generateTeluguSpeech(greeting),
      new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 8000) // 8 second max wait
      ),
    ])
      .then((ttsResponse) => {
        if (ttsResponse && ttsResponse.audio) {
          // Send audio update (client will update existing message)
          console.log(`📤 Sending TTS audio update for initial greeting`);
          io.to(`call:${callIdStr}`).emit('ai_response_audio', {
            conversationId,
            message: greeting,
            audio: ttsResponse.audio,
          });
        } else {
          console.log('TTS generation timed out or skipped for greeting');
        }
      })
      .catch((error) => {
        // Silently continue - greeting already sent without audio
        // Don't log as error since this is expected if TTS service is unavailable
        if (error.message !== 'TTS service unavailable') {
          console.log('TTS generation for greeting (non-blocking):', error.message);
        }
      });
  } catch (error) {
    console.error('Error sending initial greeting:', error);
    // Fallback to default greeting - try to get callId from conversation
    try {
      const conversation = await ConversationModel.findById(conversationId).lean();
      if (conversation && conversation.callId) {
        const defaultGreeting = 'హలో, మీరు ఎలా ఉన్నారు?';
        io.to(`call:${conversation.callId.toString()}`).emit('ai_response', {
          conversationId,
          message: defaultGreeting,
        });
      }
    } catch (fallbackError) {
      console.error('Error in fallback greeting:', fallbackError);
    }
  }
}

/**
 * Extract and create tasks from conversation in real-time
 */
export async function extractAndCreateTasks(
  conversationId: string
): Promise<void> {
  try {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation || !conversation.transcript || conversation.transcript.trim().length === 0) {
      return;
    }

    // Extract tasks using Gemini
    const extractedTasks = await extractTasks(conversation.transcript);

    if (extractedTasks.length === 0) {
      return;
    }

    // Check which tasks already exist to avoid duplicates
    const existingTasks = await TaskModel.find({
      conversationId: conversation._id,
    }).select('title');

    const existingTitles = new Set(existingTasks.map((t) => t.title.toLowerCase()));

    // Create new tasks
    const newTasks = extractedTasks.filter(
      (task) => !existingTitles.has(task.title.toLowerCase())
    );

    if (newTasks.length > 0) {
      await Promise.all(
        newTasks.map(async (taskData) => {
          await TaskModel.create({
            userId: conversation.userId,
            conversationId: conversation._id,
            callId: conversation.callId,
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority || 'medium',
            status: 'pending',
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
            scheduledTime: taskData.scheduledTime ? new Date(taskData.scheduledTime) : undefined,
          });
        })
      );

      console.log(`✅ Created ${newTasks.length} new task(s) from conversation ${conversationId}`);
    }
  } catch (error) {
    console.error('Error extracting tasks in real-time:', error);
    // Don't throw - this is a background process
  }
}

/**
 * Add a message to the conversation and get AI response
 */
export async function addMessageAndRespond(
  conversationId: string,
  userMessage: string
): Promise<{ assistantMessage: string; updatedConversation: IConversation }> {
  try {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Update transcript
    conversation.transcript += `User: ${userMessage}\n`;

    // Translate Telugu input to English for Phi-3 API
    console.log(`🌐 Translating user input from Telugu to English...`);
    const englishUserMessage = await translateTeluguToEnglish(userMessage);
    console.log(`✅ Translated: "${userMessage.substring(0, 50)}..." → "${englishUserMessage.substring(0, 50)}..."`);

    // Get user info for context (optimized queries)
    const [user, previousConversations] = await Promise.all([
      UserModel.findById(conversation.userId).select('name').lean().exec(),
      ConversationModel.find({
        userId: conversation.userId,
        _id: { $ne: conversationId },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
    ]);

    // Build context: Translate recent messages to English for Phi-3
    // Optimize: Only translate last 3 messages in parallel for faster response
    const recentMessages = conversation.messages.slice(-3);
    const contextMessagesPromises = recentMessages.map(async (msg) => {
      // Translate to English (parallel execution)
      const translated = await translateTeluguToEnglish(msg.content);
      return { role: msg.role, content: translated };
    });

    // Execute translations in parallel
    const contextMessages = await Promise.all(contextMessagesPromises);

    // Add current translated user message
    contextMessages.push({
      role: 'user',
      content: englishUserMessage,
    });

    const context: ConversationContext = {
      messages: contextMessages,
      userInfo: {
        name: user?.name,
        previousTopics: previousConversations.flatMap((conv) => conv.keyTopics || []),
      },
    };

    // Generate AI response in English
    console.log(`🤖 Generating AI response for: "${englishUserMessage}"`);
    const englishAssistantMessage = await generateResponse(englishUserMessage, context);

    // Translate English response back to Telugu
    console.log(`🌐 Translating AI response from English to Telugu...`);
    const teluguAssistantMessage = await translateEnglishToTelugu(englishAssistantMessage);
    console.log(`✅ Translated: "${englishAssistantMessage}" → "${teluguAssistantMessage}"`);

    // Add assistant message (store Telugu version)
    conversation.messages.push({
      role: 'assistant',
      content: teluguAssistantMessage,
      timestamp: new Date(),
    });

    // Update transcript
    conversation.transcript += `ANVI: ${teluguAssistantMessage}\n`;

    // Save conversation
    await conversation.save();

    // Task extraction runs only at call end (createTasksFromConversation) to avoid
    // parallel Gemini calls and rate limits. No per-message extraction here.

    // Emit response to client IMMEDIATELY (don't wait for TTS)
    const callIdStr = conversation.callId.toString();
    console.log(`📤 Emitting AI response to call:${callIdStr}, conversationId: ${conversationId}`);
    io.to(`call:${callIdStr}`).emit('ai_response', {
      conversationId,
      message: teluguAssistantMessage,
      audio: undefined, // Will be sent when ready
    });

    // Generate TTS audio asynchronously (non-blocking for fast response)
    // Use Promise.race to ensure it doesn't hang indefinitely
    Promise.race([
      generateTeluguSpeech(teluguAssistantMessage),
      new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 8000) // 8 second max wait
      ),
    ])
      .then((ttsResponse) => {
        if (ttsResponse && ttsResponse.audio) {
          console.log(`📤 Sending TTS audio update for message`);
          io.to(`call:${callIdStr}`).emit('ai_response_audio', {
            conversationId,
            message: teluguAssistantMessage,
            audio: ttsResponse.audio,
          });
        } else {
          console.log('TTS generation timed out or skipped for message');
        }
      })
      .catch((ttsError) => {
        // Don't log as error if service is unavailable (expected)
        if (ttsError.message !== 'TTS service unavailable') {
          console.log('TTS generation failed (non-blocking):', ttsError.message);
        }
        // Continue without audio - message already sent
      });

    return {
      assistantMessage,
      updatedConversation: conversation,
    };
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

/**
 * Process real-time transcript chunk
 */
export async function processTranscriptChunk(
  conversationId: string,
  transcriptChunk: string
): Promise<void> {
  try {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      return;
    }

    // Append to transcript
    conversation.transcript += transcriptChunk;

    // Auto-save periodically (every 5 seconds worth of transcript)
    await conversation.save();
  } catch (error) {
    console.error('Error processing transcript chunk:', error);
  }
}

/**
 * Finalize conversation and generate analysis
 */
export async function finalizeConversation(conversationId: string): Promise<IConversation> {
  try {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Analyze conversation
    const analysis = await analyzeConversation(conversation.transcript);

    conversation.summary = analysis.summary;
    conversation.emotionalState = analysis.emotionalState;
    conversation.keyTopics = analysis.keyTopics;

    await conversation.save();

    // Update call status
    const call = await CallModel.findById(conversation.callId);
    if (call) {
      call.status = 'completed';
      call.endedAt = new Date();
      if (call.startedAt) {
        call.duration = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
      }
      await call.save();
    }

    return conversation;
  } catch (error) {
    console.error('Error finalizing conversation:', error);
    throw error;
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(conversationId: string): Promise<IConversation | null> {
  return ConversationModel.findById(conversationId).populate('callId');
}

/**
 * Get user's conversations
 */
export async function getUserConversations(
  userId: string,
  limit: number = 20,
  skip: number = 0
): Promise<IConversation[]> {
  return ConversationModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('callId');
}


