import { Request, Response, NextFunction } from 'express';
import {
  getConversation,
  getUserConversations,
  addMessageAndRespond,
  processTranscriptChunk,
} from '../services/conversation.service';
import { AuthRequest } from '../middleware/authenticate';

/**
 * Get conversation by ID
 */
export async function getConversationById(req: Request, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const userId = (req as AuthRequest).userId;

    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    if (conversation.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    return res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get user's conversations
 */
export async function getUserConversationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    const { limit = 20, skip = 0 } = req.query;

    const conversations = await getUserConversations(
      userId!,
      Number(limit),
      Number(skip)
    );

    return res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Send message and get AI response
 */
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = (req as AuthRequest).userId;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    const conversation = await getConversation(conversationId);
    if (!conversation || conversation.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const result = await addMessageAndRespond(conversationId, message);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Process transcript chunk (for real-time transcription)
 */
export async function processTranscript(req: Request, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.params;
    const { transcript } = req.body;
    const userId = (req as AuthRequest).userId;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Transcript is required',
      });
    }

    const conversation = await getConversation(conversationId);
    if (!conversation || conversation.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    await processTranscriptChunk(conversationId, transcript);

    return res.json({
      success: true,
      message: 'Transcript processed',
    });
  } catch (error) {
    return next(error);
  }
}
