// @ts-ignore
import { DiaryModel, IDiary } from '../models/diary.schema';
// @ts-ignore
import { ConversationModel } from '../models/conversation.schema';
import { generateDiaryEntry } from './phi3.service';

/**
 * Create diary entry from conversation
 */
export async function createDiaryFromConversation(
  conversationId: string
): Promise<IDiary> {
  try {
    const conversation = await ConversationModel.findById(conversationId).populate('callId');
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Generate diary entry using Gemini
    const diaryData = await generateDiaryEntry(
      conversation.transcript,
      conversation.summary
    );

    // Create diary entry
    const diary = await DiaryModel.create({
      userId: conversation.userId,
      conversationId: conversation._id,
      callId: conversation.callId,
      entry: diaryData.entry,
      summary: diaryData.summary,
      emotionalState: diaryData.emotionalState,
      mood: diaryData.mood,
      keyReflections: diaryData.keyReflections,
      importantEvents: diaryData.importantEvents,
    });

    return diary;
  } catch (error) {
    console.error('Error creating diary entry:', error);
    throw error;
  }
}

/**
 * Get diary entry by ID
 */
export async function getDiaryEntry(diaryId: string): Promise<IDiary | null> {
  return DiaryModel.findById(diaryId)
    .populate('conversationId')
    .populate('callId');
}

/**
 * Get user's diary entries
 */
export async function getUserDiaryEntries(
  userId: string,
  limit: number = 20,
  skip: number = 0
): Promise<IDiary[]> {
  return DiaryModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('callId');
}

/**
 * Search diary entries
 */
export async function searchDiaryEntries(
  userId: string,
  query: string,
  limit: number = 20
): Promise<IDiary[]> {
  return DiaryModel.find({
    userId,
    $or: [
      { entry: { $regex: query, $options: 'i' } },
      { summary: { $regex: query, $options: 'i' } },
      { keyReflections: { $regex: query, $options: 'i' } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('callId');
}

/**
 * Update diary entry
 */
export async function updateDiaryEntry(
  diaryId: string,
  updates: Partial<IDiary>
): Promise<IDiary | null> {
  return DiaryModel.findByIdAndUpdate(diaryId, updates, { new: true });
}

/**
 * Delete diary entry
 */
export async function deleteDiaryEntry(diaryId: string): Promise<boolean> {
  const result = await DiaryModel.findByIdAndDelete(diaryId);
  return !!result;
}


