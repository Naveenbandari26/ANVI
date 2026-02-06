import { Response, NextFunction } from 'express';
import { CallModel } from '../models/call.schema';
import { createConversation, sendInitialGreeting } from '../services/conversation.service';
import { createDiaryFromConversation } from '../services/diary.service';
import { createTasksFromConversation } from '../services/task.service';
import { finalizeConversation } from '../services/conversation.service';
import { createScheduledCall } from '../services/schedule.service';
import { AuthRequest } from '../middleware/authenticate';

/**
 * Get user's calls
 */
export async function getUserCalls(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
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

    return res.json({
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
export async function getCallById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { callId } = req.params;
    const userId = req.userId;

    const call = await CallModel.findOne({ _id: callId, userId }).populate('conversationId');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    return res.json({
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
export async function acceptCall(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { callId } = req.params;
    const userId = req.userId;

    const call = await CallModel.findOne({ _id: callId, userId });

    if (!call) {
      console.log(`❌ Accept call failed: Call ${callId} not found for user ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    console.log(`📞 Attempting to accept call ${callId}. Current status: ${call.status}`);

    if (call.status !== 'ringing') {
      console.log(`⚠️  Accept call failed: Status is ${call.status}, expected 'ringing'`);
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
    const conversation = await createConversation(userId!, call._id.toString());

    // Update call with conversation ID
    call.conversationId = conversation._id as any;
    await call.save();

    // Send initial greeting in Telugu (non-blocking) - Now using a static greeting
    sendInitialGreeting(conversation._id.toString()).catch((error) => {
      console.error('Error sending initial greeting:', error);
    });

    return res.json({
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
export async function declineCall(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { callId } = req.params;
    const userId = req.userId;

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
 * Create a scheduled call
 */
export async function createScheduledCallHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }
    const userId = req.userId;
    const { scheduledTime } = req.body;

    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'scheduledTime is required',
      });
    }

    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduledTime format',
      });
    }

    // Check if scheduled time is in the future
    if (scheduledDate.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future',
      });
    }

    const call = await createScheduledCall(userId, scheduledDate);

    return res.status(201).json({
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
export async function endCall(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { callId } = req.params;
    const userId = req.userId;

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


