import { Request, Response, NextFunction } from 'express';
import { CallModel } from '../models/call.schema';
import { createConversation } from '../services/conversation.service';
import { createDiaryFromConversation } from '../services/diary.service';
import { createTasksFromConversation } from '../services/task.service';
import { finalizeConversation } from '../services/conversation.service';

/**
 * Get user's calls
 */
export async function getUserCalls(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { status, limit = 20, skip = 0 } = req.query;

    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const calls = await CallModel.find(query)
      .sort({ scheduledTime: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .populate('conversationId');

    res.json({
      success: true,
      data: calls,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get call by ID
 */
export async function getCallById(req: Request, res: Response, next: NextFunction) {
  try {
    const { callId } = req.params;
    const userId = (req as any).user.id;

    const call = await CallModel.findOne({ _id: callId, userId }).populate('conversationId');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Accept a call
 */
export async function acceptCall(req: Request, res: Response, next: NextFunction) {
  try {
    const { callId } = req.params;
    const userId = (req as any).user.id;

    const call = await CallModel.findOne({ _id: callId, userId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (call.status !== 'ringing') {
      return res.status(400).json({
        success: false,
        message: 'Call is not in ringing state',
      });
    }

    // Update call status
    call.status = 'accepted';
    call.startedAt = new Date();
    await call.save();

    // Create conversation
    const conversation = await createConversation(userId, call._id.toString());

    res.json({
      success: true,
      data: {
        call,
        conversation,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Decline a call
 */
export async function declineCall(req: Request, res: Response, next: NextFunction) {
  try {
    const { callId } = req.params;
    const userId = (req as any).user.id;

    const call = await CallModel.findOne({ _id: callId, userId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    call.status = 'declined';
    call.endedAt = new Date();
    await call.save();

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * End a call
 */
export async function endCall(req: Request, res: Response, next: NextFunction) {
  try {
    const { callId } = req.params;
    const userId = (req as any).user.id;

    const call = await CallModel.findOne({ _id: callId, userId }).populate('conversationId');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (call.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Call is not active',
      });
    }

    // Finalize conversation
    if (call.conversationId) {
      await finalizeConversation(call.conversationId.toString());

      // Create diary entry
      await createDiaryFromConversation(call.conversationId.toString());

      // Create tasks
      await createTasksFromConversation(call.conversationId.toString());
    }

    // Update call
    call.status = 'completed';
    call.endedAt = new Date();
    if (call.startedAt) {
      call.duration = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
    }
    await call.save();

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
}


