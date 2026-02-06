import { ConversationModel, IConversation } from '../models/conversation.schema';
import { CallModel } from '../models/call.schema';
import { generateResponse, analyzeConversation, ConversationContext } from './gemini.service';
import { extractTasks } from './gemini.service';
import { generateTeluguSpeech } from './tts.service';
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
 */
export async function sendInitialGreeting(
  conversationId: string
): Promise<void> {
  try {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get user info
    const user = await UserModel.findById(conversation.userId).select('name');

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

    // Emit greeting to client
    const callIdStr = conversation.callId.toString();

    // Generate audio for the greeting
    let audioData = null;
    try {
      const ttsResponse = await generateTeluguSpeech(greeting);
      audioData = ttsResponse.audio;
    } catch (ttsError) {
      console.error('TTS generation failed for greeting:', ttsError);
    }

    io.to(`call:${callIdStr}`).emit('ai_response', {
      conversationId,
      message: greeting,
      audio: audioData, // Send base64 audio if available
    });
  } catch (error) {
    console.error('Error sending initial greeting:', error);
    // Fallback to default greeting - try to get callId from conversation
    try {
      const conversation = await ConversationModel.findById(conversationId);
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

    // Get user info for context
    const user = await UserModel.findById(conversation.userId).select('name');
    const previousConversations = await ConversationModel.find({
      userId: conversation.userId,
      _id: { $ne: conversationId },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const context: ConversationContext = {
      messages: conversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      userInfo: {
        name: user?.name,
        previousTopics: previousConversations.flatMap((conv) => conv.keyTopics || []),
      },
    };

    // Generate AI response
    const assistantMessage = await generateResponse(userMessage, context);

    // Add assistant message
    conversation.messages.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date(),
    });

    // Update transcript
    conversation.transcript += `ANVI: ${assistantMessage}\n`;

    // Save conversation
    await conversation.save();

    // Extract tasks in real-time (non-blocking)
    extractAndCreateTasks(conversationId).catch((error) => {
      console.error('Error in background task extraction:', error);
    });

    // Generate audio for the AI response
    let audioData = null;
    try {
      const ttsResponse = await generateTeluguSpeech(assistantMessage);
      audioData = ttsResponse.audio;
    } catch (ttsError) {
      console.error('TTS generation failed for message:', ttsError);
    }

    // Emit response to client
    io.to(`call:${conversation.callId}`).emit('ai_response', {
      conversationId,
      message: assistantMessage,
      audio: audioData,
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


