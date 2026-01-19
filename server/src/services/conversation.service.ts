import { ConversationModel, IConversation } from '../models/conversation.schema';
import { CallModel } from '../models/call.schema';
import { generateResponse, analyzeConversation, ConversationContext } from './gemini.service';
import { io } from '../config/socket';
import { UserModel } from '../models/user.schema';

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

    // Emit response to client
    io.to(`call:${conversation.callId}`).emit('ai_response', {
      conversationId,
      message: assistantMessage,
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


