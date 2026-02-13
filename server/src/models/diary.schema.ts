import mongoose, { Schema, Document } from 'mongoose';

export interface IDiary extends Document {
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  callId: mongoose.Types.ObjectId;
  entry: string; // First-person reflective diary entry
  summary: string;
  emotionalState: string;
  mood: string;
  keyReflections: string[];
  importantEvents: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DiarySchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    callId: {
      type: Schema.Types.ObjectId,
      ref: 'Call',
      required: true,
    },
    entry: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    emotionalState: {
      type: String,
      required: true,
    },
    mood: {
      type: String,
      required: true,
    },
    keyReflections: {
      type: [String],
      default: [],
    },
    importantEvents: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

DiarySchema.index({ userId: 1, createdAt: -1 });

export const DiaryModel = mongoose.model<IDiary>('Diary', DiarySchema);


